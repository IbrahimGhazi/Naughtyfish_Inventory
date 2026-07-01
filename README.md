# NaughtyFish — Seafood Trading, Invoicing & Ledger

Custom operations app for a seafood export/distribution business. Implements the
Phase-1 MVP scoped in [`../IMPLEMENTATION-PLAN.md`](../IMPLEMENTATION-PLAN.md).

One Next.js codebase serves both the office web dashboard and the phone screens
(the plan's "single PWA" recommendation). Billing, ledgers, and access-scoping run
server-side; the crown-jewel billing math lives in one shared module used by both
client and server.

## Stack
- **Next.js 16** (App Router) + **React 19** + **TypeScript** + **Tailwind v4**
- **Prisma 6** ORM. Dev uses **SQLite** (zero-infra); production target is **PostgreSQL**
  (swap `datasource.provider` + `DATABASE_URL`; enum-like columns are stored as `String`
  for portability).
- **Vitest** — 40 unit tests (billing engine, auth tokens, payment helpers, stock deltas).

## Run it
```bash
npm install
npx prisma migrate dev      # create/upgrade the SQLite dev DB
npm run db:seed             # two books, items, stores, parties, users
npm run dev                 # http://localhost:3000
npm test                    # 40 tests
```

**Logins** (seeded): `admin`/`admin123` (both books), `accountant`/`acc123` (C-Star only),
`delivery`/`del123` (C-Star only).

## What's built (v2 — complete, browser-verified)

- **Settings hub** (`/settings`) — full master-data customisation: stores, parties &
  suppliers, items/products (rate, glazing, active toggle), reference series (with a live
  next-number preview), and users (admin-only, bcrypt-hashed). Cross-links to banks & expenses.
- **Shipment tracking** (`/shipments`) — list with status tabs + attention-first sort + live
  ETA hints ("in 2 days" / "overdue"); create form with a **"Now" button** for departure and
  **+6h/+1d/+2d/+3d ETA presets**; detail page with a preparing→in transit→delivered timeline
  and status transitions. Optional link to invoice/consignee, carrier & driver.
- **Rich dashboard** — a hand-rolled SVG **Profit/Loss chart** (revenue vs expenses × 6 months
  + profit line), two **donut breakdowns** (invoices by channel, shipments by status), and a
  **rendered map of Pakistan** (`src/lib/geo.ts` + `src/components/PakistanMap.tsx`) plotting
  active shipments as status-colored routes with ETAs — GPS lat/long plugs straight into the
  same projection later.
- **Night mode** — class-based dark theme toggle (🌙/☀️ in the header), persisted in a cookie
  and SSR-rendered (no flash). Every page and both charts + the map are dark-aware.
- **Reports** (`/reports`) —
  **Bad debts & disputes** (`/reports/bad-debts`): write-offs and disputed amounts in the
  owner's two sub-categories, optionally linked to a real party + invoice (dispute defense),
  filter tabs, running totals, per-row delete, and a printable grouped summary.
  **Weekly statement** (`/reports/weekly`): bank-statement-style as-of report — who owes you
  (corporate vs local customers, with the open invoice numbers) and whom you owe (suppliers),
  date-range with This-week/Last-week/This-month presets, net position, and a
  **Print / Save as PDF** paper document. Pure date-range helpers unit-tested.

## Phase-1 MVP (also complete, browser-verified)

- **Auth & books** — id/password login, HMAC-signed httpOnly session cookie
  (`src/lib/auth.ts`), C-Star/NF **book switcher** (NF grant = superset per plan §4.7),
  logout. Every page redirects to `/login` when signed out.
- **Billing engine** — `src/lib/billing.ts`: primary North path (gross + final weight →
  derive glazing %), secondary gross + % path, Local zero-glazing, prawn 50/50 override,
  **glazing variance alert** (money recovery), **packet short-count alert** (dispute defense).
  One shared function for client preview and server persistence.
- **Invoicing** — `/invoices/new` live-compute form; global immutable invoice numbers
  (100 → 101 → …) + per-book/region reference series (`SSI-000001`); North/Local channels;
  party auto-fill. `/invoices/[id]` detail; **editing** keeps the invoice number, bumps the
  version (owner's "5kg short" case), recomputes server-side.
- **Dispute-defense delivery record** — every invoice creates an append-only, timestamped
  `DeliveryRecord` with snapshot line items; **edits append a new version** (supersedes
  chain) — the full history is visible on the invoice detail page, nothing is overwritten.
- **Payments & cheques** — per-party payment entry (cash-requires-note "ehtiyaatan" proof,
  promise-of-cheque flag, partial payments vs outstanding); `/cheques` register with status
  lifecycle (pending → cleared / held / bounced) and **outgoing cheques with recipient**
  ("which cheque was given to whom"); `/banks` with the **manual** estimated balance
  (never auto-decremented); dashboard **reminder 1 day before** a cheque falls due.
- **Ledgers & net position** — per-party ledger (invoices + payments with cheque numbers,
  running balance, **as-of-date** filter), dashboard receivables-net and
  **net position including supplier payables**.
- **Inventory** — per-store stock (cartons + packets + kg), receive/adjust with an
  append-only `StockMovement` ledger, **dispatch deduction** when an invoice has a source
  store, **edit-delta adjustment** when an invoice is edited; negative stock allowed and
  shown in red.
- **Expenses** — flat owner-editable categories + entries with monthly total.
- **Printing** — `/invoices/[id]/print`: clean browser print-to-PDF layout with the
  North/Local note block and a "Received by (signature)" line.
- **Access scoping** — every query flows through `entityScope()` (`src/lib/scope.ts`);
  verified: a C-Star-only user or the C-Star book view can never see NF rows.

## Before real use — the Data-Collection Gate (plan §8)
⚠️ **All seeded rates and glazing % are PLACEHOLDERS** — the source recordings state no
rate anywhere, and their glazing figures are contradictory. Collect from the owner:
every item rate, expected glazing % per item/party, reference-series live start numbers,
real prawn box figures, and the exact North/Local invoice note wording
(swap `CHANNEL_NOTE` in `src/app/invoices/[id]/print/page.tsx`).

## Later phases (see plan §8–§9)
Bad-debt/dispute ledger + weekly PDF export (Phase 2), debit voucher (Phase 2),
restricted delivery-person phone screen with optional photo (Phase 2), in-transit /
center-point stock netting, truck tracking, cheque QR (Parked).
