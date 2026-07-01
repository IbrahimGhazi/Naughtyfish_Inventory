/**
 * Shipment domain helpers — pure, framework-free, deterministically testable.
 *
 * status values match prisma/schema.prisma Shipment.status:
 *   "preparing" | "in_transit" | "delivered" | "delayed" | "cancelled"
 *
 * IMPORTANT: etaHint() takes the current time as an explicit third parameter and
 * NEVER reads the system clock — so it is pure and unit-testable with a fixed
 * reference time (see src/lib/shipments.test.ts).
 */

export const SHIPMENT_STATUSES = [
  "preparing",
  "in_transit",
  "delivered",
  "delayed",
  "cancelled",
] as const;

export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

/** Human-readable labels for each status. */
export const STATUS_LABELS: Record<ShipmentStatus, string> = {
  preparing: "Preparing",
  in_transit: "In transit",
  delivered: "Delivered",
  delayed: "Delayed",
  cancelled: "Cancelled",
};

/** True when the value is one of the allowed status strings. */
export function isShipmentStatus(v: string): v is ShipmentStatus {
  return (SHIPMENT_STATUSES as readonly string[]).includes(v);
}

/**
 * Tailwind chip classes per status (light + dark aware). Returns a single string
 * safe to drop onto a <span>. Unknown values fall back to the neutral slate chip.
 */
export function statusColor(status: string): string {
  switch (status) {
    case "preparing":
      return "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
    case "in_transit":
      return "bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300";
    case "delivered":
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
    case "delayed":
      return "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300";
    case "cancelled":
      return "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  }
}

export type EtaTone = "muted" | "info" | "warn" | "danger" | "good";

export interface EtaHint {
  text: string;
  tone: EtaTone;
}

const MS_PER_MIN = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MIN;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/**
 * Relative ETA hint for a shipment.
 *
 * @param estimatedArrivalAt the ETA (or null/undefined if not set)
 * @param status             current shipment status
 * @param now                the reference "current time" — PASSED IN, never read
 *                           from the system clock (keeps this pure/testable)
 * @returns {text, tone} e.g. "in 2 days" / "overdue by 3 hours" / "delivered"
 *
 * - delivered  → always "delivered" (good), regardless of ETA
 * - cancelled  → always "cancelled" (muted)
 * - no ETA set → "no ETA" (muted)
 * - future ETA → "in <n> minutes/hours/days" (info)
 * - past ETA   → "overdue by <n> …" (danger) — the shipment hasn't arrived yet
 */
export function etaHint(
  estimatedArrivalAt: Date | string | null | undefined,
  status: string,
  now: Date,
): EtaHint {
  if (status === "delivered") return { text: "delivered", tone: "good" };
  if (status === "cancelled") return { text: "cancelled", tone: "muted" };
  if (estimatedArrivalAt == null) return { text: "no ETA", tone: "muted" };

  const eta = estimatedArrivalAt instanceof Date ? estimatedArrivalAt : new Date(estimatedArrivalAt);
  const etaMs = eta.getTime();
  if (Number.isNaN(etaMs)) return { text: "no ETA", tone: "muted" };

  const diff = etaMs - now.getTime(); // >0 future, <0 past

  if (diff >= 0) {
    return { text: `in ${relative(diff)}`, tone: "info" };
  }
  return { text: `overdue by ${relative(-diff)}`, tone: "danger" };
}

/** Format a positive millisecond span as a coarse "N unit(s)" string. */
function relative(ms: number): string {
  if (ms < MS_PER_MIN) return "less than a minute";
  if (ms < MS_PER_HOUR) return plural(Math.round(ms / MS_PER_MIN), "minute");
  if (ms < MS_PER_DAY) return plural(Math.round(ms / MS_PER_HOUR), "hour");
  return plural(Math.round(ms / MS_PER_DAY), "day");
}

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

/**
 * Ordering weight so the list can sort active/attention-needing shipments first.
 * Lower sorts earlier: delayed < in_transit < preparing < delivered < cancelled.
 */
export function statusSortWeight(status: string): number {
  switch (status) {
    case "delayed":
      return 0;
    case "in_transit":
      return 1;
    case "preparing":
      return 2;
    case "delivered":
      return 3;
    case "cancelled":
      return 4;
    default:
      return 5;
  }
}

/** The forward status flow shown as a visual timeline on the detail page. */
export const STATUS_TIMELINE: ShipmentStatus[] = ["preparing", "in_transit", "delivered"];
