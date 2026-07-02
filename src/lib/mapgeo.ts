/**
 * Shipment-map geometry — pure helpers shared by the dashboard map
 * (src/components/PakistanMap.tsx) and the interactive Shipments tracker
 * (src/components/ShipmentTracker.tsx).
 *
 * Coordinates live in the geo.ts viewBox (MAP_W × MAP_H). Routes are drawn as
 * quadratic Béziers that bow away from the straight line so they fan out and
 * twin cities (Islamabad/Rawalpindi) don't collide. A moving marker rides the
 * curve at the shipment's progress fraction.
 *
 * Everything here is deterministic and framework-free — `progressFor` takes the
 * current time as an explicit argument and never reads the system clock.
 */

import { project } from "./geo";

export interface Pt {
  x: number;
  y: number;
}

/** Karachi — the origin every dispatch leaves from (projected once). */
export const KARACHI_XY: Pt = project(67.01, 24.86);

/**
 * Per-destination presentation tuning for the 1000×920 viewBox:
 *   bow    — perpendicular curve offset (sign chooses which way the arc bends)
 *   anchor — text-anchor for the city label
 *   ldx/ldy— label offset from the city dot
 * Northern destinations fan out; twin cities bow opposite ways. Unknown cities
 * fall back to DEFAULT_META.
 */
export interface CityMeta {
  bow: number;
  anchor: "start" | "middle" | "end";
  ldx: number;
  ldy: number;
}

export const DEFAULT_META: CityMeta = { bow: 20, anchor: "start", ldx: 15, ldy: 5 };

export const CITY_META: Record<string, CityMeta> = {
  Lahore: { bow: 50, anchor: "start", ldx: 15, ldy: 6 },
  Faisalabad: { bow: 26, anchor: "start", ldx: 15, ldy: 20 },
  Multan: { bow: -14, anchor: "start", ldx: 15, ldy: 6 },
  // Twin cities ~20 km apart — push labels opposite ways so they don't collide.
  Islamabad: { bow: 12, anchor: "start", ldx: 13, ldy: -7 },
  Rawalpindi: { bow: -32, anchor: "end", ldx: -13, ldy: 17 },
  Peshawar: { bow: -56, anchor: "end", ldx: -15, ldy: -6 },
  Quetta: { bow: 30, anchor: "end", ldx: -15, ldy: 4 },
  Sukkur: { bow: 14, anchor: "start", ldx: 15, ldy: 5 },
  Hyderabad: { bow: -10, anchor: "start", ldx: 15, ldy: 14 },
  Gwadar: { bow: 18, anchor: "end", ldx: -15, ldy: 4 },
};

export function cityMeta(name: string | null | undefined): CityMeta {
  return (name && CITY_META[name]) || DEFAULT_META;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Control point for a quadratic Bézier bowed `bow` px off the origin→dest line. */
export function controlPoint(o: Pt, c: Pt, bow: number): Pt {
  const dx = c.x - o.x;
  const dy = c.y - o.y;
  const len = Math.hypot(dx, dy) || 1;
  return {
    x: (o.x + c.x) / 2 - (dy / len) * bow,
    y: (o.y + c.y) / 2 + (dx / len) * bow,
  };
}

/** SVG path `d` for the bowed route origin → dest via control point q. */
export function curvePath(o: Pt, q: Pt, c: Pt): string {
  return `M ${r1(o.x)} ${r1(o.y)} Q ${r1(q.x)} ${r1(q.y)} ${r1(c.x)} ${r1(c.y)}`;
}

/** Point on the quadratic Bézier at parameter t ∈ [0,1]. */
export function pointOnCurve(o: Pt, q: Pt, c: Pt, t: number): Pt {
  const mt = 1 - t;
  return {
    x: mt * mt * o.x + 2 * mt * t * q.x + t * t * c.x,
    y: mt * mt * o.y + 2 * mt * t * q.y + t * t * c.y,
  };
}

/**
 * How far along the route a shipment is, 0–100.
 * Prefers real elapsed time (departure → ETA) when both timestamps exist;
 * otherwise falls back to a status-derived estimate. Clamped to a visible band
 * so the marker never sits exactly on the origin or destination.
 */
export function progressFor(
  status: string,
  departureAt: Date | string | null | undefined,
  eta: Date | string | null | undefined,
  now: Date,
): number {
  if (status === "delivered") return 100;
  if (status === "cancelled") return 0;

  const dep = departureAt ? new Date(departureAt).getTime() : NaN;
  const arr = eta ? new Date(eta).getTime() : NaN;
  if (!Number.isNaN(dep) && !Number.isNaN(arr) && arr > dep) {
    const frac = (now.getTime() - dep) / (arr - dep);
    const pct = Math.round(frac * 100);
    const ceiling = status === "delayed" ? 88 : 94;
    return Math.max(6, Math.min(ceiling, pct));
  }

  switch (status) {
    case "in_transit":
      return 62;
    case "delayed":
      return 72;
    case "preparing":
      return 8;
    default:
      return 20;
  }
}

/**
 * Route/marker colour per status, as a semantic token (flips in dark mode) with
 * a light-mode hex FALLBACK for the presentation attribute — so a stale or
 * unsupported stylesheet still renders a legible map instead of default black.
 */
export function mapColor(status: string): { token: string; hex: string } {
  switch (status) {
    case "in_transit":
      return { token: "var(--accent)", hex: "#0e7c7b" };
    case "delayed":
      return { token: "var(--neg)", hex: "#c2492f" };
    case "delivered":
      return { token: "var(--pos)", hex: "#337a54" };
    case "preparing":
      return { token: "var(--map-prep)", hex: "#c08a28" };
    default:
      return { token: "var(--faint)", hex: "#98937e" };
  }
}

/** Statuses shown in the map legend, in a stable order. */
export const MAP_LEGEND: { status: string; label: string }[] = [
  { status: "in_transit", label: "In transit" },
  { status: "preparing", label: "Preparing" },
  { status: "delayed", label: "Delayed" },
  { status: "delivered", label: "Delivered" },
];
