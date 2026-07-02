import { pkr } from "@/lib/format";

/** One month's paired revenue/expenses + derived profit, plain serializable. */
export interface BarDatum {
  label: string;
  revenue: number;
  expenses: number;
  profit: number;
}

/**
 * Hand-rolled, dependency-free grouped bar chart (revenue vs expenses per month)
 * with a profit line overlaid and profit labels. Pure: props in, themeable SVG
 * out. Colors come from Tailwind classes with dark: variants so it reads in both
 * modes. All-zero data renders a flat baseline gracefully.
 */
export function BarChart({ data }: { data: BarDatum[] }) {
  const W = 720;
  const H = 300;
  const padL = 64;
  const padR = 16;
  const padT = 20;
  const padB = 40;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const maxBar = Math.max(1, ...data.map((d) => Math.max(d.revenue, d.expenses)));
  const profits = data.map((d) => d.profit);
  const maxProfit = Math.max(0, ...profits);
  const minProfit = Math.min(0, ...profits);
  // Bar y-scale is 0..maxBar. The profit line shares the same axis but is
  // clamped into view so a negative month dips below the baseline visibly.
  const yBar = (v: number) => padT + plotH - (v / maxBar) * plotH;

  // Baseline for profit (zero line). Profit range spans [minProfit, maxProfit];
  // map it into the plot so 0 sits proportionally.
  const pSpan = maxProfit - minProfit || 1;
  const yProfit = (v: number) => padT + plotH - ((v - minProfit) / pSpan) * plotH;
  const zeroY = yProfit(0);

  const n = data.length;
  const slot = plotW / Math.max(1, n);
  const barGap = 6;
  const barW = Math.max(6, (slot - barGap * 3) / 2);

  const gridLines = 4;
  const allZero = data.every((d) => d.revenue === 0 && d.expenses === 0);

  const profitPts = data.map((d, i) => {
    const cx = padL + slot * i + slot / 2;
    return { cx, cy: yProfit(d.profit), profit: d.profit };
  });
  const linePath = profitPts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.cx.toFixed(1)} ${p.cy.toFixed(1)}`)
    .join(" ");

  return (
    <div>
      {/* width attr + hex fills are FALLBACKS for browsers with a stale or
          unsupported stylesheet — CSS classes override them when healthy. */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        className="h-auto w-full"
        role="img"
        aria-label="Revenue, expenses and profit by month"
      >
        {/* Horizontal gridlines + y-axis value labels (PKR, compact). */}
        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const v = (maxBar / gridLines) * i;
          const y = yBar(v);
          return (
            <g key={i}>
              <line
                x1={padL}
                x2={W - padR}
                y1={y}
                y2={y}
                stroke="#e7dfc9"
                className="stroke-[var(--hair-2)]"
                strokeWidth={1}
              />
              <text
                x={padL - 8}
                y={y + 3}
                textAnchor="end"
                fill="#98937e"
                className="fill-[var(--faint)] font-mono"
                fontSize={10}
              >
                {compact(v)}
              </text>
            </g>
          );
        })}

        {/* Paired bars per month. */}
        {data.map((d, i) => {
          const x0 = padL + slot * i + barGap;
          const revX = x0;
          const expX = x0 + barW + barGap;
          const revY = yBar(d.revenue);
          const expY = yBar(d.expenses);
          return (
            <g key={d.label}>
              {/* <title> = native browser tooltip with the exact figures. */}
              <rect
                x={revX}
                y={revY}
                width={barW}
                height={padT + plotH - revY}
                rx={2}
                fill="#0e7c7b"
                className="fill-[var(--accent)]"
              >
                <title>{`${d.label} — revenue ${fullPkr(d.revenue)}`}</title>
              </rect>
              <rect
                x={expX}
                y={expY}
                width={barW}
                height={padT + plotH - expY}
                rx={2}
                fill="#d9b98a"
                className="fill-[#D9B98A]"
              >
                <title>{`${d.label} — expenses ${fullPkr(d.expenses)}`}</title>
              </rect>
              <text
                x={padL + slot * i + slot / 2}
                y={H - padB + 16}
                textAnchor="middle"
                fill="#7a8578"
                className="fill-[var(--faint)] font-mono"
                fontSize={11}
              >
                {d.label}
              </text>
            </g>
          );
        })}

        {/* Profit zero-baseline + line + dots (skip when everything is zero). */}
        {!allZero && (
          <>
            <line
              x1={padL}
              x2={W - padR}
              y1={zeroY}
              y2={zeroY}
              stroke="#e4dbc5"
              className="stroke-[var(--hair)]"
              strokeWidth={1}
              strokeDasharray="2 3"
            />
            <path
              d={linePath}
              fill="none"
              stroke="#337a54"
              className="stroke-[var(--pos)]"
              strokeWidth={2}
              strokeLinejoin="round"
            />
            {profitPts.map((p, i) => (
              <g key={i}>
                <circle
                  cx={p.cx}
                  cy={p.cy}
                  r={3.5}
                  fill={p.profit < 0 ? "#c2492f" : "#337a54"}
                  className={p.profit < 0 ? "fill-[var(--neg)]" : "fill-[var(--pos)]"}
                >
                  <title>{`profit ${fullPkr(p.profit)}`}</title>
                </circle>
                <text
                  x={p.cx}
                  y={p.cy - 8}
                  textAnchor="middle"
                  fill={p.profit < 0 ? "#c2492f" : "#337a54"}
                  className={
                    p.profit < 0 ? "fill-[var(--neg)] font-mono" : "fill-[var(--pos)] font-mono"
                  }
                  fontSize={10}
                  fontWeight={600}
                >
                  {compact(p.profit)}
                </text>
              </g>
            ))}
          </>
        )}
      </svg>

      {/* Legend. */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-faint">
        <LegendSwatch className="bg-[var(--accent)]" label="Revenue" />
        <LegendSwatch className="bg-[#D9B98A]" label="Expenses" />
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded bg-[var(--pos)]" />
          Profit
        </span>
      </div>
    </div>
  );
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block h-2.5 w-2.5 rounded-sm ${className}`} />
      {label}
    </span>
  );
}

/** Compact PKR for axis/labels: 1.2M / 340K / 900. Keeps the axis readable. */
function compact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000)}K`;
  return `${sign}${Math.round(abs)}`;
}

/** Exported for reuse: full PKR formatting for tooltips/summaries elsewhere. */
export function fullPkr(n: number): string {
  return pkr(n);
}
