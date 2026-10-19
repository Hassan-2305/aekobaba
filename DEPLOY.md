# Deploying Aekobaba

Single Next.js 15 (App Router) app on Vercel; Postgres, Auth, Storage, and
Realtime come from Supabase. `vercel.json` pins the Next.js framework preset
and the `iad1` region.

## One-time setup

1. Work through **docs/supabase-setup.md** — the Supabase project, migrations,
   role RPC, Storage buckets, and Auth providers. Section 9 there is the
   user-config launch checklist.
2. Import this repo into Vercel. Framework preset **Next.js** (set by
   `vercel.json`); build command `npm run build` (the default); install
   command `npm ci` (the default — it runs `prisma generate` via postinstall).

## Environment variables (Vercel → Settings → Environment Variables)

| Variable                        | Scope            | Notes                                                                       |
| ------------------------------- | ---------------- | --------------------------------------------------------------------------- |
| `DATABASE_URL`                  | Runtime          | Supabase **pooler** connection string, port **6543** (transaction mode)     |
| `DIRECT_URL`                    | Build/CLI        | Supabase **direct** connection, port **5432** — used by Prisma migrations   |
| `NEXT_PUBLIC_SUPABASE_URL`      | Client + server  | Supabase project URL                                                        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + server  | Anon key — access constrained by Row Level Security                         |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server only      | Bypasses RLS — never expose to the browser                                  |
| `NEXT_PUBLIC_SITE_URL`          | Client + server  | Production URL (e.g. `https://app.aekobaba.com`) — absolute OG/metadata URLs |
| `GOOGLE_PLACES_API_KEY`         | Server only      | Optional — live Google review cards on product pages (Places API (New))     |
| `TRUSTPILOT_API_KEY`            | Server only      | Optional — live Trustpilot review cards (key from a Trustpilot business account) |

Secrets live in the Vercel project, never in the repo. `.env.example` mirrors
the same list for local development.

## Migrations

Prisma migrations are applied from a machine with `DIRECT_URL` set:

```bash
npx prisma migrate deploy
npm run db:seed   # idempotent — updates in place, keyed on supplier slug + product title
```

There is no migration step in the Vercel build: schema changes ship through
`prisma migrate deploy` (run manually or from CI), then the deploy picks them
up. The build itself needs no database.

## What is degraded without Supabase credentials

Until the launch checklist is completed, deploys still build and serve public
catalog pages only if `DATABASE_URL` points at a reachable Postgres. Auth
sessions, Storage uploads, and Realtime status pushes stay inactive without
`NEXT_PUBLIC_SUPABASE_URL` + keys — the app's dev harness and the SSE bridge
(documented in the code) are development-time fallbacks, not deploy targets.

## Quote workflow (Aekobaba as mediator)

Buyers submit a Quote Basket → one RFQ is stored (with a reference like
`AEK-261019-7KQ4`) and the team is emailed at `TEAM_INBOX_EMAIL`
(default teamaekovera@gmail.com). Suppliers are **never** emailed
automatically: the team works each request in **Admin → Quote requests**
(Inbox / Outreach / Samples / Activity), uses **Send email** (opens your own
mail app with the RFQ composed), and records replies, quotes and samples by hand.

Setup, once:

1. `npx prisma migrate deploy` (adds the workflow tables — additive only).
2. Sign up on the site with the team account, then make it an admin:
   `npm run admin:grant -- teamaekovera@gmail.com` (repeat for each teammate).
3. Email notifications: create a Resend account, verify a sending domain, and
   set `RESEND_API_KEY` and `EMAIL_FROM` in Vercel. Until then emails wait in
   **Admin → Email outbox** (nothing is lost; press *Retry undelivered* later).
4. Set `CRON_SECRET` in Vercel — the daily cron (`vercel.json`) retries any
   undelivered email.
5. Partner meetings: create a Google Calendar appointment schedule on the team
   calendar and put its booking link in `NEXT_PUBLIC_PARTNER_BOOKING_URL`.
6. For each supplier you contact, add its verified business email on the
   request page (stored on the supplier, reused next time).

Direct supplier access to RFQs (the supplier lead inbox) is off while the team
mediates; set `SUPPLIER_DIRECT_LEADS=on` to re-enable it later.
