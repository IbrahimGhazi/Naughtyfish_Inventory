import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveContext } from "@/lib/session";
import { requirePage } from "@/lib/roles";
import { getAppConfig, getCopy } from "@/lib/config";
import { pkr, dateShort } from "@/lib/format";
import type { TFn } from "@/lib/copy";
import { BackLink, Card, PrimaryButton, Th } from "@/components/ui";
import SharePdfButton from "@/components/SharePdfButton";
import type { WeeklyPdfData } from "@/lib/pdf/types";
import {
  buildWeeklyStatement,
  defaultWeekRange,
  presetRange,
  type RangePreset,
  type StatementRow,
} from "@/lib/reports";

export const dynamic = "force-dynamic";

/** Parse a yyyy-mm-dd query param to a local Date, or undefined if blank/invalid. */
function parseDay(v: string | undefined, endOfDay: boolean): Date | undefined {
  if (!v) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return undefined;
  const [, y, mo, d] = m;
  return new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  );
}

/** yyyy-mm-dd for a Date, for form defaults and ISO query params. */
function toDayValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

const PRESETS: { key: RangePreset; labelKey: string }[] = [
  { key: "this_week", labelKey: "reports.weekly.preset.thisWeek" },
  { key: "last_week", labelKey: "reports.weekly.preset.lastWeek" },
  { key: "this_month", labelKey: "reports.weekly.preset.thisMonth" },
];

export default async function WeeklyStatementPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; preset?: string }>;
}) {
  const { from, to, preset } = await searchParams;
  const ctx = await getActiveContext();
  requirePage(ctx, "reports");
  const cfg = await getAppConfig();
  if (!cfg.features.reports) redirect("/");
  const t = await getCopy();

  // The PAGE decides "now" (the pure helpers must not read the clock).
  const now = new Date();

  // Resolve the active range: explicit preset > explicit from/to > default week.
  let range: { from: Date; to: Date };
  if (preset === "this_week" || preset === "last_week" || preset === "this_month") {
    range = presetRange(preset, now);
  } else {
    const fromDate = parseDay(from, false);
    const toDate = parseDay(to, true);
    if (fromDate && toDate) {
      range = { from: fromDate, to: toDate };
    } else {
      range = defaultWeekRange(now);
    }
  }

  const fromValue = toDayValue(range.from);
  const toValue = toDayValue(range.to);

  // The statement is as-of the END of the range.
  const stmt = await buildWeeklyStatement(ctx.entityId, range.to);

  const printHref = `/reports/weekly/print?from=${fromValue}&to=${toValue}`;

  const toRow = (r: StatementRow) => ({
    name: r.name,
    detail: r.invoices.length
      ? r.invoices.map((i) => `#${i.number}${i.reference ? " " + i.reference : ""}`).join(", ")
      : "—",
    outstanding: r.outstanding,
  });
  const weeklyPdf: WeeklyPdfData = {
    businessName: cfg.branding.appName,
    fromISO: range.from.toISOString(),
    toISO: range.to.toISOString(),
    corporate: stmt.corporate.map(toRow),
    local: stmt.local.map(toRow),
    suppliers: stmt.suppliers.map(toRow),
    receivablesTotal: stmt.receivablesTotal,
    payablesTotal: stmt.payablesTotal,
    net: stmt.net,
  };

  return (
    <div className="animate-rise space-y-5">
      <div>
        <BackLink href="/reports">{t("reports.weekly.back")}</BackLink>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
              {t("reports.weekly.eyebrow")}
            </div>
            <h1 className="mt-0.5 font-serif text-[28px] font-semibold leading-tight text-ink">
              {t("reports.weekly.title")}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {ctx.entityName} · {dateShort(range.from)} → {dateShort(range.to)} · {t("reports.weekly.balancesAsOf")}{" "}
              {dateShort(range.to)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SharePdfButton
              kind="weekly"
              payload={weeklyPdf}
              filename={`Weekly-${fromValue}_to_${toValue}.pdf`}
              shareText={`${cfg.branding.appName} — weekly statement ${fromValue} to ${toValue}`}
              testid="share-weekly"
            />
            <PrimaryButton
              href={printHref}
              data-testid="wk-print"
              style={{ background: "var(--ink)", color: "var(--card)" }}
            >
              {t("reports.weekly.print")}
            </PrimaryButton>
          </div>
        </div>
      </div>

      {/* Preset quick-links */}
      <div className="flex flex-wrap gap-2 text-sm">
        {PRESETS.map((p) => (
          <Link
            key={p.key}
            href={`/reports/weekly?preset=${p.key}`}
            data-testid={`wk-preset-${p.key}`}
            className="rounded-lg border border-hair bg-card px-3 py-1.5 font-semibold text-text transition-colors hover:bg-card2"
          >
            {t(p.labelKey)}
          </Link>
        ))}
      </div>

      {/* Explicit from/to GET form (like the party ledger as-of filter). */}
      <form className="flex flex-wrap items-end gap-2 text-sm" action="/reports/weekly">
        <label className="text-xs font-semibold uppercase tracking-[0.1em] text-faint2">
          {t("reports.weekly.from")}
          <input
            type="date"
            name="from"
            defaultValue={fromValue}
            data-testid="wk-from"
            className="input mt-1 block font-normal normal-case tracking-normal"
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-[0.1em] text-faint2">
          {t("reports.weekly.to")}
          <input
            type="date"
            name="to"
            defaultValue={toValue}
            data-testid="wk-to"
            className="input mt-1 block font-normal normal-case tracking-normal"
          />
        </label>
        <button
          type="submit"
          data-testid="wk-apply"
          className="rounded-lg border border-hair bg-card px-3 py-2 font-semibold text-text transition-colors hover:bg-card2"
        >
          {t("reports.weekly.apply")}
        </button>
      </form>

      {/* Receivables — corporate + local sub-sections. */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-faint2">
            {t("reports.weekly.receivables")}
          </h2>
          <span className="font-mono text-sm font-semibold text-neg">
            {pkr(stmt.receivablesTotal)}
          </span>
        </div>

        <ReceivablesTable
          title={t("reports.weekly.corporate")}
          rows={stmt.corporate}
          emptyLabel={t("reports.weekly.corporateEmpty")}
          t={t}
        />
        <ReceivablesTable
          title={t("reports.weekly.local")}
          rows={stmt.local}
          emptyLabel={t("reports.weekly.localEmpty")}
          t={t}
        />
      </section>

      {/* Payables — suppliers we owe. */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-faint2">
            {t("reports.weekly.payables")}
          </h2>
          <span className="font-mono text-sm font-semibold text-warn">
            {pkr(stmt.payablesTotal)}
          </span>
        </div>
        <PayablesTable rows={stmt.suppliers} t={t} />
      </section>

      {/* Net position. */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">{t("reports.weekly.netPosition")}</span>
          <span
            className={`font-mono text-lg font-semibold ${stmt.net >= 0 ? "text-pos" : "text-neg"}`}
          >
            {pkr(stmt.net)}
          </span>
        </div>
        <p className="mt-1 text-[11.5px] text-faint">
          {t("reports.weekly.netHintPrefix")}{pkr(stmt.receivablesTotal)}{t("reports.weekly.netHintReceivable")}
          {pkr(stmt.payablesTotal)}{t("reports.weekly.netHintPayable")}
        </p>
      </Card>
    </div>
  );
}

/** Sort a copy of the rows by outstanding, descending. */
function byOutstandingDesc(rows: StatementRow[]): StatementRow[] {
  return [...rows].sort((a, b) => b.outstanding - a.outstanding);
}

function ReceivablesTable({
  title,
  rows,
  emptyLabel,
  t,
}: {
  title: string;
  rows: StatementRow[];
  emptyLabel: string;
  t: TFn;
}) {
  const sorted = byOutstandingDesc(rows);
  const subtotal = sorted.reduce((s, r) => s + r.outstanding, 0);

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-hair2 bg-card2 px-3.5 py-2.5 font-serif text-[15px] font-semibold text-ink">
        {title}
      </div>
      <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <Th>{t("reports.weekly.th.party")}</Th>
            <Th>{t("reports.weekly.th.openInvoices")}</Th>
            <Th align="right">{t("reports.weekly.th.outstanding")}</Th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-3.5 py-6 text-center text-sm text-faint">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            sorted.map((r) => (
              <tr key={r.partyId} className="border-b border-row transition-colors hover:bg-card2">
                <td className="px-3.5 py-3 text-[13px] font-semibold text-text">
                  <Link href={`/parties/${r.partyId}`} className="hover:text-accent-deep">
                    {r.name}
                  </Link>
                </td>
                <td className="px-3.5 py-3 font-mono text-[12px] text-muted">
                  {r.invoices.length === 0
                    ? "—"
                    : r.invoices
                        .map((inv) => `#${inv.number}${inv.reference ? ` · ${inv.reference}` : ""}`)
                        .join(", ")}
                </td>
                <td className="px-3.5 py-3 text-right font-mono text-[12.5px] font-semibold text-text">
                  {pkr(r.outstanding)}
                </td>
              </tr>
            ))
          )}
        </tbody>
        {sorted.length > 0 && (
          <tfoot>
            <tr className="border-t border-hair2 bg-card2">
              <td
                colSpan={2}
                className="px-3.5 py-2.5 text-right text-[10.5px] font-semibold uppercase tracking-[0.1em] text-faint2"
              >
                {t("reports.weekly.subtotal")}
              </td>
              <td className="px-3.5 py-2.5 text-right font-mono text-[12.5px] font-semibold text-ink">
                {pkr(subtotal)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
      </div>
    </Card>
  );
}

function PayablesTable({ rows, t }: { rows: StatementRow[]; t: TFn }) {
  const sorted = byOutstandingDesc(rows);
  const subtotal = sorted.reduce((s, r) => s + r.outstanding, 0);

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-hair2 bg-card2 px-3.5 py-2.5 font-serif text-[15px] font-semibold text-ink">
        {t("reports.weekly.suppliers")}
      </div>
      <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <Th>{t("reports.weekly.th.supplier")}</Th>
            <Th align="right">{t("reports.weekly.th.outstanding")}</Th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={2} className="px-3.5 py-6 text-center text-sm text-faint">
                {t("reports.weekly.suppliersEmpty")}
              </td>
            </tr>
          ) : (
            sorted.map((r) => (
              <tr key={r.partyId} className="border-b border-row transition-colors hover:bg-card2">
                <td className="px-3.5 py-3 text-[13px] font-semibold text-text">
                  <Link href={`/parties/${r.partyId}`} className="hover:text-accent-deep">
                    {r.name}
                  </Link>
                </td>
                <td className="px-3.5 py-3 text-right font-mono text-[12.5px] font-semibold text-text">
                  {pkr(r.outstanding)}
                </td>
              </tr>
            ))
          )}
        </tbody>
        {sorted.length > 0 && (
          <tfoot>
            <tr className="border-t border-hair2 bg-card2">
              <td className="px-3.5 py-2.5 text-right text-[10.5px] font-semibold uppercase tracking-[0.1em] text-faint2">
                {t("reports.weekly.subtotal")}
              </td>
              <td className="px-3.5 py-2.5 text-right font-mono text-[12.5px] font-semibold text-ink">
                {pkr(subtotal)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
      </div>
    </Card>
  );
}
