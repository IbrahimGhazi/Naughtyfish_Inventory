/**
 * Per-deployment white-label configuration — SERVER half: cached DB load +
 * persist. Pure types/defaults/builders live in config-shared.ts (safe for
 * client components); everything is re-exported here so server code can keep
 * importing from "@/lib/config".
 */
import { cache } from "react";
import { prisma } from "./prisma";
import { mergeConfig, DEFAULT_CONFIG, type AppConfig, type FeatureFlags } from "./config-shared";
import { makeT, resolveCopy, type TFn } from "./copy";

export * from "./config-shared";
export * from "./copy";

/* ======================= Load / merge / save ======================= */


/**
 * The app-wide config, cached per request (React cache). Any error (e.g. the
 * migration hasn't run yet) falls back to the defaults so the app still boots.
 */
export const getAppConfig = cache(async (): Promise<AppConfig> => {
  try {
    const row = await prisma.appConfig.findUnique({ where: { id: "main" } });
    const cfg = row ? mergeConfig(JSON.parse(row.data)) : DEFAULT_CONFIG;
    applyCurrency(cfg);
    return cfg;
  } catch {
    return DEFAULT_CONFIG;
  }
});

/**
 * Editable-copy translator for SERVER components: `const t = await getCopy()`.
 * Resolves this deployment's overrides over the defaults, cached per request.
 * Client components use useCopy() from "@/lib/copy/CopyProvider" instead.
 */
export const getCopy = cache(async (): Promise<TFn> => {
  const cfg = await getAppConfig();
  return makeT(resolveCopy(cfg.copy));
});

/**
 * Server-side feature gate for actions/APIs. UI hiding is NOT enforcement —
 * a disabled module must also reject direct action/route invocations.
 */
export async function requireFeature(name: keyof FeatureFlags): Promise<void> {
  const cfg = await getAppConfig();
  if (!cfg.features[name]) throw new Error("This module is disabled.");
}

/** Persist a (partial) config; merge happens on read, so store what was given. */
export async function persistConfig(cfg: AppConfig): Promise<void> {
  const data = JSON.stringify(cfg);
  await prisma.appConfig.upsert({
    where: { id: "main" },
    create: { id: "main", data },
    update: { data },
  });
}

/* ==================== Theme CSS + currency wiring ==================== */


/** Push the configured units into the shared formatters (server side). */
function applyCurrency(cfg: AppConfig) {
  const g = globalThis as Record<string, unknown>;
  g.__APP_CURRENCY = cfg.terminology.currencyCode;
  g.__APP_CURRENCY_LOCALE = cfg.terminology.currencyLocale;
  g.__APP_WEIGHT_UNIT = cfg.terminology.weightUnit;
}

