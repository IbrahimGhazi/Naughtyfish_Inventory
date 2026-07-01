import { describe, it, expect } from "vitest";
import {
  etaHint,
  statusColor,
  statusSortWeight,
  isShipmentStatus,
  STATUS_LABELS,
  SHIPMENT_STATUSES,
} from "./shipments";

// Fixed reference time so etaHint is deterministic (it must NOT read the clock).
const NOW = new Date("2026-07-02T12:00:00.000Z");
const H = 60 * 60 * 1000;
const D = 24 * H;

describe("etaHint", () => {
  it("reports a future ETA in days", () => {
    const eta = new Date(NOW.getTime() + 2 * D);
    expect(etaHint(eta, "in_transit", NOW)).toEqual({ text: "in 2 days", tone: "info" });
  });

  it("reports a future ETA in hours", () => {
    const eta = new Date(NOW.getTime() + 6 * H);
    expect(etaHint(eta, "in_transit", NOW)).toEqual({ text: "in 6 hours", tone: "info" });
  });

  it("uses the singular for exactly one day", () => {
    const eta = new Date(NOW.getTime() + 1 * D);
    expect(etaHint(eta, "preparing", NOW)).toEqual({ text: "in 1 day", tone: "info" });
  });

  it("flags an overdue (past) ETA as danger", () => {
    const eta = new Date(NOW.getTime() - 3 * H);
    expect(etaHint(eta, "in_transit", NOW)).toEqual({ text: "overdue by 3 hours", tone: "danger" });
  });

  it("always shows 'delivered' regardless of ETA", () => {
    const past = new Date(NOW.getTime() - 5 * D);
    expect(etaHint(past, "delivered", NOW)).toEqual({ text: "delivered", tone: "good" });
  });

  it("shows 'cancelled' for cancelled shipments", () => {
    expect(etaHint(NOW, "cancelled", NOW)).toEqual({ text: "cancelled", tone: "muted" });
  });

  it("handles a missing ETA", () => {
    expect(etaHint(null, "in_transit", NOW)).toEqual({ text: "no ETA", tone: "muted" });
    expect(etaHint(undefined, "preparing", NOW)).toEqual({ text: "no ETA", tone: "muted" });
  });

  it("accepts an ISO string ETA", () => {
    const iso = new Date(NOW.getTime() + 3 * D).toISOString();
    expect(etaHint(iso, "in_transit", NOW)).toEqual({ text: "in 3 days", tone: "info" });
  });

  it("treats an ETA at exactly now as due (in <1 minute)", () => {
    expect(etaHint(NOW, "in_transit", NOW)).toEqual({ text: "in less than a minute", tone: "info" });
  });

  it("does not read the system clock (identical inputs → identical output)", () => {
    const eta = new Date(NOW.getTime() + 2 * D);
    const a = etaHint(eta, "in_transit", NOW);
    const b = etaHint(eta, "in_transit", NOW);
    expect(a).toEqual(b);
    expect(a).toEqual({ text: "in 2 days", tone: "info" });
  });
});

describe("statusColor", () => {
  it("returns dark-aware classes for every known status", () => {
    for (const s of SHIPMENT_STATUSES) {
      const cls = statusColor(s);
      expect(cls).toContain("dark:");
      expect(cls.length).toBeGreaterThan(0);
    }
  });

  it("falls back to a neutral chip for unknown values", () => {
    expect(statusColor("bogus")).toContain("dark:");
  });
});

describe("statusSortWeight", () => {
  it("orders attention-needing statuses first", () => {
    const order = [...SHIPMENT_STATUSES].sort((a, b) => statusSortWeight(a) - statusSortWeight(b));
    expect(order).toEqual(["delayed", "in_transit", "preparing", "delivered", "cancelled"]);
  });
});

describe("labels + guard", () => {
  it("has a label for every status", () => {
    for (const s of SHIPMENT_STATUSES) expect(STATUS_LABELS[s]).toBeTruthy();
  });
  it("guards status strings", () => {
    expect(isShipmentStatus("in_transit")).toBe(true);
    expect(isShipmentStatus("nope")).toBe(false);
  });
});
