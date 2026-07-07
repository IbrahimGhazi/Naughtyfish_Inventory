import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { requirePage } from "@/lib/roles";
import { entityScope } from "@/lib/scope";
import { pkr, kg, dateShort } from "@/lib/format";
import { getAppConfig } from "@/lib/config";
import { printCss, IconLine, MetaLine, SumRow, Th, Td } from "@/components/PrintKit";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

/**
 * Printable A4 purchase document — the same branded layout as the sales invoice
 * print page, but with purchase-appropriate headings: the supplier bills US, so
 * the two parties are "Supplier" (bill from) and "Bill To" (this book), and the
 * lines bill on gross weight × rate (no glazing/net split).
 */
export default async function PurchasePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getActiveContext();
  requirePage(ctx, "purchases");
  const cfg = await getAppConfig();
  if (!cfg.features.purchases) redirect("/");

  const purchase = await prisma.purchase.findFirst({
    where: { id, ...entityScope(ctx) },
    include: {
      supplier: true,
      entity: true,
      store: { select: { name: true } },
      lineItems: { include: { item: { select: { name: true } } } },
      payments: { select: { amount: true } },
    },
  });
  if (!purchase) notFound();

  const total = Number(purchase.totalAmount);
  const paid = purchase.payments.reduce((s, p) => s + Number(p.amount), 0);
  const balance = total - paid;

  // Palette sampled from the SeaStar brand mark (whale-tail teal + deep navy).
  const teal = "#2fa39c"; // table head, grand-total band
  const tealDeep = "#1f7d78"; // emphasis / icon accents
  const navy = "#16242f"; // headings, brand text
  const rule = "#e3e8ea"; // hairline row dividers
  const muted = "#6b7a80";
  const logo = cfg.branding.logoDataUrl;
  const brandName = cfg.branding.appName;
  const tagline = cfg.branding.tagline;
  const buyerName = purchase.entity?.name || brandName;
  const supplier = purchase.supplier;

  return (
    <div className="text-slate-900">
      <style dangerouslySetInnerHTML={{ __html: printCss("inv-sheet") }} />

      {/* Screen-only toolbar */}
      <div className="no-print mx-auto mb-2 flex max-w-[210mm] items-center justify-between px-1 pt-2">
        <Link
          href={`/purchases/${purchase.id}`}
          className="text-[12.5px] font-semibold text-slate-500 hover:text-slate-900"
        >
          ← Back to purchase
        </Link>
        <PrintButton />
      </div>

      {/* A4 sheet */}
      <div
        className="inv-sheet"
        style={{
          width: "210mm",
          minHeight: "297mm",
          background: "#ffffff",
          color: navy,
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          fontSize: "10pt",
        }}
      >
        {/* ---------------------------- Header ---------------------------- */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "10mm",
            padding: "0 14mm 0 0",
          }}
        >
          {/* Logo on the plain white sheet — no colored panel behind it. */}
          <div
            style={{
              padding: "10mm 0 0 14mm",
              display: "flex",
              alignItems: "center",
              minWidth: "56mm",
            }}
          >
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={brandName} style={{ height: "150px", width: "auto", objectFit: "contain", display: "block" }} />
            ) : (
              <div>
                <div style={{ fontSize: "18pt", fontWeight: 800, color: navy }}>{brandName}</div>
                <div style={{ fontSize: "8pt", textTransform: "uppercase", letterSpacing: "1.5px", color: tealDeep }}>{tagline}</div>
              </div>
            )}
          </div>

          {/* PURCHASE title + number */}
          <div style={{ textAlign: "right", paddingTop: "12mm" }}>
            <div style={{ fontSize: "40pt", fontWeight: 800, letterSpacing: "1px", lineHeight: 0.9, color: navy }}>
              PURCHASE
            </div>
            <div style={{ marginTop: "6px", fontSize: "11pt", color: muted }}>
              No. {purchase.reference}
            </div>
          </div>
        </div>

        {/* --------------------- Supplier / Bill To --------------------- */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12mm",
            padding: "9mm 14mm 0",
          }}
        >
          {/* Supplier (bill from) */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "8.5pt", textTransform: "uppercase", letterSpacing: "1.5px", color: tealDeep, fontWeight: 700 }}>
              Supplier
            </div>
            <div style={{ marginTop: "4px", fontSize: "14pt", fontWeight: 700, color: navy }}>
              {supplier.name}
            </div>
            {supplier.contactPerson && (
              <div style={{ fontSize: "9pt", color: muted }}>Attn: {supplier.contactPerson}</div>
            )}
            <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "3px", fontSize: "9.5pt", color: muted }}>
              {supplier.phone && <IconLine icon="phone" accent={teal}>{supplier.phone}</IconLine>}
              {supplier.email && <IconLine icon="mail" accent={teal}>{supplier.email}</IconLine>}
              {supplier.address && <IconLine icon="pin" accent={teal}>{supplier.address}</IconLine>}
              <IconLine icon="id" accent={teal}>{supplier.ntn ? `NTN ${supplier.ntn}` : "No NTN on file"}</IconLine>
            </div>
          </div>

          {/* Bill to (this book) */}
          <div style={{ flex: 1, textAlign: "right" }}>
            <div style={{ fontSize: "8.5pt", textTransform: "uppercase", letterSpacing: "1.5px", color: tealDeep, fontWeight: 700 }}>
              Bill To
            </div>
            <div style={{ marginTop: "4px", fontSize: "14pt", fontWeight: 700, color: navy }}>
              {buyerName}
            </div>
            {tagline && <div style={{ fontSize: "9pt", color: muted }}>{tagline}</div>}
            <div style={{ marginTop: "7px", display: "flex", flexDirection: "column", gap: "2px", fontSize: "9.5pt" }}>
              <MetaLine label="Date" value={dateShort(purchase.date)} muted={muted} navy={navy} />
              <MetaLine label="Reference" value={purchase.reference} muted={muted} navy={navy} />
              {purchase.supplierBillNo && (
                <MetaLine label="Bill No" value={purchase.supplierBillNo} muted={muted} navy={navy} />
              )}
              <MetaLine label="Store" value={purchase.store.name} muted={muted} navy={tealDeep} />
            </div>
          </div>
        </div>

        {/* ---------------------------- Items ---------------------------- */}
        <div style={{ padding: "8mm 14mm 0" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9.5pt" }}>
            <thead>
              <tr style={{ background: teal, color: "#fff" }}>
                <Th w="6%">SL</Th>
                <Th align="left">Item</Th>
                <Th align="right">Cartons</Th>
                <Th align="right">Weight</Th>
                <Th align="right">Rate / kg</Th>
                <Th align="right">Amount</Th>
              </tr>
            </thead>
            <tbody>
              {purchase.lineItems.map((l, i) => (
                <tr key={l.id} style={{ borderBottom: `1px solid ${rule}` }}>
                  <Td muted={muted}>{String(i + 1).padStart(2, "0")}</Td>
                  <Td align="left">
                    <div style={{ fontWeight: 700, color: navy }}>{l.item.name}</div>
                    {l.packets ? (
                      <div style={{ fontSize: "8pt", color: muted, marginTop: "1px" }}>{l.packets} pkt</div>
                    ) : null}
                  </Td>
                  <Td align="right">{l.cartons ?? "—"}</Td>
                  <Td align="right">{kg(Number(l.weightKg))}</Td>
                  <Td align="right">{pkr(Number(l.ratePerKg))}</Td>
                  <Td align="right" bold>{pkr(Number(l.amount))}</Td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Sub-total / paid (right-aligned, above the grand-total band) */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "5mm" }}>
            <div style={{ width: "72mm", fontSize: "10pt" }}>
              <SumRow label="Sub total" value={pkr(total)} muted={muted} navy={navy} />
              {paid > 0 && <SumRow label="Amount paid" value={pkr(paid)} muted={muted} navy={navy} />}
            </div>
          </div>
        </div>

        {/* --------------------- Grand-total band (full width) --------------------- */}
        <div
          style={{
            marginTop: "5mm",
            background: teal,
            color: "#fff",
            padding: "6mm 14mm",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: "9pt", letterSpacing: "0.5px", textTransform: "uppercase", opacity: 0.92 }}>
            No. {purchase.reference} · {dateShort(purchase.date)}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "10mm" }}>
            <span style={{ fontSize: "11pt", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase" }}>
              {paid > 0 ? "Balance due" : "Grand total"}
            </span>
            <span style={{ fontSize: "15pt", fontWeight: 800, fontFamily: "monospace" }}>
              {pkr(paid > 0 ? balance : total)}
            </span>
          </div>
        </div>

        {/* --------------------- Notes + signature --------------------- */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12mm",
            padding: "8mm 14mm 0",
            marginTop: "auto",
          }}
        >
          <div style={{ flex: 1, maxWidth: "100mm" }}>
            <div style={{ fontSize: "8.5pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: tealDeep }}>
              Notes
            </div>
            <p style={{ marginTop: "4px", fontSize: "8.5pt", color: muted, lineHeight: 1.5 }}>
              Goods received into {purchase.store.name}.
            </p>
            {purchase.notes && (
              <p style={{ marginTop: "6px", fontSize: "8.5pt", color: "#475569", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                {purchase.notes}
              </p>
            )}
          </div>

          <div style={{ textAlign: "center", minWidth: "58mm" }}>
            <div style={{ height: "16mm" }} />
            <div style={{ borderTop: `1px solid ${muted}`, paddingTop: "4px", fontSize: "9pt", fontWeight: 700, color: navy }}>
              {buyerName}
            </div>
            <div style={{ fontSize: "8pt", color: muted }}>Received by</div>
          </div>
        </div>

        {/* ------------------------------ Footer ------------------------------ */}
        <div style={{ padding: "0 14mm" }}>
          <div style={{ marginTop: "8mm", borderTop: `2px solid ${teal}`, paddingTop: "3mm", paddingBottom: "6mm", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "8.5pt", color: muted }}>
            <span style={{ fontWeight: 700, color: navy }}>{brandName}</span>
            <span>{tagline}</span>
            <span>Goods-received record.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
