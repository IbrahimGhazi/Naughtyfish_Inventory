# Handoff → Claude Code

Context: this repo was just upgraded to a white-label product (see git status — all uncommitted).
New since last commit: platform panel (`/platform`, role `platform_admin`, login `platform`/`platform123`),
delivery portal (`/delivery`, drafts → office approval, package photos), optional Processes module,
role gating on every page/action, dashboard analytics (aging / top debtors / payment mix),
and a config system (`src/lib/config-shared.ts` + `AppConfig` table) driving branding, theme,
fonts, surfaces, status colors, terminology, feature toggles and map origin.

## Do first (blocking / safety)

1. **`npx prisma generate`** — the local client is stale (schema gained `AppConfig` + `Process`).
   Already wired as `postinstall`; run it once now. Then `npm run dev` and smoke-test.
2. **Commit + push to a private remote.** The whole build sits on one working tree
   (roadmap M0.1). Suggested first commit message: `v3: white-label platform, delivery portal, processes, role gating`.
   Note: `prisma/dev.db.pre-v3.bak` is a pre-migration backup — commit or stash outside the repo, don't delete.
3. **Manual smoke test** (I could not run the app in my sandbox — no Prisma engine):
   - login `platform`/`platform123` → `/platform`: change theme preset, fonts, surface → save → verify every screen retints; upload a logo.
   - login `delivery`/`del123` → confined to `/delivery`; create invoice → shows as draft; attach photo.
   - login `admin` → dashboard shows draft banner → open invoice → Approve.
   - `/processes`: create → start → complete with "post to expenses" → entry appears in `/expenses`.

## Next build targets (roadmap order)

4. **M0.4 — bounced cheque must reverse the linked payment** (currently manufactures disputes).
5. **M0.7 — per-book invoice number series** (global series leaks black-book gaps to auditors); needs a small migration.
6. **M1.2 — search/filters/pagination** on Invoices, Parties (add outstanding-balance column), Cheques.
7. **M1.1 — void/reversal entries** for payments/cheques/expenses (append-only, admin-gated).
8. **M2.3 — Postgres/Supabase cut-over**: swap provider, regenerate migrations, fix invoice-number
   race (max+1 under concurrency → transaction with unique retry), review Decimal money math.
   The `/platform` runbook documents the per-customer Supabase+Vercel model.
9. **M2.4 — phone layout/PWA**: the delivery portal is phone-first but the shell sidebar isn't
   responsive yet; delivery users need a bottom-nav/hamburger on small screens.

## Parked (awaiting Ghazi)

- **Shipments-map redesign** from `../Redesign_map.zip` (interactive routes, floating detail card,
  filter chips). Design ready in `.redesign_map_extract/`; user hasn't green-lit implementation.
- **"saas" design handoff** — user intends to add it (theme/customization ideas for `/platform`);
  not in the folder yet. When it appears, align panel presets to it.

## Gotchas

- `src/lib/config-shared.ts` must stay prisma/react-free (client components import it);
  server load/save lives in `src/lib/config.ts`.
- Font trios in `src/app/layout.tsx` are module-scope (next/font constraint) and must stay
  in sync with `FONT_PRESETS` keys.
- Delivery drafts still post stock + the immutable delivery record at creation (goods physically
  left); approval only flips `draft → submitted`. Corrections go through the versioned edit flow.
- `scripts/apply-v3-migration.mjs` exists only because my sandbox couldn't run Prisma engines;
  on this machine use normal `prisma migrate dev`.
