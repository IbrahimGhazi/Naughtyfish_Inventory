import { describe, it, expect } from "vitest";
import { defaultWeekRange, presetRange } from "./reports";

// Fixed reference times so tests never touch the system clock.
// 2026-07-01 is a WEDNESDAY (getDay() === 3). Its ISO week starts Mon 2026-06-29.
const WED = new Date(2026, 6, 1, 14, 30, 0); // Wed 1 Jul 2026, 14:30 local
// 2026-07-05 is a SUNDAY (getDay() === 0) — the edge case that must still map
// back to the SAME Monday (2026-06-29), not the next one.
const SUN = new Date(2026, 6, 5, 9, 0, 0); // Sun 5 Jul 2026, 09:00 local
// 2026-07-06 is a MONDAY (getDay() === 1) — its own week start is itself.
const MON = new Date(2026, 6, 6, 8, 0, 0); // Mon 6 Jul 2026, 08:00 local

describe("defaultWeekRange", () => {
  it("starts the range on Monday 00:00 and ends at `now`", () => {
    const { from, to } = defaultWeekRange(WED);
    expect(from).toEqual(new Date(2026, 5, 29, 0, 0, 0, 0)); // Mon 29 Jun
    expect(to).toBe(WED); // to is exactly `now`
  });

  it("treats Sunday as the last day of the week (same Monday)", () => {
    const { from } = defaultWeekRange(SUN);
    expect(from).toEqual(new Date(2026, 5, 29, 0, 0, 0, 0)); // still Mon 29 Jun
  });

  it("returns Monday itself as the start when `now` is a Monday", () => {
    const { from } = defaultWeekRange(MON);
    expect(from).toEqual(new Date(2026, 6, 6, 0, 0, 0, 0)); // Mon 6 Jul
  });

  it("is deterministic in `now` (never reads the clock)", () => {
    const a = defaultWeekRange(WED);
    const b = defaultWeekRange(WED);
    expect(a).toEqual(b);
  });
});

describe("presetRange", () => {
  it("this_week matches defaultWeekRange", () => {
    expect(presetRange("this_week", WED)).toEqual(defaultWeekRange(WED));
  });

  it("last_week is the previous Mon 00:00 → Sun 23:59:59.999", () => {
    const { from, to } = presetRange("last_week", WED);
    expect(from).toEqual(new Date(2026, 5, 22, 0, 0, 0, 0)); // Mon 22 Jun
    // Ends one millisecond before this week's Monday (2026-06-29 00:00).
    expect(to).toEqual(new Date(2026, 5, 28, 23, 59, 59, 999)); // Sun 28 Jun
    expect(to.getTime()).toBe(new Date(2026, 5, 29, 0, 0, 0, 0).getTime() - 1);
  });

  it("last_week edge: computed correctly when `now` is a Sunday", () => {
    const { from, to } = presetRange("last_week", SUN);
    expect(from).toEqual(new Date(2026, 5, 22, 0, 0, 0, 0)); // Mon 22 Jun
    expect(to).toEqual(new Date(2026, 5, 28, 23, 59, 59, 999)); // Sun 28 Jun
  });

  it("this_month starts on the 1st at 00:00 and ends at `now`", () => {
    const { from, to } = presetRange("this_month", WED);
    expect(from).toEqual(new Date(2026, 6, 1, 0, 0, 0, 0)); // 1 Jul
    expect(to).toBe(WED);
  });

  it("is deterministic in `now`", () => {
    expect(presetRange("last_week", MON)).toEqual(presetRange("last_week", MON));
  });
});
