/** Display helpers. Currency/locale/weight-unit come from the platform config
 *  (white-label): the server sets globalThis.__APP_CURRENCY in getAppConfig();
 *  the root layout mirrors the values to the browser with an inline script so
 *  client components format identically. Falls back to PKR/kg — the original
 *  deployment's units. */

function fmtSettings(): { code: string; locale: string; weightUnit: string } {
  const g = globalThis as Record<string, unknown>;
  return {
    code: typeof g.__APP_CURRENCY === "string" ? (g.__APP_CURRENCY as string) : "PKR",
    locale:
      typeof g.__APP_CURRENCY_LOCALE === "string" ? (g.__APP_CURRENCY_LOCALE as string) : "en-PK",
    weightUnit: typeof g.__APP_WEIGHT_UNIT === "string" ? (g.__APP_WEIGHT_UNIT as string) : "kg",
  };
}

export function pkr(n: number): string {
  const { code, locale } = fmtSettings();
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: code,
    maximumFractionDigits: 2,
  }).format(n);
}

export function kg(n: number): string {
  const { locale, weightUnit } = fmtSettings();
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(n)} ${weightUnit}`;
}

export function pct(n: number): string {
  return `${new Intl.NumberFormat(fmtSettings().locale, { maximumFractionDigits: 2 }).format(n)}%`;
}

export function dateShort(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" });
}
