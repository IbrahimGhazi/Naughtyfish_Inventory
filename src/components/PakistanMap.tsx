import { borderPath, project, CITIES, MAP_W, MAP_H } from "@/lib/geo";
import {
  KARACHI_XY,
  cityMeta,
  controlPoint,
  curvePath,
  pointOnCurve,
  mapColor,
  MAP_LEGEND,
  type Pt,
} from "@/lib/mapgeo";

/** A shipment route already projected into map coordinates (serializable). */
export interface MapRoute {
  id: string;
  originXY: Pt;
  destXY: Pt;
  destCity: string; // for curve-bow / label lookup
  status: string; // preparing | in_transit | delayed | delivered
  label: string; // destination city name
  eta: string | null; // formatted ETA date, already a string
  prog: number; // 0–100 progress along the route
}

/**
 * Static Pakistan map with shipment routes drawn as bowed, dashed curves from
 * Karachi → destination, each with a marker riding the curve at its progress and
 * a labelled destination pin. Pure server component: serialized props in,
 * themeable SVG out. Colours use semantic tokens (dark-mode aware) with light
 * hex fallbacks on the presentation attributes so a dead stylesheet still reads.
 *
 * The interactive sibling (selection, rail, detail card) is ShipmentTracker.
 */
export function PakistanMap({
  routes,
  originCity = "Karachi",
  showContextCities = true,
}: {
  routes: MapRoute[];
  /** White-label: the dispatch origin (platform config), default Karachi. */
  originCity?: string;
  showContextCities?: boolean;
}) {
  const d = borderPath();
  const destCitySet = new Set(routes.map((r) => r.destCity));
  const originGeo = CITIES.find((c) => c.name === originCity);
  const originXY: Pt = originGeo ? project(originGeo.lng, originGeo.lat) : KARACHI_XY;

  return (
    <div>
      <div className="relative mx-auto max-w-3xl">
        <svg
          viewBox={`0 0 ${MAP_W} ${MAP_H}`}
          width="100%"
          className="block h-auto w-full"
          role="img"
          aria-label="Shipment tracker map of Pakistan"
        >
          {/* Landmass */}
          <path
            d={d}
            fill="#faf6ea"
            stroke="#e4dbc5"
            className="fill-[var(--card-2)] stroke-[var(--hair)]"
            strokeWidth={2}
            strokeLinejoin="round"
          />

          {/* Context cities (non-destinations) as faint reference dots. */}
          {showContextCities && CITIES.filter((c) => c.name !== originCity && !destCitySet.has(c.name)).map((c) => {
            const p = project(c.lng, c.lat);
            return (
              <g key={`ctx-${c.name}`}>
                <circle cx={p.x} cy={p.y} r={3.5} fill="#c9be9f" className="fill-[var(--hair)]" />
                <text
                  x={p.x + 10}
                  y={p.y + 4}
                  fill="#a79d82"
                  className="fill-[var(--faint)]"
                  fontSize={12.5}
                  style={{ paintOrder: "stroke", stroke: "var(--card)", strokeWidth: 3 }}
                >
                  {c.name}
                </text>
              </g>
            );
          })}

          {/* Routes + markers */}
          {routes.map((r) => {
            const meta = cityMeta(r.destCity);
            const q = controlPoint(r.originXY, r.destXY, meta.bow);
            const path = curvePath(r.originXY, q, r.destXY);
            const mk = pointOnCurve(r.originXY, q, r.destXY, r.prog / 100);
            const col = mapColor(r.status);
            const moving = r.status === "in_transit" || r.status === "delayed";
            const delivered = r.status === "delivered";
            const lx = r.destXY.x + meta.ldx;
            const ly = r.destXY.y + meta.ldy;
            return (
              <g key={r.id}>
                <path
                  d={path}
                  fill="none"
                  stroke={col.hex}
                  strokeWidth={2.4}
                  strokeLinecap="round"
                  strokeDasharray={delivered ? undefined : "7 6"}
                  style={{
                    stroke: col.token,
                    opacity: delivered ? 0.55 : 0.95,
                    animation: moving
                      ? `dashFlow ${r.status === "delayed" ? "2.4s" : "1.2s"} linear infinite`
                      : undefined,
                  }}
                />
                {!delivered && (
                  <circle
                    cx={mk.x}
                    cy={mk.y}
                    r={5}
                    fill={col.hex}
                    stroke="#fdfbf4"
                    className="stroke-[var(--card)]"
                    strokeWidth={2}
                    style={{ fill: col.token }}
                  />
                )}
                <circle
                  cx={r.destXY.x}
                  cy={r.destXY.y}
                  r={9}
                  fill="none"
                  stroke={col.hex}
                  strokeWidth={1.5}
                  style={{ stroke: col.token, opacity: 0.5 }}
                />
                <circle cx={r.destXY.x} cy={r.destXY.y} r={4.5} fill={col.hex} style={{ fill: col.token }} />
                <text
                  x={lx}
                  y={ly}
                  textAnchor={meta.anchor}
                  fill="#16262e"
                  className="fill-[var(--ink)]"
                  fontSize={13}
                  fontWeight={600}
                  style={{ paintOrder: "stroke", stroke: "var(--card)", strokeWidth: 3 }}
                >
                  {r.label}
                </text>
                {r.eta && (
                  <text
                    x={lx}
                    y={meta.ldy < 0 ? ly - 13 : ly + 14}
                    textAnchor={meta.anchor}
                    fill="#5f6b60"
                    className="fill-[var(--muted)] font-mono"
                    fontSize={10.5}
                    style={{ paintOrder: "stroke", stroke: "var(--card)", strokeWidth: 3 }}
                  >
                    ETA {r.eta}
                  </text>
                )}
              </g>
            );
          })}

          {/* Origin (config-driven; not every customer ships out of Karachi) */}
          <g>
            <circle
              cx={originXY.x}
              cy={originXY.y}
              r={10}
              fill="none"
              stroke="#16262e"
              className="stroke-[var(--ink)]"
              strokeWidth={1.2}
              opacity={0.35}
            />
            <circle cx={originXY.x} cy={originXY.y} r={5} fill="#16262e" className="fill-[var(--ink)]" />
            <text
              x={originXY.x}
              y={originXY.y + 26}
              textAnchor="middle"
              fill="#16262e"
              className="fill-[var(--ink)]"
              fontSize={12.5}
              fontWeight={700}
              style={{ paintOrder: "stroke", stroke: "var(--card)", strokeWidth: 3 }}
            >
              {originCity}
            </text>
          </g>
        </svg>

        {routes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="rounded-md border border-hair bg-card px-3 py-1.5 text-sm text-muted shadow-sm">
              No active shipments
            </span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-faint">
        {MAP_LEGEND.map((l) => (
          <span key={l.status} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: mapColor(l.status).token }}
            />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
