import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { canView } from "@/lib/roles";
import { entityScope } from "@/lib/scope";
import { pkr, kg, pct, dateShort } from "@/lib/format";
import { getAppConfig, getCopy } from "@/lib/config";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getActiveContext();
  const [t, cfg] = await Promise.all([getCopy(), getAppConfig()]);

  const CHANNEL_NOTE: Record<string, string> = {
    north: t("invoices.print.noteNorth"),
    local: t("invoices.print.noteLocal"),
  };

  const invoice = await prisma.invoice.findFirst({
    where: { id, ...entityScope(ctx) },
    include: {
      party: true,
      entity: true,
      lineItems: { include: { item: true } },
      payments: { select: { amount: true } },
    },
  });
  if (!invoice) notFound();

  // Delivery may print ONLY invoices it created; other roles need the grant.
  if (ctx.user.role === "delivery") {
    if (invoice.createdById !== ctx.user.id) redirect("/delivery");
  } else if (!canView(ctx, "invoices")) {
    redirect("/");
  }

  const total = Number(invoice.totalAmount);
  const paid = invoice.payments.reduce((s, p) => s + Number(p.amount), 0);
  const balance = total - paid;

  // Brand palette from the deployment's theme (stays white-label).
  const accent = cfg.theme.accent;
  const accentDeep = cfg.theme.accentDeep || accent;
  const dark = cfg.theme.sideBg;
  const logo = cfg.branding.logoDataUrl;
  const brandName = cfg.branding.appName;
  const tagline = cfg.branding.tagline;

  const meta = [invoice.party.partyType, invoice.party.subType, invoice.party.channel]
    .filter(Boolean)
    .join(" · ");

  const printCss = `
    @page { size: A4; margin: 0; }
    .inv-sheet, .inv-sheet * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @media screen { .inv-sheet { box-shadow: 0 10px 40px -12px rgba(0,0,0,.25); margin: 24px auto; } }
    @media print {
      html, body { background: #fff !important; }
      .inv-sheet { box-shadow: none !important; margin: 0 !important; }
    }
  `;

  return (
    <div className="text-slate-900">
      <style dangerouslySetInnerHTML={{ __html: printCss }} />

      {/* Screen-only toolbar */}
      <div className="no-print mx-auto mb-2 flex max-w-[210mm] items-center justify-between px-1 pt-2">
        <Link
          href={`/invoices/${invoice.id}`}
          className="text-[12.5px] font-semibold text-slate-500 hover:text-slate-900"
        >
          {t("invoices.print.back")}
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
          color: "#1f2937",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Branded header */}
        <div style={{ position: "relative", background: accent, color: "#fff", paddingTop: "10mm" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              padding: "0 14mm 14mm",
              gap: "12mm",
            }}
          >
            <div>
              <div style={{ fontSize: "30pt", fontWeight: 800, letterSpacing: "-0.5px", lineHeight: 1 }}>
                INVOICE
              </div>
              <div style={{ marginTop: "6px", fontSize: "10pt", opacity: 0.9 }}>
                # {invoice.invoiceNumber}
                {invoice.referenceNumber ? `  ·  ${invoice.referenceNumber}` : ""}
              </div>
            </div>

            {/* White brand card (the navy logo reads on the coloured band). */}
            <div
              style={{
                background: "#fff",
                borderRadius: "10px",
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                maxWidth: "80mm",
              }}
            >
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt={brandName} style={{ height: "58px", width: "auto", objectFit: "contain" }} />
              ) : (
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "15pt", fontWeight: 700, color: dark }}>{brandName}</div>
                  <div style={{ fontSize: "8pt", color: accentDeep, textTransform: "uppercase", letterSpacing: "1px" }}>
                    {tagline}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Curved bottom edge. */}
          <svg
            viewBox="0 0 1200 40"
            preserveAspectRatio="none"
            style={{ display: "block", width: "100%", height: "26px" }}
          >
            <path d="M0,0 C280,44 920,-8 1200,26 L1200,40 L0,40 Z" fill="#ffffff" />
          </svg>
        </div>

        {/* Bill-to + invoice meta */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: "10mm", padding: "2mm 14mm 0" }}>
          <div style={{ fontSize: "10pt" }}>
            <div style={{ fontSize: "8pt", textTransform: "uppercase", letterSpacing: "1.5px", color: "#94a3b8" }}>
              Invoice to
            </div>
            <div style={{ marginTop: "3px", fontSize: "13pt", fontWeight: 700, color: dark }}>
              {invoice.party.name}
            </div>
            {meta && <div style={{ color: "#64748b" }}>{meta}</div>}
            {invoice.party.address && <div style={{ color: "#64748b" }}>{invoice.party.address}</div>}
            {invoice.party.phone && <div style={{ color: "#64748b" }}>{invoice.party.phone}</div>}
            <div style={{ color: "#64748b" }}>
              {invoice.party.ntn ? `${t("invoices.print.ntnPrefix")} ${invoice.party.ntn}` : t("invoices.print.noNtn")}
            </div>
          </div>

          <table style={{ fontSize: "10pt", borderCollapse: "collapse" }}>
            <tbody>
              <MetaRow label="Invoice No" value={`#${invoice.invoiceNumber}`} />
              {invoice.referenceNumber && <MetaRow label="Reference" value={invoice.referenceNumber} />}
              <MetaRow label="Date" value={dateShort(invoice.date)} />
              <MetaRow label="Channel" value={invoice.channel} accent={accentDeep} />
            </tbody>
          </table>
        </div>

        {/* Items table */}
        <div style={{ padding: "6mm 14mm 0" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9.5pt" }}>
            <thead>
              <tr style={{ background: dark, color: "#fff" }}>
                <Th w="8%">SL</Th>
                <Th align="left">{t("invoices.print.colItem")}</Th>
                <Th align="right">{t("invoices.print.colGross")}</Th>
                <Th align="right">{t("invoices.print.colGlazing")}</Th>
                <Th align="right">{t("invoices.print.colNet")}</Th>
                <Th align="right">{t("invoices.print.colRate")}</Th>
                <Th align="right">{t("invoices.print.colAmount")}</Th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((li, i) => (
                <tr key={li.id} style={{ background: i % 2 === 0 ? "#f4f5f7" : "#ffffff" }}>
                  <Td>{String(i + 1).padStart(2, "0")}</Td>
                  <Td align="left" bold>{li.item.name}</Td>
                  <Td align="right">{kg(Number(li.grossWeightKg))}</Td>
                  <Td align="right">{pct(Number(li.glazingPct))}</Td>
                  <Td align="right">{kg(Number(li.netWeightKg))}</Td>
                  <Td align="right">{pkr(Number(li.ratePerKg))}</Td>
                  <Td align="right" bold>{pkr(Number(li.amount))}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Notes/terms (left) + totals (right) */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: "10mm", padding: "6mm 14mm 0" }}>
          <div style={{ flex: 1, fontSize: "8.5pt", color: "#64748b", maxWidth: "95mm" }}>
            <div style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "#94a3b8" }}>
              {t("invoices.print.notes")}
            </div>
            <p style={{ marginTop: "4px" }}>{CHANNEL_NOTE[invoice.channel] ?? ""}</p>
            {invoice.notes && (
              <p style={{ marginTop: "6px", whiteSpace: "pre-wrap", color: "#475569" }}>{invoice.notes}</p>
            )}
          </div>

          <div style={{ width: "68mm", fontSize: "10pt" }}>
            <TotalRow label="Sub total" value={pkr(total)} />
            {paid > 0 && <TotalRow label="Amount paid" value={pkr(paid)} />}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                background: accent,
                color: "#fff",
                padding: "8px 12px",
                borderRadius: "6px",
                marginTop: "6px",
                fontWeight: 700,
              }}
            >
              <span>{paid > 0 ? "Balance due" : t("invoices.print.total")}</span>
              <span style={{ fontFamily: "monospace" }}>{pkr(paid > 0 ? balance : total)}</span>
            </div>
          </div>
        </div>

        {/* Signature */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            padding: "16mm 14mm 8mm",
            marginTop: "auto",
          }}
        >
          <div style={{ width: "70mm", borderTop: "1px solid #94a3b8", paddingTop: "4px", fontSize: "8.5pt", color: "#64748b" }}>
            {t("invoices.print.receivedBy")}
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "9pt", fontWeight: 700, color: dark }}>{brandName}</div>
            <div style={{ width: "55mm", borderTop: "1px solid #94a3b8", marginTop: "18px", paddingTop: "4px", fontSize: "8.5pt", color: "#64748b" }}>
              {t("invoices.print.dateLabel")}
            </div>
          </div>
        </div>

        {/* Footer band */}
        <div style={{ background: dark, color: "#fff", padding: "6mm 14mm", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "8.5pt" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "10pt" }}>{brandName}</div>
            <div style={{ opacity: 0.75 }}>{tagline}</div>
          </div>
          <div style={{ opacity: 0.85, textAlign: "right" }}>Thank you for your business.</div>
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <tr>
      <td style={{ padding: "1px 10px 1px 0", color: "#94a3b8", fontSize: "8.5pt", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {label}
      </td>
      <td style={{ padding: "1px 0", fontWeight: 600, color: accent ?? "#1f2937", textTransform: accent ? "capitalize" : "none", textAlign: "right" }}>
        {value}
      </td>
    </tr>
  );
}

function Th({
  children,
  align = "center",
  w,
}: {
  children?: React.ReactNode;
  align?: "left" | "right" | "center";
  w?: string;
}) {
  return (
    <th
      style={{
        padding: "7px 10px",
        textAlign: align,
        fontSize: "8pt",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        width: w,
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "center",
  bold,
}: {
  children?: React.ReactNode;
  align?: "left" | "right" | "center";
  bold?: boolean;
}) {
  return (
    <td
      style={{
        padding: "7px 10px",
        textAlign: align,
        fontWeight: bold ? 600 : 400,
        fontFamily: align === "right" ? "monospace" : undefined,
        color: "#1f2937",
      }}
    >
      {children}
    </td>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 12px", color: "#475569" }}>
      <span>{label}</span>
      <span style={{ fontFamily: "monospace" }}>{value}</span>
    </div>
  );
}
