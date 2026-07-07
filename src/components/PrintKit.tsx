/**
 * Shared building blocks for A4 print documents (invoices, purchases, …).
 * Every print page brings its own palette + copy but reuses this layout kit
 * so the documents stay visually consistent.
 */

/** @page + print-color-adjust rules, scoped to a print-root class name. */
export function printCss(rootClass: string): string {
  return `
    @page { size: A4; margin: 0; }
    .${rootClass}, .${rootClass} * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @media screen { .${rootClass} { box-shadow: 0 10px 40px -12px rgba(0,0,0,.25); margin: 24px auto; } }
    @media print {
      html, body { background: #fff !important; }
      .${rootClass} { box-shadow: none !important; margin: 0 !important; }
    }
  `;
}

export function IconLine({
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

export function Glyph({ icon, color }: { icon: "phone" | "mail" | "pin" | "id"; color: string }) {
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

export function MetaLine({
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

export function SumRow({ label, value, muted, navy }: { label: string; value: string; muted: string; navy: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #eef2f3" }}>
      <span style={{ color: muted }}>{label}</span>
      <span style={{ fontFamily: "monospace", color: navy, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

export function Th({ children, align = "center", w }: { children?: React.ReactNode; align?: "left" | "right" | "center"; w?: string }) {
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

export function Td({
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
