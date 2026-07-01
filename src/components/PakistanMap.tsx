import { borderPath, project, CITIES, MAP_W, MAP_H } from "@/lib/geo";

/** A shipment route already projected into map coordinates (serializable). */
export interface MapRoute {
  id: string;
  originXY: { x: number; y: number } | null;
  destXY: { x: number; y: number };
  status: string; // preparing | in_transit | delayed | delivered
  label: string; // destination city (+ short hint)
  eta: string | null; // formatted ETA date, already a string
}

/** Status → Tailwind class pairs (fill/stroke/text), light + dark aware, plus
 *  light-mode hex FALLBACKS used as SVG presentation attributes — classes
 *  override them in healthy browsers; stale/unsupported stylesheets still get
 *  a readable light map instead of default-black SVG. */
const STATUS_STYLE: Record<
  string,
  {
    dot: string;
    line: string;
    text: string;
    legendSwatch: string;
    name: string;
    hex: string;
    textHex: string;
  }
> = {
  in_transit: {
    dot: "fill-cyan-500 dark:fill-cyan-400",
    line: "stroke-cyan-500 dark:stroke-cyan-400",
    text: "fill-cyan-700 dark:fill-cyan-300",
    legendSwatch: "bg-cyan-500 dark:bg-cyan-400",
    name: "In transit",
    hex: "#06b6d4",
    textHex: "#0e7490",
  },
  preparing: {
    dot: "fill-slate-400 dark:fill-slate-500",
    line: "stroke-slate-400 dark:stroke-slate-500",
    text: "fill-slate-600 dark:fill-slate-300",
    legendSwatch: "bg-slate-400 dark:bg-slate-500",
    name: "Preparing",
    hex: "#94a3b8",
    textHex: "#475569",
  },
  delayed: {
    dot: "fill-amber-500 dark:fill-amber-400",
    line: "stroke-amber-500 dark:stroke-amber-400",
    text: "fill-amber-700 dark:fill-amber-300",
    legendSwatch: "bg-amber-500 dark:bg-amber-400",
    name: "Delayed",
    hex: "#f59e0b",
    textHex: "#b45309",
  },
  delivered: {
    dot: "fill-emerald-500 dark:fill-emerald-400",
    line: "stroke-emerald-500 dark:stroke-emerald-400",
    text: "fill-emerald-700 dark:fill-emerald-300",
    legendSwatch: "bg-emerald-500 dark:bg-emerald-400",
    name: "Delivered",
    hex: "#10b981",
    textHex: "#047857",
  },
};

function styleFor(status: string) {
  return STATUS_STYLE[status] ?? STATUS_STYLE.preparing;
}

/** Legend statuses shown under the map (in a stable order). */
const LEGEND_ORDER = ["in_transit", "preparing", "delayed", "delivered"] as const;

/**
 * Rendered map of Pakistan with active shipment routes plotted as dashed lines
 * from origin → destination city, each marked by a status-colored dot and label.
 * Pure server component: props in, themeable SVG out. Land + borders theme via
 * Tailwind dark: variants; hardcoded #fff/#000 avoided.
 */
export function PakistanMap({ routes }: { routes: MapRoute[] }) {
  const d = borderPath();
  const hasRoutes = routes.length > 0;

  return (
    <div>
      {/* max-w caps the map at large desktop widths; hex fills/strokes are
          fallback presentation attributes (any CSS class overrides them). */}
      <div className="relative mx-auto max-w-3xl">
        <svg
          viewBox={`0 0 ${MAP_W} ${MAP_H}`}
          width="100%"
          className="h-auto w-full"
          role="img"
          aria-label="Shipment tracker map of Pakistan"
        >
          {/* Country landmass. */}
          <path
            d={d}
            fill="#f1f5f9"
            stroke="#cbd5e1"
            className="fill-slate-100 stroke-slate-300 dark:fill-slate-800 dark:stroke-slate-700"
            strokeWidth={2}
            strokeLinejoin="round"
          />

          {/* City reference dots + faint labels. */}
          {CITIES.map((c) => {
            const { x, y } = project(c.lng, c.lat);
            return (
              <g key={c.name}>
                <circle
                  cx={x}
                  cy={y}
                  r={4}
                  fill="#cbd5e1"
                  className="fill-slate-300 dark:fill-slate-600"
                />
                <text
                  x={x + 7}
                  y={y + 4}
                  fill="#94a3b8"
                  className="fill-slate-400 dark:fill-slate-500"
                  fontSize={13}
                >
                  {c.name}
                </text>
              </g>
            );
          })}

          {/* Shipment routes: dashed origin → dest line + destination marker. */}
          {routes.map((r) => {
            const st = styleFor(r.status);
            return (
              <g key={r.id}>
                {r.originXY && (
                  <line
                    x1={r.originXY.x}
                    y1={r.originXY.y}
                    x2={r.destXY.x}
                    y2={r.destXY.y}
                    stroke={st.hex}
                    className={st.line}
                    strokeWidth={2.5}
                    strokeDasharray="8 6"
                    strokeLinecap="round"
                    opacity={0.85}
                  />
                )}
                {r.originXY && (
                  <circle
                    cx={r.originXY.x}
                    cy={r.originXY.y}
                    r={5}
                    fill="#ffffff"
                    stroke="#94a3b8"
                    className="fill-white stroke-slate-400 dark:fill-slate-900 dark:stroke-slate-500"
                    strokeWidth={2}
                  />
                )}
                {/* Destination marker: a halo + solid dot for emphasis. */}
                <circle
                  cx={r.destXY.x}
                  cy={r.destXY.y}
                  r={11}
                  fill={st.hex}
                  className={st.dot}
                  opacity={0.18}
                />
                <circle
                  cx={r.destXY.x}
                  cy={r.destXY.y}
                  r={6}
                  fill={st.hex}
                  stroke="#ffffff"
                  className={`${st.dot} stroke-white dark:stroke-slate-900`}
                  strokeWidth={2}
                />
                <text
                  x={r.destXY.x + 10}
                  y={r.destXY.y - 10}
                  fill={st.textHex}
                  className={st.text}
                  fontSize={14}
                  fontWeight={700}
                >
                  {r.label}
                </text>
                {r.eta && (
                  <text
                    x={r.destXY.x + 10}
                    y={r.destXY.y + 6}
                    fill="#64748b"
                    className="fill-slate-500 dark:fill-slate-400"
                    fontSize={12}
                  >
                    ETA {r.eta}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {!hasRoutes && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="rounded-md bg-white/80 px-3 py-1.5 text-sm text-slate-500 shadow-sm dark:bg-slate-900/80 dark:text-slate-400">
              No active shipments
            </span>
          </div>
        )}
      </div>

      {/* Legend. */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
        {LEGEND_ORDER.map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${styleFor(s).legendSwatch}`} />
            {styleFor(s).name}
          </span>
        ))}
      </div>
    </div>
  );
}
