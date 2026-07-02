"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getActiveContext } from "@/lib/session";
import { assertRole } from "@/lib/roles";
import { persistConfig, FONT_PRESETS, SURFACE_PRESETS, sanitizeCopyOverrides, type AppConfig } from "@/lib/config";
import { cityByName } from "@/lib/geo";

/**
 * Platform panel writes — platform_admin ONLY. This is the white-label
 * operator's surface; client admins can neither see nor call it.
 */

const hex = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Colors must be 6-digit hex, e.g. #0e7c7b");

const ConfigSchema = z.object({
  branding: z.object({
    appName: z.string().trim().min(1).max(40),
    tagline: z.string().trim().min(1).max(60),
    // Data-URL logo, capped ~300 KB so the config row stays lightweight.
    logoDataUrl: z
      .string()
      .regex(/^data:image\/(png|jpeg|webp|svg\+xml);base64,/)
      .max(400_000)
      .nullable(),
    businessType: z.string().trim().min(1).max(60),
  }),
  theme: z.object({
    preset: z.string().trim().max(40),
    accent: hex,
    accentDeep: hex,
    gold: hex,
    sideBg: hex,
    darkAccent: hex,
    darkAccentDeep: hex,
    darkGold: hex,
    darkSideBg: hex,
    fontPreset: z.string().trim().max(40),
    surface: z.string().trim().max(40),
    statusPos: hex,
    statusWarn: hex,
    statusNeg: hex,
    statusInfo: hex,
  }),
  terminology: z.object({
    itemSingular: z.string().trim().min(1).max(30),
    itemPlural: z.string().trim().min(1).max(30),
    packageSingular: z.string().trim().min(1).max(30),
    packagePlural: z.string().trim().min(1).max(30),
    subUnitSingular: z.string().trim().min(1).max(30),
    subUnitPlural: z.string().trim().min(1).max(30),
    weightUnit: z.string().trim().min(1).max(10),
    glazingLabel: z.string().trim().min(1).max(30),
    channelNorthLabel: z.string().trim().min(1).max(30),
    channelLocalLabel: z.string().trim().min(1).max(30),
    currencyCode: z.string().trim().regex(/^[A-Z]{3}$/, "3-letter ISO code, e.g. PKR"),
    currencyLocale: z.string().trim().min(2).max(20),
  }),
  features: z.object({
    glazing: z.boolean(),
    packaging: z.boolean(),
    shipments: z.boolean(),
    cheques: z.boolean(),
    banks: z.boolean(),
    expenses: z.boolean(),
    reports: z.boolean(),
    processes: z.boolean(),
    secondBook: z.boolean(),
    assistant: z.boolean(),
  }),
  map: z.object({
    originCity: z.string().trim().min(1).max(40),
    subtitle: z.string().trim().min(1).max(120),
    showContextCities: z.boolean(),
  }),
  // Sparse wording overrides (copy-key → text). Loosely typed here; keys are
  // validated against the registry and stored sparsely by sanitizeCopyOverrides.
  copy: z.record(z.string(), z.string()).optional(),
});

export async function savePlatformConfig(input: AppConfig): Promise<{ ok: true }> {
  const ctx = await getActiveContext();
  assertRole(ctx, ["platform_admin"]);

  const parsed = ConfigSchema.parse(input);
  if (!FONT_PRESETS[parsed.theme.fontPreset]) throw new Error("Unknown font preset.");
  if (!SURFACE_PRESETS[parsed.theme.surface]) throw new Error("Unknown surface preset.");
  if (!cityByName(parsed.map.originCity)) {
    throw new Error(`"${parsed.map.originCity}" is not on the map — pick a city from the list.`);
  }
  // Verify the currency code renders before persisting a broken formatter.
  try {
    new Intl.NumberFormat(parsed.terminology.currencyLocale, {
      style: "currency",
      currency: parsed.terminology.currencyCode,
    }).format(1);
  } catch {
    throw new Error(
      `Currency "${parsed.terminology.currencyCode}" with locale "${parsed.terminology.currencyLocale}" is not a valid Intl pair.`,
    );
  }

  // Keep only real overrides for known keys (drops stale keys, empties, and
  // values equal to the default — the stored row stays sparse).
  const clean: AppConfig = { ...parsed, copy: sanitizeCopyOverrides(parsed.copy) };

  await persistConfig(clean);
  revalidatePath("/", "layout");
  return { ok: true };
}
