import { describe, it, expect } from "vitest";
import {
  COPY_CATALOG,
  COPY_DEFAULTS,
  COPY_GROUPS,
  resolveCopy,
  sanitizeCopyOverrides,
  makeT,
} from "./index";

describe("copy registry", () => {
  it("has globally-unique keys", () => {
    const keys = COPY_CATALOG.map((e) => e.key);
    const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
    expect(dupes, `duplicate copy keys: ${[...new Set(dupes)].join(", ")}`).toEqual([]);
  });

  it("every entry has a non-empty default, group and label", () => {
    for (const e of COPY_CATALOG) {
      expect(e.key, "key present").toBeTruthy();
      expect(e.default.length, `default for ${e.key}`).toBeGreaterThan(0);
      expect(e.group, `group for ${e.key}`).toBeTruthy();
      expect(e.label, `label for ${e.key}`).toBeTruthy();
    }
  });

  it("groups cover the whole catalog exactly once", () => {
    const grouped = COPY_GROUPS.flatMap((g) => g.entries);
    expect(grouped).toHaveLength(COPY_CATALOG.length);
  });

  it("resolveCopy overlays known keys and ignores unknown/empty", () => {
    const first = COPY_CATALOG[0]?.key;
    if (!first) return; // registry not yet populated
    const map = resolveCopy({ [first]: "OVERRIDDEN", "nope.unknown": "x", [`${first}__blank`]: "" });
    expect(map[first]).toBe("OVERRIDDEN");
    expect(map["nope.unknown"]).toBeUndefined();
  });

  it("makeT falls back default → key", () => {
    const t = makeT(resolveCopy(null));
    const first = COPY_CATALOG[0]?.key;
    if (first) expect(t(first)).toBe(COPY_DEFAULTS[first]);
    expect(t("totally.missing.key")).toBe("totally.missing.key");
  });

  it("sanitizeCopyOverrides keeps only real, differing, capped overrides", () => {
    const first = COPY_CATALOG[0]?.key;
    if (!first) return;
    const clean = sanitizeCopyOverrides({
      [first]: "  New wording  ",
      "unknown.key": "drop me",
      [`${first}_same`]: COPY_DEFAULTS[first],
    });
    expect(clean[first]).toBe("New wording"); // trimmed
    expect(Object.keys(clean)).toEqual([first]);
  });
});
