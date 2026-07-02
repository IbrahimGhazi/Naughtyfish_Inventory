"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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

/** One shipment, fully serialized on the server (no Dates/Decimals/functions). */
export interface TrackedShipment {
  id: string;
  reference: string;
  destCity: string;
  originXY: Pt;
  destXY: Pt;
  status: string;
  statusLabel: string;
  etaLabel: string | null; // "03 Jul" (already formatted) or null
  etaHint: string; // "arrives tomorrow"
  etaTone: "muted" | "info" | "warn" | "danger" | "good";
  carrier: string | null;
  consignee: string | null;
  note: string | null;
  prog: number; // 0–100
}

type Filter = "active" | "delivered" | "all";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "delivered", label: "Delivered" },
  { key: "all", label: "All" },
];

/** Status pill colours — semantic tokens so they flip in dark mode. */
function chipStyle(status: string): React.CSSProperties {
  switch (status) {
    case "in_transit":
      return { background: "var(--accent-tint)", color: "var(--accent-deep)" };
    case "preparing":
      return { background: "var(--warn-bg)", color: "var(--warn)" };
    case "delayed":
      return { background: "var(--neg-bg)", color: "var(--neg)" };
    case "delivered":
      return { background: "var(--pos-bg)", color: "var(--pos)" };
    default:
      return { background: "var(--neutral-bg)", color: "var(--neutral)" };
  }
}

/** ETA-hint text colour by tone. */
function hintColor(tone: TrackedShipment["etaTone"]): string {
  switch (tone) {
    case "danger":
      return "var(--neg)";
    case "warn":
      return "var(--warn)";
    case "good":
      return "var(--pos)";
    case "info":
      return "var(--muted)";
    default:
      return "var(--faint)";
  }
}

const Pill = ({ status, label }: { status: string; label: string }) => (
  <span
    className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
    style={chipStyle(status)}
  >
    {label}
  </span>
);

export default function ShipmentTracker({
  shipments,
  originCity = "Karachi",
  showContextCities = true,
}: {
  shipments: TrackedShipment[];
  /** White-label: dispatch origin (platform config). */
  originCity?: string;
  showContextCities?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("active");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      shipments.filter((s) => {
        if (filter === "all") return true;
        if (filter === "delivered") return s.status === "delivered";
        return s.status !== "delivered" && s.status !== "cancelled";
      }),
    [shipments, filter],
  );

  // Selected shipment is derived — falls back to the first row so a filter
  // switch never leaves a stale/empty selection.
  const sel = filtered.find((s) => s.id === selectedId) ?? filtered[0] ?? null;

  const d = borderPath();
  const destCitySet = new Set(filtered.map((s) => s.destCity));
  const originGeo = CITIES.find((c) => c.name === originCity);
  const originXY = originGeo ? project(originGeo.lng, originGeo.lat) : KARACHI_XY;
  const selColor = sel ? mapColor(sel.status) : null;

  return (
    <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[minmax(0,1fr)_340px]">
      {/* ---------- Map ---------- */}
      <div
        data-testid="ship-map"
        className="animate-rise relative overflow-hidden rounded-2xl border border-hair bg-card"
      >
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

          {/* Routes */}
          {filtered.map((s) => {
            const meta = cityMeta(s.destCity);
            const q = controlPoint(s.originXY, s.destXY, meta.bow);
            const path = curvePath(s.originXY, q, s.destXY);
            const mk = pointOnCurve(s.originXY, q, s.destXY, s.prog / 100);
            const col = mapColor(s.status);
            const isSel = sel?.id === s.id;
            const dim = !!sel && !isSel;
            const moving = s.status === "in_transit" || s.status === "delayed";
            const delivered = s.status === "delivered";
            return (
              <g
                key={`route-${s.id}`}
                onClick={() => setSelectedId(s.id)}
                style={{ cursor: "pointer" }}
              >
                {/* Fat invisible hit area */}
                <path d={path} fill="none" stroke="transparent" strokeWidth={20} style={{ pointerEvents: "stroke" }} />
                {/* Visible bowed route */}
                <path
                  d={path}
                  fill="none"
                  stroke={col.hex}
                  strokeWidth={isSel ? 3.4 : 2}
                  strokeLinecap="round"
                  strokeDasharray={delivered ? undefined : "7 6"}
                  style={{
                    stroke: col.token,
                    opacity: dim ? 0.3 : delivered ? 0.55 : 0.95,
                    transition: "opacity .25s, stroke-width .25s",
                    animation: moving
                      ? `dashFlow ${s.status === "delayed" ? "2.4s" : "1.2s"} linear infinite`
                      : undefined,
                  }}
                />
                {/* Pulsing halo on the selected, still-moving marker */}
                {isSel && moving && (
                  <circle
                    cx={mk.x}
                    cy={mk.y}
                    r={7}
                    fill={col.hex}
                    style={{
                      fill: col.token,
                      transformBox: "fill-box",
                      transformOrigin: "center",
                      animation: "svgPulse 1.9s ease-out infinite",
                    }}
                  />
                )}
                {/* Moving marker (hidden once delivered) */}
                {!delivered && (
                  <circle
                    cx={mk.x}
                    cy={mk.y}
                    r={isSel ? 7 : 5}
                    fill={col.hex}
                    stroke="#fdfbf4"
                    className="stroke-[var(--card)]"
                    strokeWidth={2}
                    style={{ fill: col.token, opacity: dim ? 0.35 : 1, transition: "opacity .25s" }}
                  />
                )}
              </g>
            );
          })}

          {/* Destination markers + labels */}
          {filtered.map((s) => {
            const meta = cityMeta(s.destCity);
            const col = mapColor(s.status);
            const isSel = sel?.id === s.id;
            const lx = s.destXY.x + meta.ldx;
            const ly = s.destXY.y + meta.ldy;
            const ey = meta.ldy < 0 ? ly - 13 : ly + 14;
            return (
              <g
                key={`dest-${s.id}`}
                onClick={() => setSelectedId(s.id)}
                style={{ cursor: "pointer" }}
              >
                <circle
                  cx={s.destXY.x}
                  cy={s.destXY.y}
                  r={9}
                  fill="none"
                  stroke={col.hex}
                  strokeWidth={1.5}
                  style={{ stroke: col.token, opacity: isSel ? 0.9 : 0.4, transition: "opacity .25s" }}
                />
                <circle cx={s.destXY.x} cy={s.destXY.y} r={4.5} fill={col.hex} style={{ fill: col.token }} />
                <text
                  x={lx}
                  y={ly}
                  textAnchor={meta.anchor}
                  fill="#16262e"
                  className="fill-[var(--ink)]"
                  fontSize={13}
                  fontWeight={isSel ? 700 : 600}
                  style={{ paintOrder: "stroke", stroke: "var(--card)", strokeWidth: 3 }}
                >
                  {s.destCity}
                </text>
                {isSel && s.etaLabel && (
                  <text
                    x={lx}
                    y={ey}
                    textAnchor={meta.anchor}
                    fill="#5f6b60"
                    className="fill-[var(--muted)] font-mono"
                    fontSize={10.5}
                    style={{ paintOrder: "stroke", stroke: "var(--card)", strokeWidth: 3 }}
                  >
                    ETA {s.etaLabel}
                  </text>
                )}
              </g>
            );
          })}

          {/* Origin (config-driven) */}
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

        {/* Floating detail card (over the map, always dark ink). */}
        {sel && selColor && (
          <div
            data-testid="ship-detail-card"
            className="animate-pop absolute left-3.5 top-3.5 w-[248px] max-w-[calc(100%-1.75rem)] rounded-xl p-4"
            style={{
              background: "rgba(13,31,38,.93)",
              backdropFilter: "blur(4px)",
              color: "var(--side-fg)",
              boxShadow: "var(--shadow-pop)",
            }}
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px]" style={{ color: "#d9b98a" }}>
                {sel.reference}
              </span>
              <div className="flex-1" />
              <Pill status={sel.status} label={sel.statusLabel} />
            </div>
            <div className="mt-1.5 font-serif text-[18px] font-semibold">{originCity} → {sel.destCity}</div>
            <div className="mt-0.5 text-[11.5px]" style={{ color: "var(--side-dim)" }}>
              {[sel.carrier, sel.consignee].filter(Boolean).join(" · ") || "—"}
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: "rgba(242,235,217,.16)" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${sel.prog}%`, background: selColor.token, transition: "width .4s" }}
                />
              </div>
              <span className="font-mono text-[11px]" style={{ color: "var(--side-fg)" }}>
                {sel.prog}%
              </span>
            </div>
            <div className="mt-1.5 text-[11.5px]" style={{ color: "var(--side-dim)" }}>
              {sel.status === "delivered" ? "Delivered" : "ETA"} {sel.etaLabel ?? "—"}
              {sel.etaHint ? ` · ${sel.etaHint}` : ""}
            </div>
            {sel.note && (
              <div className="mt-2 text-[11.5px] leading-relaxed" style={{ color: "#e5a492" }}>
                ⚠ {sel.note}
              </div>
            )}
            <Link
              href={`/shipments/${sel.id}`}
              className="mt-2.5 inline-block text-[12px] font-semibold"
              style={{ color: "#8fd6d0" }}
            >
              View details →
            </Link>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="rounded-md border border-hair bg-card px-3 py-1.5 text-sm text-muted shadow-sm">
              No {filter === "all" ? "" : filter} shipments
            </span>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 border-t border-row px-4 py-2.5 text-[11.5px] text-muted">
          {MAP_LEGEND.map((l) => (
            <span key={l.status} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: mapColor(l.status).token }}
              />
              {l.label}
            </span>
          ))}
          <div className="flex-1" />
          <span className="text-faint">click a route or row to inspect</span>
        </div>
      </div>

      {/* ---------- Filter + rail ---------- */}
      <div className="flex flex-col gap-2.5">
        <div className="flex gap-1.5" data-testid="ship-filters">
          {FILTERS.map((f) => {
            const on = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                data-testid={`ship-filter-${f.key}`}
                className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                  on ? "border-transparent text-on-accent" : "border-hair bg-card text-muted hover:bg-card2"
                }`}
                style={on ? { background: "var(--accent)" } : undefined}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <p className="px-1 text-sm text-faint">Nothing to show in this filter.</p>
        ) : (
          filtered.map((s, i) => {
            const isSel = sel?.id === s.id;
            const col = mapColor(s.status);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedId(s.id)}
                data-testid={`ship-rail-row-${s.id}`}
                className="animate-rise block rounded-xl border bg-card p-3 text-left transition-shadow"
                style={{
                  borderColor: isSel ? "var(--accent)" : "var(--hair)",
                  boxShadow: isSel ? "var(--shadow-card)" : undefined,
                  animationDelay: `${Math.min(i * 50, 400)}ms`,
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-gold">{s.reference}</span>
                  <div className="flex-1" />
                  <Pill status={s.status} label={s.statusLabel} />
                </div>
                <div className="mt-1.5 text-[13.5px] font-semibold text-text">{originCity} → {s.destCity}</div>
                <div className="mt-2 flex items-center gap-2.5">
                  <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-row">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${s.prog}%`, background: col.token }}
                    />
                  </div>
                  <span className="shrink-0 text-[11px]" style={{ color: hintColor(s.etaTone) }}>
                    {s.etaHint}
                  </span>
                </div>
                <div className="mt-1.5 text-[11px] text-faint">
                  {[s.carrier, s.consignee].filter(Boolean).join(" · ") || "—"}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
