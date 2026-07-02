/**
 * Per-deployment white-label configuration — PURE half (types, defaults,
 * presets, merge + CSS builders). No prisma, no react: safe to import from
 * client components and unit tests. Server loading/saving lives in config.ts.
 */

/* ============================== Types ============================== */

export interface BrandingConfig {
  /** Product name shown in the sidebar, login screen and browser title. */
  appName: string;
  /** Small uppercase line under the name (login + sidebar). */
  tagline: string;
  /** Optional uploaded logo (data URL). null → the built-in fish mark. */
  logoDataUrl: string | null;
  /** What this customer trades — drives default terminology suggestions. */
  businessType: string;
}

/** Both light and dark values for every overridable design token. */
export interface ThemeConfig {
  /** Name of the preset this was seeded from ("custom" once hand-edited). */
  preset: string;
  accent: string;
  accentDeep: string;
  gold: string;
  sideBg: string;
  darkAccent: string;
  darkAccentDeep: string;
  darkGold: string;
  darkSideBg: string;
  /** Typeface trio, keyed into FONT_PRESETS (serif headings / sans UI / mono figures). */
  fontPreset: string;
  /** Background/surface neutrals, keyed into SURFACE_PRESETS (light mode). */
  surface: string;
  /** Status/alert colors (light mode; dark derives via color-mix). */
  statusPos: string;
  statusWarn: string;
  statusNeg: string;
  statusInfo: string;
}

/** Shipment-map + operations copy (white-label: not every customer is Karachi). */
export interface MapConfig {
  /** Origin city name — must match a src/lib/geo.ts CITIES entry. */
  originCity: string;
  /** Subtitle line on the Shipments page. */
  subtitle: string;
  /** Show the faded non-destination cities on the map. */
  showContextCities: boolean;
}

export interface TerminologyConfig {
  /** Sellable unit, e.g. Fish item / Cut / Product. */
  itemSingular: string;
  itemPlural: string;
  /** Outer package, e.g. Carton / Crate / Box. */
  packageSingular: string;
  packagePlural: string;
  /** Inner package, e.g. Packet / Bag / Piece. */
  subUnitSingular: string;
  subUnitPlural: string;
  /** Weight unit label, e.g. kg / lb. Display only — math is unit-agnostic. */
  weightUnit: string;
  /** The ice-coating concept, e.g. Glazing / Moisture / Tare. */
  glazingLabel: string;
  /** Channel display names (schema values stay "north"/"local"). */
  channelNorthLabel: string;
  channelLocalLabel: string;
  /** ISO currency code + display locale for every money figure. */
  currencyCode: string;
  currencyLocale: string;
}

export interface FeatureFlags {
  /** Glazing % fields + variance alert (fish-specific). */
  glazing: boolean;
  /** Carton/packet count fields (packaged-goods specific). */
  packaging: boolean;
  /** Shipments page + dashboard map + "on the road". */
  shipments: boolean;
  /** Cheque tracking (page + due reminders). */
  cheques: boolean;
  /** Banks page + est. bank balance KPI. */
  banks: boolean;
  /** Expenses page (disabling also hides P&L expense series). */
  expenses: boolean;
  /** Reports section. */
  reports: boolean;
  /** Optional processing/production module. */
  processes: boolean;
  /** Second (NF/black) book switcher in the topbar. */
  secondBook: boolean;
  /** AI assistant bubble. */
  assistant: boolean;
}

export interface AppConfig {
  branding: BrandingConfig;
  theme: ThemeConfig;
  terminology: TerminologyConfig;
  features: FeatureFlags;
  map: MapConfig;
}

/* ============================= Defaults ============================= */

export const DEFAULT_CONFIG: AppConfig = {
  branding: {
    appName: "naughtyfish",
    tagline: "Trade ledger · Karachi",
    logoDataUrl: null,
    businessType: "Seafood trading",
  },
  theme: {
    preset: "teal-ledger",
    accent: "#0e7c7b",
    accentDeep: "#0a5f5e",
    gold: "#8c6a1f",
    sideBg: "#0d1f26",
    darkAccent: "#2bb0ad",
    darkAccentDeep: "#23928f",
    darkGold: "#c9a24e",
    darkSideBg: "#0a1216",
    fontPreset: "newsreader-plex",
    surface: "warm-paper",
    statusPos: "#337a54",
    statusWarn: "#a16a1b",
    statusNeg: "#c2492f",
    statusInfo: "#3e5d7a",
  },
  terminology: {
    itemSingular: "Item",
    itemPlural: "Items",
    packageSingular: "Carton",
    packagePlural: "Cartons",
    subUnitSingular: "Packet",
    subUnitPlural: "Packets",
    weightUnit: "kg",
    glazingLabel: "Glazing",
    channelNorthLabel: "North",
    channelLocalLabel: "Local",
    currencyCode: "PKR",
    currencyLocale: "en-PK",
  },
  features: {
    glazing: true,
    packaging: true,
    shipments: true,
    cheques: true,
    banks: true,
    expenses: true,
    reports: true,
    processes: true,
    secondBook: true,
    assistant: true,
  },
  map: {
    originCity: "Karachi",
    subtitle: "Karachi cold-chain dispatches heading north.",
    showContextCities: true,
  },
};

/** Just the color half of ThemeConfig (what a palette preset supplies). */
export type ThemePalette = Pick<
  ThemeConfig,
  "accent" | "accentDeep" | "gold" | "sideBg" | "darkAccent" | "darkAccentDeep" | "darkGold" | "darkSideBg"
>;

/** Ready-made palettes for the platform panel's theme picker. */
export const THEME_PRESETS: Record<string, ThemePalette> = {
  "teal-ledger": {
    accent: "#0e7c7b", accentDeep: "#0a5f5e", gold: "#8c6a1f", sideBg: "#0d1f26",
    darkAccent: "#2bb0ad", darkAccentDeep: "#23928f", darkGold: "#c9a24e", darkSideBg: "#0a1216",
  },
  "indigo-office": {
    accent: "#4653a2", accentDeep: "#374180", gold: "#8c6a1f", sideBg: "#161a2e",
    darkAccent: "#8b96e8", darkAccentDeep: "#6f7cd8", darkGold: "#c9a24e", darkSideBg: "#101323",
  },
  "forest-market": {
    accent: "#2f7d46", accentDeep: "#256337", gold: "#8c6a1f", sideBg: "#122018",
    darkAccent: "#63bf82", darkAccentDeep: "#4aa869", darkGold: "#c9a24e", darkSideBg: "#0d1a12",
  },
  "crimson-trader": {
    accent: "#a63446", accentDeep: "#872a39", gold: "#8c6a1f", sideBg: "#241318",
    darkAccent: "#e07a8b", darkAccentDeep: "#d15d71", darkGold: "#c9a24e", darkSideBg: "#1c0e12",
  },
  "slate-industrial": {
    accent: "#46626f", accentDeep: "#374e59", gold: "#7a6e4f", sideBg: "#131c21",
    darkAccent: "#7fa3b5", darkAccentDeep: "#648ca0", darkGold: "#b4a988", darkSideBg: "#0e161a",
  },
};

/**
 * Typeface trios (serif headings / sans UI / mono figures). The ACTUAL font
 * loading is static in src/app/layout.tsx (next/font requires module-scope
 * declarations); this table is the picker metadata and must stay in sync with
 * the trios declared there.
 */
export const FONT_PRESETS: Record<string, { label: string; serif: string; sans: string; mono: string }> = {
  "newsreader-plex": { label: "Ledger classic", serif: "Newsreader", sans: "IBM Plex Sans", mono: "IBM Plex Mono" },
  "playfair-inter": { label: "Editorial", serif: "Playfair Display", sans: "Inter", mono: "JetBrains Mono" },
  "fraunces-source": { label: "Warm modern", serif: "Fraunces", sans: "Source Sans 3", mono: "Source Code Pro" },
  "lora-karla": { label: "Quiet bookish", serif: "Lora", sans: "Karla", mono: "Space Mono" },
};

/**
 * Background/surface neutral sets (LIGHT mode; dark mode keeps its own tuned
 * neutrals). Keys mirror the globals.css tokens they override.
 */
export const SURFACE_PRESETS: Record<
  string,
  { label: string; paper: string; paper2: string; card: string; card2: string; hair: string; hair2: string; row: string }
> = {
  "warm-paper": {
    label: "Warm paper",
    paper: "#f1ebdd", paper2: "#f4efe3", card: "#fdfbf4", card2: "#faf6ea",
    hair: "#e4dbc5", hair2: "#eae2ce", row: "#f0ead9",
  },
  "soft-sand": {
    label: "Soft sand",
    paper: "#efe9df", paper2: "#f3eee6", card: "#fcf9f3", card2: "#f8f4ec",
    hair: "#e2d9c8", hair2: "#e8e1d2", row: "#eee7d8",
  },
  "clean-white": {
    label: "Clean white",
    paper: "#f6f6f4", paper2: "#f9f9f7", card: "#ffffff", card2: "#f7f7f4",
    hair: "#e6e6e0", hair2: "#ecece6", row: "#f1f1ec",
  },
  "cool-gray": {
    label: "Cool gray",
    paper: "#eef0f2", paper2: "#f2f4f5", card: "#fbfcfd", card2: "#f4f6f7",
    hair: "#dde2e6", hair2: "#e4e9ec", row: "#eaeef1",
  },
};


/* ==================== Merge + theme CSS builders ==================== */

/** Deep-merge stored JSON over the defaults; unknown keys are dropped. */
export function mergeConfig(stored: unknown): AppConfig {
  const s = (stored ?? {}) as Partial<Record<keyof AppConfig, Record<string, unknown>>>;
  const out: AppConfig = {
    branding: { ...DEFAULT_CONFIG.branding },
    theme: { ...DEFAULT_CONFIG.theme },
    terminology: { ...DEFAULT_CONFIG.terminology },
    features: { ...DEFAULT_CONFIG.features },
    map: { ...DEFAULT_CONFIG.map },
  };
  for (const section of ["branding", "theme", "terminology", "features", "map"] as const) {
    const src = s[section];
    if (!src || typeof src !== "object") continue;
    const dst = out[section] as unknown as Record<string, unknown>;
    for (const key of Object.keys(dst)) {
      const v = src[key];
      if (v === undefined || v === null) continue;
      if (typeof v === typeof dst[key] || dst[key] === null) dst[key] = v;
    }
    // logoDataUrl defaults to null, so typeof-match above misses string values.
    if (section === "branding" && typeof src.logoDataUrl === "string") {
      out.branding.logoDataUrl = src.logoDataUrl;
    }
  }
  return out;
}

/**
 * CSS overriding the :root/.dark custom properties set in globals.css.
 * Injected by the root layout as a <style> tag — a pure variable swap, exactly
 * like dark mode, so every component retints automatically.
 */
export function themeCss(t: ThemeConfig): string {
  const tint = (hex: string, a: number) => {
    const m = /^#?([0-9a-f]{6})$/i.exec((hex ?? "").trim());
    if (!m) return `rgba(14,124,123,${a})`;
    const n = parseInt(m[1], 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  };

  // Surface neutrals (light mode only — dark keeps its tuned values).
  const surf = SURFACE_PRESETS[t.surface];
  const surfaceVars =
    surf && t.surface !== "warm-paper"
      ? [
          `--paper:${surf.paper};`,
          `--paper-2:${surf.paper2};`,
          `--card:${surf.card};`,
          `--card-2:${surf.card2};`,
          `--hair:${surf.hair};`,
          `--hair-2:${surf.hair2};`,
          `--row:${surf.row};`,
        ]
      : [];

  // Status colors: configured hex drives light mode; dark mode derives a
  // lighter variant via color-mix so chips stay readable on dark surfaces.
  // Only emitted when changed from the defaults, so untouched deployments keep
  // the hand-tuned globals.css values byte-for-byte (esp. dark mode).
  const d = DEFAULT_CONFIG.theme;
  const statusChanged =
    t.statusPos !== d.statusPos ||
    t.statusWarn !== d.statusWarn ||
    t.statusNeg !== d.statusNeg ||
    t.statusInfo !== d.statusInfo;
  const statusLight = [
    `--pos:${t.statusPos};`,
    `--pos-bg:${tint(t.statusPos, 0.14)};`,
    `--warn:${t.statusWarn};`,
    `--warn-bg:${tint(t.statusWarn, 0.14)};`,
    `--neg:${t.statusNeg};`,
    `--neg-bg:${tint(t.statusNeg, 0.13)};`,
    `--info:${t.statusInfo};`,
    `--info-bg:${tint(t.statusInfo, 0.13)};`,
  ];
  const lighten = (hex: string) => `color-mix(in srgb, ${hex} 55%, #ffffff)`;
  const statusDark = [
    `--pos:${lighten(t.statusPos)};`,
    `--pos-bg:${tint(t.statusPos, 0.16)};`,
    `--warn:${lighten(t.statusWarn)};`,
    `--warn-bg:${tint(t.statusWarn, 0.16)};`,
    `--neg:${lighten(t.statusNeg)};`,
    `--neg-bg:${tint(t.statusNeg, 0.16)};`,
    `--info:${lighten(t.statusInfo)};`,
    `--info-bg:${tint(t.statusInfo, 0.16)};`,
  ];

  return [
    ":root{",
    `--accent:${t.accent};`,
    `--accent-deep:${t.accentDeep};`,
    `--accent-tint:${tint(t.accent, 0.13)};`,
    `--accent-tint-2:${tint(t.accent, 0.22)};`,
    `--gold:${t.gold};`,
    `--side-bg:${t.sideBg};`,
    `--side-active:${tint(t.accent, 0.28)};`,
    ...surfaceVars,
    ...(statusChanged ? statusLight : []),
    "}",
    ".dark{",
    `--accent:${t.darkAccent};`,
    `--accent-deep:${t.darkAccentDeep};`,
    `--accent-tint:${tint(t.darkAccent, 0.16)};`,
    `--accent-tint-2:${tint(t.darkAccent, 0.26)};`,
    `--gold:${t.darkGold};`,
    `--side-bg:${t.darkSideBg};`,
    `--side-active:${tint(t.darkAccent, 0.24)};`,
    ...(statusChanged ? statusDark : []),
    "}",
  ].join("");
}

/** Inline script for the root layout: mirrors the units to the browser so
 *  client components (forms, charts) format money/weights identically. */
export function unitsScript(cfg: AppConfig): string {
  const j = (s: string) => JSON.stringify(s);
  return (
    `window.__APP_CURRENCY=${j(cfg.terminology.currencyCode)};` +
    `window.__APP_CURRENCY_LOCALE=${j(cfg.terminology.currencyLocale)};` +
    `window.__APP_WEIGHT_UNIT=${j(cfg.terminology.weightUnit)};`
  );
}
