import type { CopyFragment } from "./types";

/**
 * Copy for the platform area. Each entry: a stable namespaced key, the English
 * default (source of truth), the editor group + a human label. Migration adds
 * entries here; render sites call t("<key>"). Keys MUST be globally unique.
 */
export const platformCopy: CopyFragment = [
  // ---- Page header ----
  { key: "platform.eyebrow", default: "Product owner", group: "Platform", label: "Page eyebrow" },
  { key: "platform.title", default: "Platform", group: "Platform", label: "Page title" },
  { key: "platform.subtitle", default: "Customize this deployment for the customer — branding, theme, business terminology and modules. This panel (and your login) is invisible to every client role.", group: "Platform", label: "Page subtitle", multiline: true },

  // ---- Branding section ----
  { key: "platform.branding.title", default: "Branding", group: "Platform", label: "Branding section title" },
  { key: "platform.branding.sub", default: "Name, logo and tagline shown on the login screen, sidebar and browser tab.", group: "Platform", label: "Branding section subtitle", multiline: true },
  { key: "platform.field.appName", default: "App name", group: "Platform", label: "‘App name’ field label" },
  { key: "platform.field.tagline", default: "Tagline", group: "Platform", label: "‘Tagline’ field label" },
  { key: "platform.field.businessType", default: "Business type", group: "Platform", label: "‘Business type’ field label" },
  { key: "platform.field.businessType.hint", default: "drives terminology suggestions below", group: "Platform", label: "‘Business type’ field hint" },
  { key: "platform.field.logo", default: "Logo", group: "Platform", label: "‘Logo’ field label" },
  { key: "platform.field.logo.hint", default: "square PNG/JPG, replaces the fish mark", group: "Platform", label: "‘Logo’ field hint" },
  { key: "platform.logo.placeholder", default: "fish", group: "Platform", label: "Logo placeholder text (no logo set)" },
  { key: "platform.logo.upload", default: "Upload…", group: "Platform", label: "Logo upload label" },
  { key: "platform.logo.remove", default: "Remove", group: "Platform", label: "Logo remove button" },
  { key: "platform.logo.readError", default: "Could not read that image — try a PNG or JPG.", group: "Platform", label: "Logo read-error message", multiline: true },

  // ---- Theme section ----
  { key: "platform.theme.title", default: "Theme", group: "Platform", label: "Theme section title" },
  { key: "platform.theme.sub", default: "Pick a preset or fine-tune the tokens. Every screen retints instantly on save — light and dark mode both.", group: "Platform", label: "Theme section subtitle", multiline: true },
  { key: "platform.color.accent", default: "Accent", group: "Platform", label: "Colour field · Accent" },
  { key: "platform.color.accentDeep", default: "Accent (deep)", group: "Platform", label: "Colour field · Accent (deep)" },
  { key: "platform.color.gold", default: "Gold / highlight", group: "Platform", label: "Colour field · Gold / highlight" },
  { key: "platform.color.sidebar", default: "Sidebar", group: "Platform", label: "Colour field · Sidebar" },
  { key: "platform.color.darkAccent", default: "Dark · accent", group: "Platform", label: "Colour field · Dark accent" },
  { key: "platform.color.darkAccentDeep", default: "Dark · accent deep", group: "Platform", label: "Colour field · Dark accent deep" },
  { key: "platform.color.darkGold", default: "Dark · gold", group: "Platform", label: "Colour field · Dark gold" },
  { key: "platform.color.darkSidebar", default: "Dark · sidebar", group: "Platform", label: "Colour field · Dark sidebar" },
  { key: "platform.theme.typefaces", default: "Typefaces", group: "Platform", label: "Typefaces subheading" },
  { key: "platform.theme.paperSurfaces", default: "Paper & surfaces", group: "Platform", label: "Paper & surfaces subheading" },
  { key: "platform.theme.lightModeNote", default: "Light mode only — dark mode keeps its tuned neutrals.", group: "Platform", label: "Paper & surfaces note" },
  { key: "platform.theme.statusColors", default: "Status & alert colors", group: "Platform", label: "Status & alert colors subheading" },
  { key: "platform.color.statusPos", default: "Positive · paid, delivered", group: "Platform", label: "Colour field · Positive status" },
  { key: "platform.color.statusWarn", default: "Warning · pending, edited", group: "Platform", label: "Colour field · Warning status" },
  { key: "platform.color.statusNeg", default: "Negative · overdue, bounced", group: "Platform", label: "Colour field · Negative status" },
  { key: "platform.color.statusInfo", default: "Info · issued, in transit", group: "Platform", label: "Colour field · Info status" },
  { key: "platform.theme.darkShadesNote", default: "dark mode derives lighter shades automatically", group: "Platform", label: "Status swatches note" },

  // ---- Theme mini-preview ----
  { key: "platform.preview.dashboard", default: "Dashboard", group: "Platform", label: "Theme preview · Dashboard nav item" },
  { key: "platform.preview.invoices", default: "Invoices", group: "Platform", label: "Theme preview · Invoices nav item" },
  { key: "platform.preview.parties", default: "Parties", group: "Platform", label: "Theme preview · Parties nav item" },
  { key: "platform.preview.eyebrow", default: "Preview", group: "Platform", label: "Theme preview eyebrow" },
  { key: "platform.preview.newInvoice", default: "+ New invoice", group: "Platform", label: "Theme preview · sample button" },

  // ---- Terminology section ----
  { key: "platform.terminology.title", default: "Terminology", group: "Platform", label: "Terminology section title" },
  { key: "platform.terminology.sub", default: "What things are called across the app — so a crate of mangoes never reads like a carton of fish. Schema and math are untouched.", group: "Platform", label: "Terminology section subtitle", multiline: true },
  { key: "platform.term.sellableUnit", default: "Sellable unit (singular / plural)", group: "Platform", label: "‘Sellable unit’ field label" },
  { key: "platform.term.outerPackage", default: "Outer package (singular / plural)", group: "Platform", label: "‘Outer package’ field label" },
  { key: "platform.term.innerPackage", default: "Inner package (singular / plural)", group: "Platform", label: "‘Inner package’ field label" },
  { key: "platform.term.weightUnit", default: "Weight/measure unit", group: "Platform", label: "‘Weight/measure unit’ field label" },
  { key: "platform.term.deductionConcept", default: "Deduction concept", group: "Platform", label: "‘Deduction concept’ field label" },
  { key: "platform.term.deductionConcept.hint", default: "glazing for seafood; wastage, trim…", group: "Platform", label: "‘Deduction concept’ field hint" },
  { key: "platform.term.channels", default: "Channels (north / local)", group: "Platform", label: "‘Channels’ field label" },
  { key: "platform.term.channels.hint", default: "display names only", group: "Platform", label: "‘Channels’ field hint" },
  { key: "platform.term.currency", default: "Currency (ISO code)", group: "Platform", label: "‘Currency’ field label" },
  { key: "platform.term.currency.hint", default: "PKR, AED, USD…", group: "Platform", label: "‘Currency’ field hint" },
  { key: "platform.term.numberLocale", default: "Number locale", group: "Platform", label: "‘Number locale’ field label" },
  { key: "platform.term.numberLocale.hint", default: "en-PK, en-AE, en-US…", group: "Platform", label: "‘Number locale’ field hint" },
  { key: "platform.term.previewLabel", default: "Preview:", group: "Platform", label: "Currency preview label" },

  // ---- Modules section ----
  { key: "platform.modules.title", default: "Modules", group: "Platform", label: "Modules section title" },
  { key: "platform.modules.sub", default: "Switch off what this customer doesn't need — nav entries, dashboard cards and form fields disappear together.", group: "Platform", label: "Modules section subtitle", multiline: true },
  { key: "platform.feature.glazing.label", default: "Glazing / weight adjustment", group: "Platform", label: "Module · Glazing label" },
  { key: "platform.feature.glazing.desc", default: "Per-line % fields + over-deduction alerts on invoices", group: "Platform", label: "Module · Glazing description" },
  { key: "platform.feature.packaging.label", default: "Packaging counts", group: "Platform", label: "Module · Packaging label" },
  { key: "platform.feature.packaging.desc", default: "Carton/packet fields + short-count alerts", group: "Platform", label: "Module · Packaging description" },
  { key: "platform.feature.shipments.label", default: "Shipments", group: "Platform", label: "Module · Shipments label" },
  { key: "platform.feature.shipments.desc", default: "Shipment tracking page, dashboard map and 'on the road' card", group: "Platform", label: "Module · Shipments description" },
  { key: "platform.feature.cheques.label", default: "Cheques", group: "Platform", label: "Module · Cheques label" },
  { key: "platform.feature.cheques.desc", default: "Cheque registry, due-soon reminders", group: "Platform", label: "Module · Cheques description" },
  { key: "platform.feature.banks.label", default: "Banks", group: "Platform", label: "Module · Banks label" },
  { key: "platform.feature.banks.desc", default: "Bank accounts + estimated balance KPI", group: "Platform", label: "Module · Banks description" },
  { key: "platform.feature.expenses.label", default: "Expenses", group: "Platform", label: "Module · Expenses label" },
  { key: "platform.feature.expenses.desc", default: "Expense categories/entries + P&L expense series", group: "Platform", label: "Module · Expenses description" },
  { key: "platform.feature.reports.label", default: "Reports", group: "Platform", label: "Module · Reports label" },
  { key: "platform.feature.reports.desc", default: "Bad debts, weekly statement and future reports", group: "Platform", label: "Module · Reports description" },
  { key: "platform.feature.processes.label", default: "Processes", group: "Platform", label: "Module · Processes label" },
  { key: "platform.feature.processes.desc", default: "Optional production/processing tracker with costs", group: "Platform", label: "Module · Processes description" },
  { key: "platform.feature.secondBook.label", default: "Second book (NF)", group: "Platform", label: "Module · Second book label" },
  { key: "platform.feature.secondBook.desc", default: "The white/black two-book switcher in the top bar", group: "Platform", label: "Module · Second book description" },
  { key: "platform.feature.assistant.label", default: "AI assistant", group: "Platform", label: "Module · AI assistant label" },
  { key: "platform.feature.assistant.desc", default: "The ask-the-ledger chat bubble", group: "Platform", label: "Module · AI assistant description" },

  // ---- Map & shipments section ----
  { key: "platform.map.title", default: "Map & shipments", group: "Platform", label: "Map & shipments section title" },
  { key: "platform.map.sub", default: "Where this customer dispatches FROM — the map, dashboard routes and shipment labels all follow it. (Not everyone ships out of Karachi.)", group: "Platform", label: "Map & shipments section subtitle", multiline: true },
  { key: "platform.map.originCity", default: "Origin city", group: "Platform", label: "‘Origin city’ field label" },
  { key: "platform.map.originCity.hint", default: "must be on the Pakistan map", group: "Platform", label: "‘Origin city’ field hint" },
  { key: "platform.map.subtitle", default: "Shipments page subtitle", group: "Platform", label: "‘Shipments page subtitle’ field label" },
  { key: "platform.map.showContextCities", default: "Show faded context cities on the map", group: "Platform", label: "Context-cities checkbox label" },

  // ---- Wording section ----
  { key: "platform.wording.title", default: "Wording", group: "Platform", label: "Wording section title" },
  { key: "platform.wording.sub", default: "Rewrite any text in the app — screen titles, buttons, labels, empty-state messages. Leave a field blank to keep the default. Grouped by screen; use search to jump to a phrase.", group: "Platform", label: "Wording section subtitle", multiline: true },

  // ---- New customer runbook ----
  { key: "platform.runbook.title", default: "New customer runbook", group: "Platform", label: "Runbook section title" },
  { key: "platform.runbook.sub", default: "One codebase, one deployment per customer — on THEIR Supabase and Vercel accounts, signed up with their Gmail.", group: "Platform", label: "Runbook section subtitle", multiline: true },
  { key: "platform.runbook.step1.title", default: "Accounts (customer's Gmail)", group: "Platform", label: "Runbook step 1 title" },
  { key: "platform.runbook.step2.title", default: "Supabase project (the database)", group: "Platform", label: "Runbook step 2 title" },
  { key: "platform.runbook.step3.title", default: "Vercel project (the app)", group: "Platform", label: "Runbook step 3 title" },
  { key: "platform.runbook.step4.title", default: "Make it theirs (this panel)", group: "Platform", label: "Runbook step 4 title" },
  { key: "platform.runbook.step5.title", default: "Handover checklist", group: "Platform", label: "Runbook step 5 title" },
  { key: "platform.runbook.step5.body", default: "Real items + rates entered · opening balances loaded · reference series start numbers set · seeded demo logins removed/re-passworded · backup schedule confirmed.", group: "Platform", label: "Runbook step 5 body (handover checklist)", multiline: true },
  { key: "platform.runbook.envTemplate", default: "Env template (Vercel → Settings → Environment Variables)", group: "Platform", label: "Env template heading" },

  // ---- Save bar ----
  { key: "platform.save.saved", default: "Saved — every screen retinted", group: "Platform", label: "Save bar · saved chip" },
  { key: "platform.save.unsaved", default: "Unsaved changes", group: "Platform", label: "Save bar · unsaved chip" },
  { key: "platform.save.noChanges", default: "No changes yet.", group: "Platform", label: "Save bar · no changes" },
  { key: "platform.save.revert", default: "Revert", group: "Platform", label: "Save bar · Revert button" },
  { key: "platform.save.saving", default: "Saving…", group: "Platform", label: "Save bar · saving state" },
  { key: "platform.save.button", default: "Save configuration", group: "Platform", label: "Save bar · Save button" },
];
