import { describe, it, expect } from "vitest";
import {
  DEFAULT_CONFIG,
  mergeConfig,
  themeCss,
  THEME_PRESETS,
  FONT_PRESETS,
  SURFACE_PRESETS,
} from "./config-shared";

describe("mergeConfig", () => {
  it("returns defaults for empty/absent stored data", () => {
    expect(mergeConfig({})).toEqual(DEFAULT_CONFIG);
    expect(mergeConfig(null)).toEqual(DEFAULT_CONFIG);
    expect(mergeConfig(undefined)).toEqual(DEFAULT_CONFIG);
  });

  it("overlays stored values per-section without losing defaults", () => {
    const merged = mergeConfig({
      branding: { appName: "MangoBooks" },
      features: { shipments: false },
    });
    expect(merged.branding.appName).toBe("MangoBooks");
    expect(merged.branding.tagline).toBe(DEFAULT_CONFIG.branding.tagline);
    expect(merged.features.shipments).toBe(false);
    expect(merged.features.cheques).toBe(true);
    expect(merged.theme).toEqual(DEFAULT_CONFIG.theme);
  });

  it("drops unknown keys and type-mismatched values", () => {
    const merged = mergeConfig({
      branding: { appName: 42, hacker: "x" },
      features: { glazing: "yes" },
    });
    expect(merged.branding.appName).toBe(DEFAULT_CONFIG.branding.appName);
    expect((merged.branding as unknown as Record<string, unknown>).hacker).toBeUndefined();
    expect(merged.features.glazing).toBe(true);
  });

  it("accepts a string logoDataUrl over the null default", () => {
    const merged = mergeConfig({ branding: { logoDataUrl: "data:image/png;base64,AAA" } });
    expect(merged.branding.logoDataUrl).toBe("data:image/png;base64,AAA");
  });

  it("does not mutate DEFAULT_CONFIG", () => {
    const before = JSON.stringify(DEFAULT_CONFIG);
    const m = mergeConfig({ branding: { appName: "X" }, theme: { accent: "#123456" } });
    m.features.cheques = false;
    expect(JSON.stringify(DEFAULT_CONFIG)).toBe(before);
  });
});

describe("themeCss", () => {
  it("emits :root and .dark variable overrides with derived tints", () => {
    const css = themeCss(DEFAULT_CONFIG.theme);
    expect(css).toContain(":root{");
    expect(css).toContain(".dark{");
    expect(css).toContain("--accent:#0e7c7b;");
    expect(css).toContain("--accent-tint:rgba(14, 124, 123, 0.13);");
    expect(css).toContain("--side-bg:#0a1216;"); // dark section value
  });

  it("every preset produces valid css for both modes", () => {
    for (const [name, t] of Object.entries(THEME_PRESETS)) {
      // Palette presets supply only colors — fonts/surface/status ride along
      // from the current theme, exactly like the panel's patch() does.
      const css = themeCss({ ...DEFAULT_CONFIG.theme, ...t, preset: name });
      expect(css, name).toMatch(/--accent:#[0-9a-f]{6};/i);
      expect(css, name).toContain("--side-active:rgba(");
    }
  });

  it("falls back gracefully on a malformed hex", () => {
    const css = themeCss({ ...DEFAULT_CONFIG.theme, accent: "nope" });
    expect(css).toContain("--accent-tint:rgba(14,124,123,0.13);");
  });

  it("default surface + status emit NO overrides (existing look preserved)", () => {
    const css = themeCss(DEFAULT_CONFIG.theme);
    expect(css).not.toContain("--paper:");
    expect(css).not.toContain("--pos:");
  });

  it("a non-default surface emits the light neutral tokens", () => {
    const css = themeCss({ ...DEFAULT_CONFIG.theme, surface: "cool-gray" });
    expect(css).toContain(`--paper:${SURFACE_PRESETS["cool-gray"].paper};`);
    expect(css).toContain(`--card:${SURFACE_PRESETS["cool-gray"].card};`);
    // dark section untouched by surfaces
    expect(css.split(".dark{")[1]).not.toContain("--paper:");
  });

  it("changed status colors emit light values + color-mix dark derivation", () => {
    const css = themeCss({ ...DEFAULT_CONFIG.theme, statusNeg: "#aa1122" });
    expect(css).toContain("--neg:#aa1122;");
    expect(css.split(".dark{")[1]).toContain("color-mix(in srgb, #aa1122 55%, #ffffff)");
  });
});

describe("map + fonts config", () => {
  it("merges the map section and keeps defaults for missing keys", () => {
    const merged = mergeConfig({ map: { originCity: "Lahore" } });
    expect(merged.map.originCity).toBe("Lahore");
    expect(merged.map.showContextCities).toBe(true);
    expect(merged.map.subtitle).toBe(DEFAULT_CONFIG.map.subtitle);
  });

  it("default fontPreset/surface exist in their preset tables", () => {
    expect(FONT_PRESETS[DEFAULT_CONFIG.theme.fontPreset]).toBeTruthy();
    expect(SURFACE_PRESETS[DEFAULT_CONFIG.theme.surface]).toBeTruthy();
  });

  it("old stored configs (pre-map/pre-font) merge cleanly onto new defaults", () => {
    const legacy = {
      branding: { appName: "Legacy" },
      theme: { accent: "#123456" }, // no fontPreset/surface/status keys
      features: { cheques: false },
    };
    const merged = mergeConfig(legacy);
    expect(merged.branding.appName).toBe("Legacy");
    expect(merged.theme.accent).toBe("#123456");
    expect(merged.theme.fontPreset).toBe("newsreader-plex");
    expect(merged.theme.surface).toBe("warm-paper");
    expect(merged.map.originCity).toBe("Karachi");
  });
});
