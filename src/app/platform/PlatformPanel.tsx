"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, Chip, PrimaryButton, GhostButton } from "@/components/ui";
import {
  THEME_PRESETS,
  FONT_PRESETS,
  SURFACE_PRESETS,
  type AppConfig,
  type FeatureFlags,
  type TerminologyConfig,
} from "@/lib/config-shared";
import { COPY_GROUPS, COPY_DEFAULTS } from "@/lib/copy";
import { useCopy } from "@/lib/copy/CopyProvider";
import { CITY_NAMES } from "@/lib/geo";
import { savePlatformConfig } from "./actions";

/* Terminology starter packs per business type — a head start, all editable. */
const BUSINESS_PRESETS: Record<string, Partial<TerminologyConfig> & { businessType: string }> = {
  "Seafood trading": {
    businessType: "Seafood trading",
    itemSingular: "Item", itemPlural: "Items",
    packageSingular: "Carton", packagePlural: "Cartons",
    subUnitSingular: "Packet", subUnitPlural: "Packets",
    weightUnit: "kg", glazingLabel: "Glazing",
  },
  "Meat & poultry": {
    businessType: "Meat & poultry",
    itemSingular: "Cut", itemPlural: "Cuts",
    packageSingular: "Crate", packagePlural: "Crates",
    subUnitSingular: "Pack", subUnitPlural: "Packs",
    weightUnit: "kg", glazingLabel: "Trim loss",
  },
  "Fruits & vegetables": {
    businessType: "Fruits & vegetables",
    itemSingular: "Produce", itemPlural: "Produce",
    packageSingular: "Crate", packagePlural: "Crates",
    subUnitSingular: "Bag", subUnitPlural: "Bags",
    weightUnit: "kg", glazingLabel: "Wastage",
  },
  "Textiles": {
    businessType: "Textiles",
    itemSingular: "Fabric", itemPlural: "Fabrics",
    packageSingular: "Bale", packagePlural: "Bales",
    subUnitSingular: "Roll", subUnitPlural: "Rolls",
    weightUnit: "m", glazingLabel: "Shrinkage",
  },
  "General goods": {
    businessType: "General goods",
    itemSingular: "Product", itemPlural: "Products",
    packageSingular: "Box", packagePlural: "Boxes",
    subUnitSingular: "Unit", subUnitPlural: "Units",
    weightUnit: "kg", glazingLabel: "Adjustment",
  },
};

const FEATURE_LABELS: Record<keyof FeatureFlags, [string, string]> = {
  glazing: ["Glazing / weight adjustment", "Per-line % fields + over-deduction alerts on invoices"],
  packaging: ["Packaging counts", "Carton/packet fields + short-count alerts"],
  shipments: ["Shipments", "Shipment tracking page, dashboard map and 'on the road' card"],
  cheques: ["Cheques", "Cheque registry, due-soon reminders"],
  banks: ["Banks", "Bank accounts + estimated balance KPI"],
  expenses: ["Expenses", "Expense categories/entries + P&L expense series"],
  reports: ["Reports", "Bad debts, weekly statement and future reports"],
  processes: ["Processes", "Optional production/processing tracker with costs"],
  secondBook: ["Second book (NF)", "The white/black two-book switcher in the top bar"],
  assistant: ["AI assistant", "The ask-the-ledger chat bubble"],
};

export default function PlatformPanel({ initial }: { initial: AppConfig }) {
  const t = useCopy();
  const [cfg, setCfg] = useState<AppConfig>(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dirty = useMemo(() => JSON.stringify(cfg) !== JSON.stringify(initial), [cfg, initial]);

  const patch = <K extends keyof AppConfig>(section: K, p: Partial<AppConfig[K]>) => {
    setSaved(false);
    setCfg((c) => ({ ...c, [section]: { ...c[section], ...p } }));
  };

  // Copy overrides: set a wording override, or clear it (empty → use default).
  const patchCopy = (key: string, value: string) => {
    setSaved(false);
    setCfg((c) => {
      const copy = { ...c.copy };
      if (value.trim().length === 0) delete copy[key];
      else copy[key] = value;
      return { ...c, copy };
    });
  };

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await savePlatformConfig(cfg);
        setSaved(true);
        // Full reload, NOT router.refresh(): the inline units <script> in the
        // root layout never re-executes on a soft refresh (innerHTML-swapped
        // script content doesn't run), so client-side formatters would keep
        // the old currency/units until a hard reload.
        window.location.reload();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  async function onLogoFile(file: File | undefined) {
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file, 192, 0.85);
      patch("branding", { logoDataUrl: dataUrl });
    } catch {
      setError(t("platform.logo.readError"));
    }
  }

  return (
    <div className="space-y-4">
      {/* ============================== Branding ============================== */}
      <Card className="p-5">
        <SectionTitle
          title={t("platform.branding.title")}
          sub={t("platform.branding.sub")}
        />
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label={t("platform.field.appName")}>
            <input className="input" value={cfg.branding.appName} maxLength={40}
              onChange={(e) => patch("branding", { appName: e.target.value })} />
          </Field>
          <Field label={t("platform.field.tagline")}>
            <input className="input" value={cfg.branding.tagline} maxLength={60}
              onChange={(e) => patch("branding", { tagline: e.target.value })} />
          </Field>
          <Field label={t("platform.field.businessType")} hint={t("platform.field.businessType.hint")}>
            <select className="input" value={cfg.branding.businessType}
              onChange={(e) => {
                const preset = BUSINESS_PRESETS[e.target.value];
                patch("branding", { businessType: e.target.value });
                if (preset) {
                  const terms = { ...preset } as Partial<TerminologyConfig> & { businessType?: string };
                  delete terms.businessType;
                  patch("terminology", terms);
                }
              }}>
              {Object.keys(BUSINESS_PRESETS).map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
              {!BUSINESS_PRESETS[cfg.branding.businessType] && (
                <option value={cfg.branding.businessType}>{cfg.branding.businessType}</option>
              )}
            </select>
          </Field>
          <Field label={t("platform.field.logo")} hint={t("platform.field.logo.hint")}>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-hair"
                style={{ background: "var(--side-bg)" }}>
                {cfg.branding.logoDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cfg.branding.logoDataUrl} alt="logo" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[10px]" style={{ color: "var(--side-dim)" }}>{t("platform.logo.placeholder")}</span>
                )}
              </div>
              <label className="cursor-pointer text-[13px] font-semibold text-accent hover:text-accent-deep">
                {t("platform.logo.upload")}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                  onChange={(e) => onLogoFile(e.target.files?.[0])} />
              </label>
              {cfg.branding.logoDataUrl && (
                <button type="button" className="text-[13px] font-semibold text-neg"
                  onClick={() => patch("branding", { logoDataUrl: null })}>
                  {t("platform.logo.remove")}
                </button>
              )}
            </div>
          </Field>
        </div>
      </Card>

      {/* ================================ Theme ================================ */}
      <Card className="p-5">
        <SectionTitle
          title={t("platform.theme.title")}
          sub={t("platform.theme.sub")}
        />
        <div className="mb-4 flex flex-wrap gap-2">
          {Object.entries(THEME_PRESETS).map(([name, t]) => (
            <button key={name} type="button"
              onClick={() => patch("theme", { ...t, preset: name })}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-[12.5px] font-semibold capitalize transition-colors"
              style={
                cfg.theme.preset === name
                  ? { borderColor: t.accent, background: "var(--accent-tint)", color: "var(--ink)" }
                  : { borderColor: "var(--hair)", color: "var(--muted)" }
              }>
              <span className="flex overflow-hidden rounded-full border border-hair">
                <span className="h-4 w-4" style={{ background: t.accent }} />
                <span className="h-4 w-4" style={{ background: t.sideBg }} />
                <span className="h-4 w-4" style={{ background: t.gold }} />
              </span>
              {name.replace(/-/g, " ")}
            </button>
          ))}
        </div>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <ColorField label={t("platform.color.accent")} value={cfg.theme.accent}
            onChange={(v) => patch("theme", { accent: v, preset: "custom" })} />
          <ColorField label={t("platform.color.accentDeep")} value={cfg.theme.accentDeep}
            onChange={(v) => patch("theme", { accentDeep: v, preset: "custom" })} />
          <ColorField label={t("platform.color.gold")} value={cfg.theme.gold}
            onChange={(v) => patch("theme", { gold: v, preset: "custom" })} />
          <ColorField label={t("platform.color.sidebar")} value={cfg.theme.sideBg}
            onChange={(v) => patch("theme", { sideBg: v, preset: "custom" })} />
          <ColorField label={t("platform.color.darkAccent")} value={cfg.theme.darkAccent}
            onChange={(v) => patch("theme", { darkAccent: v, preset: "custom" })} />
          <ColorField label={t("platform.color.darkAccentDeep")} value={cfg.theme.darkAccentDeep}
            onChange={(v) => patch("theme", { darkAccentDeep: v, preset: "custom" })} />
          <ColorField label={t("platform.color.darkGold")} value={cfg.theme.darkGold}
            onChange={(v) => patch("theme", { darkGold: v, preset: "custom" })} />
          <ColorField label={t("platform.color.darkSidebar")} value={cfg.theme.darkSideBg}
            onChange={(v) => patch("theme", { darkSideBg: v, preset: "custom" })} />
        </div>

        {/* Typefaces — trio presets (serif headings / sans UI / mono figures). */}
        <div className="mt-5">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-faint2">
            {t("platform.theme.typefaces")}
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(FONT_PRESETS).map(([key, fp]) => {
              const on = cfg.theme.fontPreset === key;
              return (
                <button key={key} type="button"
                  onClick={() => patch("theme", { fontPreset: key })}
                  className="rounded-xl border px-3.5 py-3 text-left transition-colors"
                  style={on
                    ? { borderColor: "var(--accent)", background: "var(--accent-tint)" }
                    : { borderColor: "var(--hair)" }}>
                  <span className="block text-[13px] font-semibold text-ink">{fp.label}</span>
                  <span className="mt-1 block text-[11.5px] leading-relaxed text-faint">
                    {fp.serif} · {fp.sans}
                    <br />
                    <span className="font-mono">{fp.mono}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Paper & surface tone (light mode neutrals). */}
        <div className="mt-5">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-faint2">
            {t("platform.theme.paperSurfaces")}
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(SURFACE_PRESETS).map(([key, sp]) => {
              const on = cfg.theme.surface === key;
              return (
                <button key={key} type="button"
                  onClick={() => patch("theme", { surface: key })}
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 text-[12.5px] font-semibold transition-colors"
                  style={on
                    ? { borderColor: "var(--accent)", background: "var(--accent-tint)", color: "var(--ink)" }
                    : { borderColor: "var(--hair)", color: "var(--muted)" }}>
                  <span className="flex overflow-hidden rounded-md border border-hair">
                    <span className="h-5 w-5" style={{ background: sp.paper }} />
                    <span className="h-5 w-5" style={{ background: sp.card }} />
                    <span className="h-5 w-5" style={{ background: sp.hair }} />
                  </span>
                  {sp.label}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[11.5px] text-faint">
            {t("platform.theme.lightModeNote")}
          </p>
        </div>

        {/* Status & alert colors. */}
        <div className="mt-5">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-faint2">
            {t("platform.theme.statusColors")}
          </div>
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <ColorField label={t("platform.color.statusPos")} value={cfg.theme.statusPos}
              onChange={(v) => patch("theme", { statusPos: v })} />
            <ColorField label={t("platform.color.statusWarn")} value={cfg.theme.statusWarn}
              onChange={(v) => patch("theme", { statusWarn: v })} />
            <ColorField label={t("platform.color.statusNeg")} value={cfg.theme.statusNeg}
              onChange={(v) => patch("theme", { statusNeg: v })} />
            <ColorField label={t("platform.color.statusInfo")} value={cfg.theme.statusInfo}
              onChange={(v) => patch("theme", { statusInfo: v })} />
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {([
              ["paid", cfg.theme.statusPos],
              ["pending", cfg.theme.statusWarn],
              ["overdue", cfg.theme.statusNeg],
              ["in transit", cfg.theme.statusInfo],
            ] as const).map(([label, color]) => (
              <span key={label}
                className="inline-flex items-center rounded-full px-2.5 py-[3px] text-[11px] font-semibold"
                style={{ background: hexTint(color, 0.14), color }}>
                {label}
              </span>
            ))}
            <span className="self-center text-[11.5px] text-faint">
              {t("platform.theme.darkShadesNote")}
            </span>
          </div>
        </div>

        {/* Live mini-preview */}
        <div className="mt-4 overflow-hidden rounded-xl border border-hair">
          <div className="flex">
            <div className="w-32 shrink-0 p-3" style={{ background: cfg.theme.sideBg }}>
              <div className="font-serif text-[13px] font-semibold italic" style={{ color: "#f2ebd9" }}>
                {cfg.branding.appName}
              </div>
              <div className="mt-2 space-y-1">
                <div className="rounded px-2 py-1 text-[10px] font-semibold"
                  style={{ background: hexTint(cfg.theme.accent, 0.28), color: "#f2ebd9" }}>
                  {t("platform.preview.dashboard")}
                </div>
                <div className="px-2 py-1 text-[10px]" style={{ color: "#7e938e" }}>{t("platform.preview.invoices")}</div>
                <div className="px-2 py-1 text-[10px]" style={{ color: "#7e938e" }}>{t("platform.preview.parties")}</div>
              </div>
            </div>
            <div className="flex-1 bg-paper2 p-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: cfg.theme.accent }}>
                {t("platform.preview.eyebrow")}
              </div>
              <div className="mt-1 font-serif text-[15px] font-semibold text-ink">
                {cfg.branding.tagline}
              </div>
              <div className="mt-2 flex gap-2">
                <span className="rounded-lg px-3 py-1.5 text-[11px] font-semibold"
                  style={{ background: cfg.theme.accent, color: "#f6f2e6" }}>
                  {t("platform.preview.newInvoice")}
                </span>
                <span className="rounded-lg border border-hair bg-card px-3 py-1.5 font-mono text-[11px]"
                  style={{ color: cfg.theme.gold }}>
                  SSI-000123
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ============================ Terminology ============================ */}
      <Card className="p-5">
        <SectionTitle
          title={t("platform.terminology.title")}
          sub={t("platform.terminology.sub")}
        />
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={t("platform.term.sellableUnit")}>
            <div className="flex gap-2">
              <input className="input" value={cfg.terminology.itemSingular}
                onChange={(e) => patch("terminology", { itemSingular: e.target.value })} />
              <input className="input" value={cfg.terminology.itemPlural}
                onChange={(e) => patch("terminology", { itemPlural: e.target.value })} />
            </div>
          </Field>
          <Field label={t("platform.term.outerPackage")}>
            <div className="flex gap-2">
              <input className="input" value={cfg.terminology.packageSingular}
                onChange={(e) => patch("terminology", { packageSingular: e.target.value })} />
              <input className="input" value={cfg.terminology.packagePlural}
                onChange={(e) => patch("terminology", { packagePlural: e.target.value })} />
            </div>
          </Field>
          <Field label={t("platform.term.innerPackage")}>
            <div className="flex gap-2">
              <input className="input" value={cfg.terminology.subUnitSingular}
                onChange={(e) => patch("terminology", { subUnitSingular: e.target.value })} />
              <input className="input" value={cfg.terminology.subUnitPlural}
                onChange={(e) => patch("terminology", { subUnitPlural: e.target.value })} />
            </div>
          </Field>
          <Field label={t("platform.term.weightUnit")}>
            <input className="input" value={cfg.terminology.weightUnit}
              onChange={(e) => patch("terminology", { weightUnit: e.target.value })} />
          </Field>
          <Field label={t("platform.term.deductionConcept")} hint={t("platform.term.deductionConcept.hint")}>
            <input className="input" value={cfg.terminology.glazingLabel}
              onChange={(e) => patch("terminology", { glazingLabel: e.target.value })} />
          </Field>
          <Field label={t("platform.term.channels")} hint={t("platform.term.channels.hint")}>
            <div className="flex gap-2">
              <input className="input" value={cfg.terminology.channelNorthLabel}
                onChange={(e) => patch("terminology", { channelNorthLabel: e.target.value })} />
              <input className="input" value={cfg.terminology.channelLocalLabel}
                onChange={(e) => patch("terminology", { channelLocalLabel: e.target.value })} />
            </div>
          </Field>
          <Field label={t("platform.term.currency")} hint={t("platform.term.currency.hint")}>
            <input className="input font-mono uppercase" maxLength={3} value={cfg.terminology.currencyCode}
              onChange={(e) => patch("terminology", { currencyCode: e.target.value.toUpperCase() })} />
          </Field>
          <Field label={t("platform.term.numberLocale")} hint={t("platform.term.numberLocale.hint")}>
            <input className="input font-mono" value={cfg.terminology.currencyLocale}
              onChange={(e) => patch("terminology", { currencyLocale: e.target.value })} />
          </Field>
          <div className="self-end pb-1 text-[12.5px] text-faint">
            {t("platform.term.previewLabel")}{" "}
            <span className="font-mono text-text">{currencyPreview(cfg)}</span>
          </div>
        </div>
      </Card>

      {/* ============================== Features ============================== */}
      <Card className="p-5">
        <SectionTitle
          title={t("platform.modules.title")}
          sub={t("platform.modules.sub")}
        />
        <div className="grid gap-2.5 sm:grid-cols-2">
          {(Object.keys(FEATURE_LABELS) as (keyof FeatureFlags)[]).map((key) => (
            <label key={key}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-hair bg-card2 px-3.5 py-3 transition-colors hover:bg-card">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
                checked={cfg.features[key]}
                onChange={(e) => patch("features", { [key]: e.target.checked } as Partial<FeatureFlags>)} />
              <span>
                <span className="block text-[13.5px] font-semibold text-text">
                  {t(`platform.feature.${key}.label`)}
                </span>
                <span className="block text-[12px] text-faint">{t(`platform.feature.${key}.desc`)}</span>
              </span>
            </label>
          ))}
        </div>
      </Card>

      {/* ========================== Map & shipments ========================== */}
      {cfg.features.shipments && (
        <Card className="p-5">
          <SectionTitle
            title={t("platform.map.title")}
            sub={t("platform.map.sub")}
          />
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label={t("platform.map.originCity")} hint={t("platform.map.originCity.hint")}>
              <select className="input" value={cfg.map.originCity}
                onChange={(e) => patch("map", { originCity: e.target.value })}>
                {CITY_NAMES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label={t("platform.map.subtitle")}>
              <input className="input" value={cfg.map.subtitle} maxLength={120}
                onChange={(e) => patch("map", { subtitle: e.target.value })} />
            </Field>
            <label className="flex cursor-pointer items-center gap-2.5 self-end pb-2 text-[13px] text-text">
              <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]"
                checked={cfg.map.showContextCities}
                onChange={(e) => patch("map", { showContextCities: e.target.checked })} />
              {t("platform.map.showContextCities")}
            </label>
          </div>
        </Card>
      )}

      {/* ============================== Wording ============================== */}
      <Card className="p-5">
        <SectionTitle
          title={t("platform.wording.title")}
          sub={t("platform.wording.sub")}
        />
        <CopyEditor copy={cfg.copy} onChange={patchCopy} />
      </Card>

      {/* ========================== New customer runbook ========================== */}
      <Card className="p-5">
        <SectionTitle
          title={t("platform.runbook.title")}
          sub={t("platform.runbook.sub")}
        />
        <ol className="space-y-3 text-[13.5px] leading-relaxed text-text">
          <Step n={1} title={t("platform.runbook.step1.title")}>
            Sign in to <Mono>supabase.com</Mono> and <Mono>vercel.com</Mono> with the customer&apos;s
            Google account (&quot;Continue with Google&quot;). Creating the accounts is a manual
            signup — everything after it is repeatable.
          </Step>
          <Step n={2} title={t("platform.runbook.step2.title")}>
            New project → copy the <Mono>Session pooler</Mono> connection string. In{" "}
            <Mono>prisma/schema.prisma</Mono> set <Mono>provider = &quot;postgresql&quot;</Mono>, then run{" "}
            <Mono>npx prisma migrate deploy</Mono> followed by <Mono>npm run db:seed</Mono> against it.
          </Step>
          <Step n={3} title={t("platform.runbook.step3.title")}>
            Push the customer&apos;s copy of this repo to a private GitHub repo → Vercel &quot;Import
            Project&quot;. Set env vars: <Mono>DATABASE_URL</Mono> (from step 2), a fresh 32+ char{" "}
            <Mono>JWT_SECRET</Mono>, and optionally the <Mono>ASSISTANT_*</Mono> keys.{" "}
            <Mono>postinstall</Mono> already runs <Mono>prisma generate</Mono> on deploy.
          </Step>
          <Step n={4} title={t("platform.runbook.step4.title")}>
            Log in as <Mono>platform</Mono> (change the seeded password immediately in Settings →
            Password) → open <Mono>/platform</Mono> → set branding, theme, terminology and switch
            off unused modules. Then create the customer&apos;s admin login in Settings → Users.
          </Step>
          <Step n={5} title={t("platform.runbook.step5.title")}>
            {t("platform.runbook.step5.body")}
          </Step>
        </ol>
        <div className="mt-4 rounded-xl border border-hair bg-card2 p-3.5">
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-faint2">
            {t("platform.runbook.envTemplate")}
          </div>
          <pre className="overflow-x-auto font-mono text-[12px] leading-relaxed text-muted">{`DATABASE_URL=postgresql://…  # Supabase session pooler
JWT_SECRET=…                 # openssl rand -base64 48
ASSISTANT_BASE_URL=…         # optional
ASSISTANT_API_KEY=…          # optional
ASSISTANT_MODEL=…            # optional`}</pre>
        </div>
      </Card>

      {/* ============================== Save bar ============================== */}
      <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl border border-hair bg-card p-3.5"
        style={{ boxShadow: "var(--shadow-pop)" }}>
        <div className="flex items-center gap-2 text-[13px]">
          {error ? (
            <span className="text-neg">⚠ {error}</span>
          ) : saved && !dirty ? (
            <Chip tone="pos">{t("platform.save.saved")}</Chip>
          ) : dirty ? (
            <Chip tone="warn">{t("platform.save.unsaved")}</Chip>
          ) : (
            <span className="text-faint">{t("platform.save.noChanges")}</span>
          )}
        </div>
        <div className="flex gap-2">
          <GhostButton type="button" onClick={() => { setCfg(initial); setError(null); }} disabled={!dirty || isPending}>
            {t("platform.save.revert")}
          </GhostButton>
          <PrimaryButton type="button" onClick={save} disabled={!dirty || isPending}>
            {isPending ? t("platform.save.saving") : t("platform.save.button")}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ helpers ------------------------------ */

/**
 * Copy editor — auto-generated from the copy registry (COPY_GROUPS). Every
 * registered string appears under its screen group with its default as the
 * placeholder; typing sets an override, clearing restores the default. A search
 * box filters across key, label, default and current value; groups with no
 * matches collapse away. New registry entries show up here with zero UI work.
 */
function CopyEditor({
  copy,
  onChange,
}: {
  copy: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const overrideCount = Object.keys(copy).length;

  const groups = useMemo(() => {
    if (!needle) return COPY_GROUPS;
    return COPY_GROUPS.map((g) => ({
      group: g.group,
      entries: g.entries.filter((e) =>
        [e.key, e.label, e.default, copy[e.key] ?? ""].some((s) =>
          s.toLowerCase().includes(needle),
        ),
      ),
    })).filter((g) => g.entries.length > 0);
  }, [needle, copy]);

  const totalMatches = groups.reduce((n, g) => n + g.entries.length, 0);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          className="input max-w-xs"
          placeholder="Search all wording…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="text-[12px] text-faint">
          {needle ? `${totalMatches} match${totalMatches === 1 ? "" : "es"}` : `${COPY_GROUPS.length} screens`}
          {overrideCount > 0 && ` · ${overrideCount} overridden`}
        </span>
      </div>

      {groups.length === 0 && (
        <p className="text-[13px] text-faint">No wording matches “{q}”.</p>
      )}

      <div className="space-y-4">
        {groups.map((g) => (
          <details key={g.group} open={!!needle} className="rounded-lg border border-hair bg-card2">
            <summary className="cursor-pointer list-none px-3.5 py-2.5 text-[13px] font-semibold text-ink">
              {g.group}
              <span className="ml-2 font-normal text-faint">{g.entries.length}</span>
            </summary>
            <div className="space-y-3 border-t border-hair px-3.5 py-3">
              {g.entries.map((e) => {
                const overridden = copy[e.key] !== undefined;
                const long = e.multiline || (COPY_DEFAULTS[e.key]?.length ?? 0) > 60;
                return (
                  <div key={e.key}>
                    <div className="mb-1 flex items-baseline gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-faint2">
                        {e.label}
                      </span>
                      {overridden && (
                        <button
                          type="button"
                          onClick={() => onChange(e.key, "")}
                          className="text-[11px] font-semibold text-accent-deep hover:underline"
                        >
                          reset
                        </button>
                      )}
                    </div>
                    {long ? (
                      <textarea
                        className="input min-h-[2.4rem]"
                        rows={2}
                        maxLength={600}
                        placeholder={COPY_DEFAULTS[e.key]}
                        value={copy[e.key] ?? ""}
                        onChange={(ev) => onChange(e.key, ev.target.value)}
                      />
                    ) : (
                      <input
                        className="input"
                        maxLength={600}
                        placeholder={COPY_DEFAULTS[e.key]}
                        value={copy[e.key] ?? ""}
                        onChange={(ev) => onChange(e.key, ev.target.value)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

function SectionTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-4">
      <div className="font-serif text-[17px] font-semibold text-ink">{title}</div>
      <div className="mt-0.5 text-[12.5px] text-muted">{sub}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-faint2">
        {label}
        {hint && <span className="ml-1 font-normal normal-case tracking-normal text-faint">· {hint}</span>}
      </span>
      {children}
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 shrink-0 cursor-pointer rounded-md border border-hair bg-card p-0.5" />
        <input className="input font-mono" value={value} maxLength={7}
          onChange={(e) => onChange(e.target.value)} />
      </div>
    </Field>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11.5px] font-bold text-on-accent"
        style={{ background: "var(--accent)" }}>
        {n}
      </span>
      <span>
        <span className="block font-semibold text-ink">{title}</span>
        <span className="text-muted">{children}</span>
      </span>
    </li>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-card2 px-1 py-0.5 font-mono text-[12px] text-gold">{children}</code>;
}

function hexTint(hex: string, a: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return `rgba(14,124,123,${a})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function currencyPreview(cfg: AppConfig): string {
  try {
    return new Intl.NumberFormat(cfg.terminology.currencyLocale, {
      style: "currency",
      currency: cfg.terminology.currencyCode,
      maximumFractionDigits: 2,
    }).format(1234567.89);
  } catch {
    return "invalid currency/locale";
  }
}

/** Downscale an image file to a square-ish data URL (max `size` px, JPEG/PNG kept). */
async function resizeImage(file: File, size: number, quality: number): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, size / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
    // PNG keeps transparency for logos; small enough at 192px.
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
  void quality;
}
