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

  // Palette sampled from the SeaStar brand mark (whale-tail teal + deep navy)
  // so the invoice matches the logo rather than the app's slate UI theme.
  const teal = "#2fa39c"; // header panel, table head, grand-total band
  const tealDeep = "#1f7d78"; // emphasis / icon accents
  const navy = "#16242f"; // headings, brand text
  const rule = "#e3e8ea"; // hairline row dividers
  const muted = "#6b7a80";
  const logo = cfg.branding.logoDataUrl;
  const brandName = cfg.branding.appName;
  const tagline = cfg.branding.tagline;
  const fromName = invoice.entity?.name || brandName;

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

          {/* INVOICE title + number */}
          <div style={{ textAlign: "right", paddingTop: "12mm" }}>
            <div style={{ fontSize: "40pt", fontWeight: 800, letterSpacing: "1px", lineHeight: 0.9, color: navy }}>
              INVOICE
            </div>
            <div style={{ marginTop: "6px", fontSize: "11pt", color: muted }}>
              Invoice No #{invoice.invoiceNumber}
            </div>
          </div>
        </div>

        {/* --------------------- Invoice To / Invoice From --------------------- */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12mm",
            padding: "9mm 14mm 0",
          }}
        >
          {/* To */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "8.5pt", textTransform: "uppercase", letterSpacing: "1.5px", color: tealDeep, fontWeight: 700 }}>
              Invoice To
            </div>
            <div style={{ marginTop: "4px", fontSize: "14pt", fontWeight: 700, color: navy }}>
              {invoice.party.name}
            </div>
            <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "3px", fontSize: "9.5pt", color: muted }}>
              {invoice.party.phone && <IconLine icon="phone" accent={teal}>{invoice.party.phone}</IconLine>}
              {invoice.party.email && <IconLine icon="mail" accent={teal}>{invoice.party.email}</IconLine>}
              {invoice.party.address && <IconLine icon="pin" accent={teal}>{invoice.party.address}</IconLine>}
              <IconLine icon="id" accent={teal}>
                {invoice.party.ntn ? `${t("invoices.print.ntnPrefix")} ${invoice.party.ntn}` : t("invoices.print.noNtn")}
              </IconLine>
            </div>
          </div>

          {/* From */}
          <div style={{ flex: 1, textAlign: "right" }}>
            <div style={{ fontSize: "8.5pt", textTransform: "uppercase", letterSpacing: "1.5px", color: tealDeep, fontWeight: 700 }}>
              Invoice From
            </div>
            <div style={{ marginTop: "4px", fontSize: "14pt", fontWeight: 700, color: navy }}>
              {fromName}
            </div>
            {tagline && <div style={{ fontSize: "9pt", color: muted }}>{tagline}</div>}
            <div style={{ marginTop: "7px", display: "flex", flexDirection: "column", gap: "2px", fontSize: "9.5pt" }}>
              <MetaLine label={t("invoices.print.dateLabel")} value={dateShort(invoice.date)} muted={muted} navy={navy} />
              <MetaLine label="Reference" value={invoice.referenceNumber || "—"} muted={muted} navy={navy} />
              <MetaLine label="Channel" value={invoice.channel} muted={muted} navy={tealDeep} capitalize />
            </div>
          </div>
        </div>

        {/* ---------------------------- Items ---------------------------- */}
        <div style={{ padding: "8mm 14mm 0" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9.5pt" }}>
            <thead>
              <tr style={{ background: teal, color: "#fff" }}>
                <Th w="6%">SL</Th>
                <Th align="left">{t("invoices.print.colItem")}</Th>
                <Th align="right">{t("invoices.print.colGross")}</Th>
                <Th align="right">{t("invoices.print.colGlazing")}</Th>
                <Th align="right">{t("invoices.print.colNet")}</Th>
                <Th align="right">{t("invoices.print.colRate")}</Th>
                <Th align="right">{t("invoices.print.colAmount")}</Th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((li, i) => {
                const sub = [
                  li.cartonCount ? `${li.cartonCount} ctn` : "",
                  li.packetCount ? `${li.packetCount} pkt` : "",
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <tr key={li.id} style={{ borderBottom: `1px solid ${rule}` }}>
                    <Td muted={muted}>{String(i + 1).padStart(2, "0")}</Td>
                    <Td align="left">
                      <div style={{ fontWeight: 700, color: navy }}>{li.item.name}</div>
                      {sub && <div style={{ fontSize: "8pt", color: muted, marginTop: "1px" }}>{sub}</div>}
                    </Td>
                    <Td align="right">{kg(Number(li.grossWeightKg))}</Td>
                    <Td align="right">{pct(Number(li.glazingPct))}</Td>
                    <Td align="right">{kg(Number(li.netWeightKg))}</Td>
                    <Td align="right">{pkr(Number(li.ratePerKg))}</Td>
                    <Td align="right" bold>{pkr(Number(li.amount))}</Td>
                  </tr>
                );
              })}
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
            Invoice No #{invoice.invoiceNumber} · {dateShort(invoice.date)}
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

        {/* --------------------- Terms + signature --------------------- */}
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
              {t("invoices.print.notes")}
            </div>
            <p style={{ marginTop: "4px", fontSize: "8.5pt", color: muted, lineHeight: 1.5 }}>
              {CHANNEL_NOTE[invoice.channel] ?? ""}
            </p>
            {invoice.notes && (
              <p style={{ marginTop: "6px", fontSize: "8.5pt", color: "#475569", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                {invoice.notes}
              </p>
            )}
          </div>

          <div style={{ textAlign: "center", minWidth: "58mm" }}>
            <div style={{ height: "16mm" }} />
            <div style={{ borderTop: `1px solid ${muted}`, paddingTop: "4px", fontSize: "9pt", fontWeight: 700, color: navy }}>
              {fromName}
            </div>
            <div style={{ fontSize: "8pt", color: muted }}>Authorised signatory</div>
          </div>
        </div>

        {/* ------------------------------ Footer ------------------------------ */}
        <div style={{ padding: "0 14mm" }}>
          <div style={{ marginTop: "8mm", borderTop: `2px solid ${teal}`, paddingTop: "3mm", paddingBottom: "6mm", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "8.5pt", color: muted }}>
            <span style={{ fontWeight: 700, color: navy }}>{brandName}</span>
            <span>{tagline}</span>
            <span>Thank you for your business.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- Small helpers --------------------------- */

function IconLine({
  icon,
  accent,
  children,
}: {
  icon: "phone" | "mail" | "pin" | "id";
  accent: string;
  children?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
      <span style={{ flexShrink: 0, marginTop: "1px" }}>
        <Glyph icon={icon} color={accent} />
      </span>
      <span>{children}</span>
    </div>
  );
}

function Glyph({ icon, color }: { icon: "phone" | "mail" | "pin" | "id"; color: string }) {
  const common = { width: 12, height: 12, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (icon === "phone")
    return (
      <svg {...common}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.98.36 1.92.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.89.34 1.83.57 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    );
  if (icon === "mail")
    return (
      <svg {...common}>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-10 6L2 7" />
      </svg>
    );
  if (icon === "pin")
    return (
      <svg {...common}>
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    );
  return (
    <svg {...common}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M7 9h4M7 13h6" />
    </svg>
  );
}

function MetaLine({
  label,
  value,
  muted,
  navy,
  capitalize,
}: {
  label: string;
  value: string;
  muted: string;
  navy: string;
  capitalize?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
      <span style={{ color: muted, textTransform: "uppercase", fontSize: "8pt", letterSpacing: "0.5px", alignSelf: "center" }}>{label}</span>
      <span style={{ color: navy, fontWeight: 700, textTransform: capitalize ? "capitalize" : "none", minWidth: "26mm", textAlign: "right" }}>{value}</span>
    </div>
  );
}

function SumRow({ label, value, muted, navy }: { label: string; value: string; muted: string; navy: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #eef2f3" }}>
      <span style={{ color: muted }}>{label}</span>
      <span style={{ fontFamily: "monospace", color: navy, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function Th({ children, align = "center", w }: { children?: React.ReactNode; align?: "left" | "right" | "center"; w?: string }) {
  return (
    <th
      style={{
        padding: "8px 10px",
        textAlign: align,
        fontSize: "8pt",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.6px",
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
  muted,
}: {
  children?: React.ReactNode;
  align?: "left" | "right" | "center";
  bold?: boolean;
  muted?: string;
}) {
  return (
    <td
      style={{
        padding: "8px 10px",
        textAlign: align,
        fontWeight: bold ? 700 : 400,
        fontFamily: align === "right" ? "monospace" : undefined,
        color: muted ?? "#1f2937",
        verticalAlign: "top",
      }}
    >
      {children}
    </td>
  );
}
