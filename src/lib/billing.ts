/**
 * NaughtyFish — Billing Engine (the crown jewel)
 * ------------------------------------------------
 * Per IMPLEMENTATION-PLAN.md §6, ALL invoice/delivery math lives in this ONE
 * shared module. Both the office web screens and the delivery phone screen call
 * these functions so buyers can never be shown a different number than the
 * office records.
 *
 * Core rules:
 *   net_weight_kg = gross_weight_kg × (1 − glazing% / 100)     (proportional)
 *   line_amount   = rate_per_kg × net_weight_kg
 *   invoice_total = Σ line_amount
 *
 * PRIMARY (North) input path: gross + FINAL(net) weight → glazing% is DERIVED.
 * SECONDARY / Local path:     gross + glazing%          → net is derived.
 * Local (Karachi, fresh):     glazing% = 0, net = gross.
 * Prawn override:             ~50% water; net ≈ gross × 0.5 (item-level default).
 *
 * NOTE: no rate is stated anywhere in the source transcript — rates are master
 * data to be confirmed with the owner. Nothing here hardcodes a rate.
 */

export type Channel = "north" | "local";

/** Default water fraction for prawn/shrimp boxes when no measured weight/% is given.
 *  The audio's exact prawn figures are contradictory (see plan §6 / Open Questions);
 *  this is a confirmable default, not a fact. */
export const PRAWN_DEFAULT_WATER_PERCENT = 50;

/** How far a party's measured glazing% may exceed its expected baseline before we alert. */
export const DEFAULT_VARIANCE_TOLERANCE_PCT = 0;

// ---------------------------------------------------------------------------
// Rounding helpers — money to 2 dp (paisa), weight to 3 dp (grams), % to 2 dp.
// Half-up rounding on a cents/grams basis to avoid binary-float drift.
// ---------------------------------------------------------------------------

export function roundMoney(x: number): number {
  return Math.round((x + Number.EPSILON) * 100) / 100;
}

export function roundKg(x: number): number {
  return Math.round((x + Number.EPSILON) * 1000) / 1000;
}

export function roundPercent(x: number): number {
  return Math.round((x + Number.EPSILON) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Primitive conversions between weight and glazing%.
// ---------------------------------------------------------------------------

/** net = gross × (1 − glazing%/100). Glazing applied proportionally per-kg. */
export function netFromGlazing(grossWeightKg: number, glazingPercent: number): number {
  assertPositive("grossWeightKg", grossWeightKg);
  if (glazingPercent < 0 || glazingPercent >= 100) {
    throw new BillingError(
      `glazingPercent must be in [0, 100), got ${glazingPercent}`,
      "GLAZING_OUT_OF_RANGE",
    );
  }
  return roundKg(grossWeightKg * (1 - glazingPercent / 100));
}

/** glazing% = (1 − final/gross) × 100. Derived from the two weighings (primary path). */
export function glazingFromWeights(grossWeightKg: number, finalWeightKg: number): number {
  assertPositive("grossWeightKg", grossWeightKg);
  if (finalWeightKg < 0) {
    throw new BillingError("finalWeightKg cannot be negative", "FINAL_NEGATIVE");
  }
  if (finalWeightKg > grossWeightKg) {
    // Net can never exceed gross — this is a data-entry error, surface it loudly.
    throw new BillingError(
      `finalWeightKg (${finalWeightKg}) cannot exceed grossWeightKg (${grossWeightKg})`,
      "FINAL_EXCEEDS_GROSS",
    );
  }
  return roundPercent((1 - finalWeightKg / grossWeightKg) * 100);
}

// ---------------------------------------------------------------------------
// Line computation — the single entry point every screen should use.
// ---------------------------------------------------------------------------

export interface LineInput {
  /** Weighed gross weight of the line item, in kg. Required. */
  grossWeightKg: number;
  /** Rate per kg (of NET weight), from item master data (overridable). Required. */
  ratePerKg: number;
  /** Sales channel. `local` forces glazing to 0 (fresh, no deduction). */
  channel: Channel;

  /** PRIMARY path: the buyer's defrosted/final weight. If given, glazing% is derived. */
  finalWeightKg?: number;
  /** SECONDARY path: glazing% directly. Ignored if finalWeightKg is provided. */
  glazingPercent?: number;

  /** Item-level prawn flag → applies the 50/50 water default when no weight/% given. */
  isPrawn?: boolean;

  /** Dispute-defense counts captured at delivery. Not used in math, carried through. */
  cartonCount?: number;
  packetCount?: number;
  expectedPacketCount?: number;

  /** Variance alert: the party's expected/baseline glazing% for this item. */
  expectedGlazingPercent?: number;
  varianceTolerancePct?: number;
}

export interface VarianceAlert {
  expectedPercent: number;
  actualPercent: number;
  /** actual − expected, positive means the buyer deducted MORE than agreed. */
  exceededByPercent: number;
}

export interface PacketShortAlert {
  expected: number;
  actual: number;
  /** expected − actual, positive means a short delivery. */
  shortBy: number;
}

export interface LineResult {
  grossWeightKg: number;
  netWeightKg: number;
  glazingPercent: number;
  ratePerKg: number;
  amount: number;
  channel: Channel;
  cartonCount?: number;
  packetCount?: number;
  /** Present only when the buyer's glazing deduction exceeds the agreed baseline. */
  varianceAlert?: VarianceAlert;
  /** Present only when packetCount < expectedPacketCount. */
  packetShortAlert?: PacketShortAlert;
}

/**
 * Compute one invoice/delivery line. Handles both input paths, the local
 * zero-glazing rule, the prawn override, the glazing variance alert, and the
 * packet short-count alert. This is THE function to call — do not re-derive
 * net/amount anywhere else.
 */
export function computeLine(input: LineInput): LineResult {
  const { grossWeightKg, ratePerKg, channel } = input;
  assertPositive("grossWeightKg", grossWeightKg);
  if (ratePerKg < 0) throw new BillingError("ratePerKg cannot be negative", "RATE_NEGATIVE");

  let glazingPercent: number;
  let netWeightKg: number;

  if (channel === "local") {
    // Fresh / Karachi — no glazing deduction, ever.
    glazingPercent = 0;
    netWeightKg = roundKg(grossWeightKg);
  } else if (input.finalWeightKg !== undefined) {
    // PRIMARY path — derive % from the two weighings, net is the buyer's final weight.
    glazingPercent = glazingFromWeights(grossWeightKg, input.finalWeightKg);
    netWeightKg = roundKg(input.finalWeightKg);
  } else if (input.glazingPercent !== undefined) {
    // SECONDARY path — derive net from a supplied %.
    glazingPercent = roundPercent(input.glazingPercent);
    netWeightKg = netFromGlazing(grossWeightKg, glazingPercent);
  } else if (input.isPrawn) {
    // Prawn override — ~50% water when nothing measured was supplied.
    glazingPercent = PRAWN_DEFAULT_WATER_PERCENT;
    netWeightKg = netFromGlazing(grossWeightKg, glazingPercent);
  } else {
    throw new BillingError(
      "North line needs either finalWeightKg (primary) or glazingPercent (secondary)",
      "MISSING_GLAZING_INPUT",
    );
  }

  const amount = roundMoney(ratePerKg * netWeightKg);

  const result: LineResult = {
    grossWeightKg: roundKg(grossWeightKg),
    netWeightKg,
    glazingPercent,
    ratePerKg,
    amount,
    channel,
    cartonCount: input.cartonCount,
    packetCount: input.packetCount,
  };

  // Glazing variance alert — the owner's money-recovery mechanism (plan §4.3).
  if (input.expectedGlazingPercent !== undefined && channel === "north") {
    const tol = input.varianceTolerancePct ?? DEFAULT_VARIANCE_TOLERANCE_PCT;
    const exceededBy = roundPercent(glazingPercent - input.expectedGlazingPercent);
    if (exceededBy > tol) {
      result.varianceAlert = {
        expectedPercent: roundPercent(input.expectedGlazingPercent),
        actualPercent: glazingPercent,
        exceededByPercent: exceededBy,
      };
    }
  }

  // Packet short-count alert — dispute defense (44 where 45 expected).
  if (input.expectedPacketCount !== undefined && input.packetCount !== undefined) {
    const shortBy = input.expectedPacketCount - input.packetCount;
    if (shortBy > 0) {
      result.packetShortAlert = {
        expected: input.expectedPacketCount,
        actual: input.packetCount,
        shortBy,
      };
    }
  }

  return result;
}

/** invoice_total = Σ line_amount, rounded to money precision. */
export function computeInvoiceTotal(lines: Array<Pick<LineResult, "amount">>): number {
  return roundMoney(lines.reduce((sum, l) => sum + l.amount, 0));
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class BillingError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "BillingError";
    this.code = code;
  }
}

function assertPositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new BillingError(`${name} must be a positive number, got ${value}`, "NOT_POSITIVE");
  }
}
