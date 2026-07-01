import Link from "next/link";
import type { ReactNode, CSSProperties } from "react";

/* ============================================================
   Shared UI primitives for the "paper ledger" design.
   Colors come from the CSS tokens in globals.css (var(--…)), so
   everything flips automatically in dark mode. Prefer these over
   ad-hoc classes so pages stay consistent.
   ============================================================ */

/** Semantic chip tones → token pairs (bg + fg). */
export type Tone = "accent" | "pos" | "warn" | "neg" | "info" | "neutral" | "gold";

const TONE_VARS: Record<Tone, { bg: string; fg: string }> = {
  accent: { bg: "var(--accent-tint)", fg: "var(--accent-deep)" },
  pos: { bg: "var(--pos-bg)", fg: "var(--pos)" },
  warn: { bg: "var(--warn-bg)", fg: "var(--warn)" },
  neg: { bg: "var(--neg-bg)", fg: "var(--neg)" },
  info: { bg: "var(--info-bg)", fg: "var(--info)" },
  neutral: { bg: "var(--neutral-bg)", fg: "var(--neutral)" },
  gold: { bg: "var(--warn-bg)", fg: "var(--gold)" },
};

/** Map any domain status string → a chip tone. */
export function statusTone(status: string): Tone {
  switch (status) {
    case "submitted":
    case "in_transit":
    case "deposited":
      return "accent";
    case "printed":
    case "cleared":
    case "delivered":
    case "paid":
      return "pos";
    case "edited":
    case "pending":
    case "preparing":
      return "warn";
    case "delayed":
    case "bounced":
    case "overdue":
    case "dispute":
      return "neg";
    case "issued":
      return "info";
    case "bad_debt":
      return "neg";
    default:
      return "neutral"; // draft, held, cancelled, …
  }
}

export function Chip({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  const c = TONE_VARS[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[11px] font-semibold ${className}`}
      style={{ background: c.bg, color: c.fg }}
    >
      {children}
    </span>
  );
}

/** Status chip that derives its tone from the status string. */
export function StatusChip({ status, label }: { status: string; label?: string }) {
  return <Chip tone={statusTone(status)}>{label ?? status.replace(/_/g, " ")}</Chip>;
}

/** A cream card surface. */
export function Card({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`rounded-xl border border-hair bg-card ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

/** Page header: small uppercase eyebrow + serif title (+ optional action slot). */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
            {eyebrow}
          </div>
        )}
        <h1 className="mt-0.5 font-serif text-[28px] font-semibold leading-tight text-ink">
          {title}
        </h1>
        {subtitle && <div className="mt-1 text-sm text-muted">{subtitle}</div>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

/** Primary (accent) button — as a <button> or a <Link> when `href` is given. */
export function PrimaryButton({
  children,
  href,
  className = "",
  ...rest
}: {
  children: ReactNode;
  href?: string;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = `inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-[#F6F2E6] transition-colors ${className}`;
  const style: CSSProperties = { background: "var(--accent)" };
  if (href) {
    return (
      <Link href={href} className={cls} style={style}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} style={style} {...rest}>
      {children}
    </button>
  );
}

/** Ghost / secondary button. */
export function GhostButton({
  children,
  href,
  className = "",
  ...rest
}: {
  children: ReactNode;
  href?: string;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = `inline-flex items-center justify-center gap-2 rounded-lg border border-hair bg-card px-3.5 py-2 text-sm font-semibold text-text transition-colors hover:bg-card2 ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}

/** A back link ("← All invoices"). */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="mb-2.5 inline-block text-[12.5px] font-semibold text-gold hover:text-accent-deep"
    >
      {children}
    </Link>
  );
}

/** KPI stat card (mono value, uppercase label, muted sub). */
export function Kpi({
  label,
  value,
  sub,
  valueColor,
}: {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <Card className="p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-faint2">
        {label}
      </div>
      <div
        className="mt-2 font-mono text-2xl font-semibold tracking-tight text-ink"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-[11.5px] text-faint">{sub}</div>}
    </Card>
  );
}

/** Table shell + reusable header cell for the paper tables. */
export function Th({
  children,
  align = "left",
  className = "",
}: {
  children?: ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <th
      className={`border-b border-hair2 bg-card2 px-3.5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-faint2 ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      {children}
    </th>
  );
}
