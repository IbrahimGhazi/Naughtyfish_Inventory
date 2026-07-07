/**
 * Processing helpers — raw → processed transformation math and the store
 * capability gate. Kept framework-free and pure so the loss/yield rules can be
 * unit-tested and reused by both the in-house Process action and the
 * store-to-store transfer (shipment) action.
 */
import { PROCESS_TYPES, type ProcessType, isProcessType } from "./enums";
import { round3 } from "./inventory";

/** Tolerant parse of a JSON string column into a clean ProcessType[] (drops
 *  anything unrecognised — never throws, so a malformed column can't crash a page). */
export function parseTypes(json: string | null | undefined): ProcessType[] {
  try {
    const arr = JSON.parse(json ?? "[]");
    if (!Array.isArray(arr)) return [];
    // De-dupe while preserving the canonical enum order.
    return PROCESS_TYPES.filter((t) => arr.includes(t));
  } catch {
    return [];
  }
}

/** A store's declared in-house capabilities. */
export function capabilitiesOf(store: { processCapabilities: string | null }): ProcessType[] {
  return parseTypes(store.processCapabilities);
}

/** Normalise + validate a client-supplied list of process types. */
export function cleanTypes(types: readonly string[]): ProcessType[] {
  return PROCESS_TYPES.filter((t) => types.includes(t));
}

/**
 * Throw unless every requested process type is one the store has declared it can
 * do. Enforced server-side so the capability gate isn't just UI hiding.
 */
export function assertCapabilities(
  store: { name: string; processCapabilities: string | null },
  types: readonly ProcessType[],
): void {
  const caps = new Set(capabilitiesOf(store));
  const missing = types.filter((t) => !caps.has(t));
  if (missing.length > 0) {
    throw new Error(`${store.name} can't do: ${missing.join(", ")}. Enable it in Settings → Stores.`);
  }
}

/**
 * Weight lost during a transformation = input − output (rounded to grams).
 * Throws if the output exceeds the input (a data-entry error — you can't create
 * weight). Zero loss is valid (a lossless step like packing).
 */
export function computeLoss(inputKg: number, outputKg: number): number {
  const loss = round3(inputKg - outputKg);
  if (loss < 0) {
    throw new Error("Output weight can't be more than the input weight.");
  }
  return loss;
}

/** Yield % = output / input × 100 (0 when input is 0). For display only. */
export function yieldPct(inputKg: number, outputKg: number): number {
  if (!(inputKg > 0)) return 0;
  return Math.round((outputKg / inputKg) * 1000) / 10;
}

export { isProcessType };
