import { pkr } from "@/lib/format";
import { Card } from "@/components/ui";
import {
  SALES_MONTHLY,
  SALES_TOP_CLIENTS,
  SALES_GRAND_TOTAL,
  SALES_INVOICE_COUNT,
  SALES_FY_LABEL,
} from "@/lib/salesReport";

const compactM = (n: number) => (n / 1_000_000).toFixed(1);

/**
 * SeaStar Impex annual sales overview (FY 2025–26), rendered from the imported
 * report (src/lib/salesReport.ts). Dependency-free inline SVG bar chart + a
 * top-clients breakdown — historical figures, independent of the live ledger.
 */
export default function SalesReportSection() {
  const monthMax = Math.max(1, ...SALES_MONTHLY.map((m) => m.amount));
  const clientMax = Math.max(1, ...SALES_TOP_CLIENTS.map((c) => c.amount));
  const monthsWithSales = SALES_MONTHLY.filter((m) => m.amount > 0);
  const avg = monthsWithSales.length
    ? Math.round(SALES_GRAND_TOTAL / monthsWithSales.length)
    : 0;
  const best = [...SALES_MONTHLY].sort((a, b) => b.amount - a.amount)[0];

  // Chart geometry.
  const W = 720;
  const H = 220;
  const padX = 10;
  const padT = 24;
  const padB = 26;
  const plotH = H - padT - padB;
  const n = SALES_MONTHLY.length;
  const slot = (W - padX * 2) / n;
  const barW = slot * 0.6;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-serif text-[17px] font-semibold text-ink">
            Sales overview · {SALES_FY_LABEL}
          </div>
          <div className="text-[11.5px] text-faint2">
            SeaStar Impex · imported annual report · {SALES_INVOICE_COUNT} invoices
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[22px] font-semibold text-ink">{pkr(SALES_GRAND_TOTAL)}</div>
          <div className="text-[11px] text-faint">total sales</div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Monthly average" value={pkr(avg)} />
        <Stat label="Best month" value={`${best.month} ${best.year}`} sub={`Rs ${compactM(best.amount)}M`} />
        <Stat label="Invoices" value={String(SALES_INVOICE_COUNT)} />
      </div>

      {/* Monthly bar chart */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-4 w-full"
        role="img"
        aria-label={`Monthly sales for ${SALES_FY_LABEL}`}
      >
        {SALES_MONTHLY.map((m, i) => {
          const barH = (m.amount / monthMax) * plotH;
          const x = padX + i * slot + (slot - barW) / 2;
          const y = padT + plotH - barH;
          return (
            <g key={m.month}>
              {m.amount > 0 && (
                <rect x={x} y={y} width={barW} height={barH} rx={3} fill="var(--accent)" />
              )}
              {m.amount > 0 && (
                <text
                  x={x + barW / 2}
                  y={y - 5}
                  textAnchor="middle"
                  fontSize="10"
                  fontFamily="var(--font-mono, monospace)"
                  fill="var(--muted, #6b7a80)"
                >
                  {compactM(m.amount)}
                </text>
              )}
              <text
                x={x + barW / 2}
                y={padT + plotH + 16}
                textAnchor="middle"
                fontSize="11"
                fill="var(--faint, #9aa4a8)"
              >
                {m.month}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Top clients */}
      <div className="mt-4">
        <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-faint2">
          Top clients
        </div>
        <ul className="space-y-1.5">
          {SALES_TOP_CLIENTS.map((c) => (
            <li key={c.name} className="flex items-center gap-3">
              <span className="w-[120px] shrink-0 truncate text-[12.5px] text-text sm:w-[150px]">
                {c.name}
              </span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--card2)" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(c.amount / clientMax) * 100}%`, background: "var(--accent)" }}
                />
              </div>
              <span className="w-[46px] shrink-0 text-right font-mono text-[11px] text-faint">
                {((c.amount / SALES_GRAND_TOTAL) * 100).toFixed(0)}%
              </span>
              <span className="hidden w-[104px] shrink-0 text-right font-mono text-[12px] text-ink sm:block">
                {pkr(c.amount)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-hair2 bg-card2 px-3.5 py-2.5">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-faint2">{label}</div>
      <div className="mt-1 font-mono text-[15px] font-semibold text-ink">{value}</div>
      {sub && <div className="text-[11px] text-faint">{sub}</div>}
    </div>
  );
}
