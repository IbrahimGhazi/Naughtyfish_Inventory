/** One slice of the donut: a labelled value + a Tailwind fill class pair. */
export interface DonutSlice {
  label: string;
  value: number;
  /** Tailwind fill class incl. dark: variant, e.g. "fill-cyan-500 dark:fill-cyan-400". */
  fill: string;
  /** Matching bg class for the legend swatch, e.g. "bg-cyan-500 dark:bg-cyan-400". */
  swatch: string;
  /** Light-mode hex fallback (SVG presentation attribute). Classes override it in
   *  healthy browsers; browsers with a stale/unsupported stylesheet still get a
   *  readable chart instead of default-black SVG. */
  hex?: string;
}

/**
 * Hand-rolled donut chart (dependency-free SVG). Pure: props in, themeable SVG
 * out. Renders a legend with counts and a graceful empty state when every slice
 * is zero. Colors are supplied by the caller as Tailwind class pairs so both
 * light and dark modes read correctly.
 */
export function Donut({
  slices,
  centerLabel,
  emptyLabel = "No data",
  centerValue,
  formatValue,
}: {
  slices: DonutSlice[];
  centerLabel?: string;
  emptyLabel?: string;
  /** Override the big center figure (default: raw total). Use for currency. */
  centerValue?: string;
  /** Format legend values (default: raw number). */
  formatValue?: (n: number) => string;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const r = 70;
  const stroke = 26;

  return (
    <div className="flex flex-wrap items-center gap-6">
      {/* width/height attributes + hex fills are FALLBACKS for browsers whose
          stylesheet is stale or lacks Tailwind v4 support — CSS classes override
          them in healthy browsers (presentation attrs lose to any CSS rule). */}
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={160}
        height={160}
        className="h-40 w-40 shrink-0"
        role="img"
        aria-label={centerLabel ?? "Breakdown chart"}
      >
        {/* Track ring (always visible — also the empty state). */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#faf6ea"
          strokeWidth={stroke}
          className="stroke-[var(--card-2)]"
        />

        {total > 0 &&
          renderArcs(slices, cx, cy, r, stroke)}

        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          fill="#16262e"
          className="fill-[var(--ink)] font-mono"
          fontSize={centerValue && centerValue.length > 8 ? 15 : 22}
          fontWeight={700}
        >
          {centerValue ?? total}
        </text>
        {centerLabel && (
          <text
            x={cx}
            y={cy + 16}
            textAnchor="middle"
            fill="#98937e"
            className="fill-[var(--faint)]"
            fontSize={11}
          >
            {centerLabel}
          </text>
        )}
      </svg>

      <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
        {total === 0 ? (
          <li className="text-faint">{emptyLabel}</li>
        ) : (
          slices.map((s) => (
            <li key={s.label} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-text">
                <span className={`inline-block h-2.5 w-2.5 rounded-sm ${s.swatch}`} />
                {s.label}
              </span>
              <span className="font-mono tabular-nums text-muted">
                {formatValue ? formatValue(s.value) : s.value}
                <span className="ml-1 text-xs text-faint">
                  {total > 0 ? `${Math.round((s.value / total) * 100)}%` : ""}
                </span>
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function renderArcs(
  slices: DonutSlice[],
  cx: number,
  cy: number,
  r: number,
  stroke: number,
) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  let angle = -Math.PI / 2; // start at 12 o'clock
  const arcs: React.ReactNode[] = [];
  slices.forEach((s, i) => {
    if (s.value <= 0) return;
    const frac = s.value / total;
    const end = angle + frac * Math.PI * 2;
    // A single full-circle slice can't be drawn as an arc (start==end); render a
    // full ring circle instead.
    if (frac >= 0.9999) {
      arcs.push(
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={s.hex ?? "#94a3b8"}
          strokeWidth={stroke}
          className={s.fill.replace("fill-", "stroke-")}
        />,
      );
    } else {
      const large = end - angle > Math.PI ? 1 : 0;
      const x1 = cx + r * Math.cos(angle);
      const y1 = cy + r * Math.sin(angle);
      const x2 = cx + r * Math.cos(end);
      const y2 = cy + r * Math.sin(end);
      arcs.push(
        <path
          key={i}
          d={`M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`}
          fill="none"
          stroke={s.hex ?? "#94a3b8"}
          strokeWidth={stroke}
          className={s.fill.replace("fill-", "stroke-")}
        />,
      );
    }
    angle = end;
  });
  return arcs;
}
