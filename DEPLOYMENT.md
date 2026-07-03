# Deployment — Vercel + Supabase (PostgreSQL)

This app now targets **PostgreSQL** (Supabase) in production. Dev history used
SQLite; the Prisma `datasource` is now `postgresql` and the migrations under
`prisma/migrations/` are Postgres-native (a single squashed `..._init`).

## Supabase project

- Project: **naughtyfish-inventory** (org `emergy`), region `ap-southeast-1`.
- Schema applied via the `..._init` migration (all 25 tables) and baselined in
  `_prisma_migrations`, so `prisma migrate deploy` is a no-op against it.
- Seeded with the two books (C-Star / NF), the four demo users, 6 items × 2
  books, 4 stores, 5 parties, 3 reference series, 1 bank, glazing baselines and
  expense categories — the same data as `prisma/seed.ts`.

Seeded logins (⚠️ change before real use): `admin`/`admin123`,
`platform`/`platform123`, `accountant`/`acc123`, `delivery`/`del123`.

## Required environment variables (set these in Vercel → Project → Settings → Environment Variables)

| Variable | Purpose | Where to get it |
| --- | --- | --- |
| `DATABASE_URL` | Runtime Prisma connection. Use the **Transaction pooler** (port `6543`) for serverless. | Supabase → Project Settings → Database → Connection string → "Transaction pooler". Append `?pgbouncer=true&connection_limit=1`. |
| `DIRECT_URL` | Direct connection (port `5432`) used by Prisma for migrations. | Supabase → Project Settings → Database → Connection string → "Direct connection". |
| `JWT_SECRET` | HMAC key for the signed session cookie. Must be ≥32 chars and **not** the dev default. | Generate: `openssl rand -base64 48` |

Optional (only if you want the in-app AI assistant): `ASSISTANT_API_KEY` (or
`GROQ_API_KEY`), `ASSISTANT_BASE_URL`, `ASSISTANT_MODEL`.

Example (fill in your DB password from the Supabase dashboard):

```
DATABASE_URL="postgresql://postgres.knbyfaqzatpwrnqmkjcx:[YOUR-DB-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.knbyfaqzatpwrnqmkjcx:[YOUR-DB-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
JWT_SECRET="<openssl rand -base64 48>"
```

> Copy the exact pooler host from the dashboard — the `aws-0`/`aws-1` prefix can
> differ per project. If you never saw the DB password, reset it under
> Database → Database password.

## Build

Vercel auto-detects Next.js. `npm run build` runs `prisma generate && next build`
(the explicit `prisma generate` guards against Vercel's dependency cache skipping
`postinstall` and shipping a stale client). Every route is server-rendered on
demand, so the build does not touch the database.

## Applying future schema changes

1. Edit `prisma/schema.prisma`.
2. `DATABASE_URL=$DIRECT_URL npx prisma migrate dev --name <change>` locally
   (or `prisma migrate deploy` in CI against `DIRECT_URL`).

## Security note — Row Level Security

Supabase auto-exposes every table through its REST API (`/rest/v1`) to the public
`anon` key. This app does **not** use that API — it connects with Prisma over the
Postgres protocol as the database owner, which bypasses RLS — so enabling RLS with
no policies locks the public REST API without affecting the app. Recommended:
enable RLS on all tables (see Supabase → Database → Policies).
