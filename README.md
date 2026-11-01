# Aekobaba Packaging Marketplace

A B2B marketplace where CPG brands find source-verified packaging products and
send **one quote request to many suppliers**. Every price, MOQ and lead time
shown is a dated snapshot from the supplier's own public page. When a supplier
doesn't publish something, the UI says "Ask the supplier", never an estimate.

Aekobaba acts as the **mediator**: buyer requests land with the Aekobaba team,
who contact suppliers, collect quotes and samples, and share them back with the
buyer. Suppliers are never emailed automatically.

---

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Routes](#routes)
- [API reference](#api-reference)
- [Data model](#data-model)
- [Auth and roles](#auth-and-roles)
- [Quote (RFQ) workflow](#quote-rfq-workflow)
- [Email notifications](#email-notifications)
- [Catalog data and seeding](#catalog-data-and-seeding)
- [Testing and CI](#testing-and-ci)
- [Deployment](#deployment)
- [Further docs](#further-docs)

---

## Features

**For buyers (brands)**

- Searchable catalog with URL-encoded filters, facets, sorting and spec filters (`/results`)
- Product pages with gallery, quantity-break pricing, configurator, supplier reviews and provenance line
- Printable spec sheets and CSV spec export per product
- Product comparison tray
- **Quote Basket**: collect products from many suppliers and send one RFQ. Guests keep it in `localStorage`; signed-in users get it synced to the database across devices
- "Get a quote" / "Get a sample" on any product page, with an optional design file upload and no account needed
- Account area with live status for every request

**For suppliers**

- Supplier directory and public supplier profiles
- "List your company" and "fetch my products" applications
- Claim an existing listing
- Partner programme pages, a demo lead dashboard and an inbox preview
- Optional direct lead inbox (off by default, see `SUPPLIER_DIRECT_LEADS`)

**For the Aekobaba team (admin)**

- Dashboard with quote requests, product inquiries, supplier applications, categories, suppliers and tiers
- Per-RFQ workspace: outreach, supplier quotes, samples and an activity log
- "Send email" composes the supplier RFQ in your own mail client (`mailto:`)
- Email outbox with retry, plus global search (Ctrl/⌘ K)

---

## Tech stack

| Area         | Choice                                                          |
| ------------ | --------------------------------------------------------------- |
| Framework    | Next.js 15 (App Router, Turbopack), React 19, TypeScript strict |
| Styling      | Tailwind CSS 4                                                  |
| Database     | PostgreSQL (Supabase) via Prisma 7 + `@prisma/adapter-pg`       |
| Auth         | Supabase Auth (`@supabase/ssr`): Email, Magic Link, Google      |
| Storage      | Supabase Storage                                                |
| Client state | Zustand (basket, compare tray)                                  |
| Validation   | Zod 4                                                           |
| Email        | Resend HTTP API (outbox pattern)                                |
| Tests        | Vitest                                                          |
| Hosting      | Vercel (`iad1`, daily cron)                                     |
| CI           | GitHub Actions: lint, typecheck, test, build                    |

---

## Getting started

**Prerequisites:** Node.js 20+, npm 10+, and a PostgreSQL database (local or Supabase).

```bash
# 1. Install (postinstall runs `prisma generate`)
npm install

# 2. Create .env in the project root (see the Environment variables section)

# 3. Apply the database schema
npm run db:migrate:deploy

# 4. Load the catalog (idempotent, safe to re-run)
npm run db:seed

# 5. Start the dev server
npm run dev
```

Open <http://localhost:3000>.

**Make yourself an admin:** sign up on the site, then run

```bash
npm run admin:grant -- you@example.com
npm run admin:grant -- you@example.com --revoke   # back to BRAND
```

### Local development without Supabase

There's a dev-only auth harness for walking the supplier and admin screens
without live Supabase credentials:

1. Set `AEKOBABA_DEV_AUTH=1` in `.env` (ignored in production builds).
2. Load the fixture users into a **local** database: `scripts/dev-fixtures.sql`
   (never run it against a shared or production database).
3. The role comes from the `aekobaba-dev-role` cookie (`BRAND`, `SUPPLIER` or `ADMIN`).

---

## Environment variables

Create a `.env` file in the project root. Never commit it.

| Variable                          | Required | Used for                                                            |
| --------------------------------- | -------- | ------------------------------------------------------------------- |
| `DATABASE_URL`                    | Yes      | App database connection (Supabase **pooler**, port 6543)            |
| `DIRECT_URL`                      | Yes      | Migrations and seed scripts (Supabase **direct**, port 5432)        |
| `NEXT_PUBLIC_SUPABASE_URL`        | Yes\*    | Supabase project URL                                                |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Yes\*    | Supabase anon key (access limited by RLS)                           |
| `NEXT_PUBLIC_SITE_URL`            | Yes      | Absolute URLs in metadata and emails                                |
| `RESEND_API_KEY`                  | No       | Email delivery. Without it, emails wait in the outbox               |
| `EMAIL_FROM`                      | No       | Sender address on a Resend-verified domain                          |
| `TEAM_INBOX_EMAIL`                | No       | Where team notifications go (default `teamaekovera@gmail.com`)      |
| `CRON_SECRET`                     | No       | Protects `/api/cron/outbox`                                         |
| `NEXT_PUBLIC_PARTNER_BOOKING_URL` | No       | Google Calendar booking link for partner meetings                   |
| `NEXT_PUBLIC_CONTACT_EMAIL`       | No       | Public contact address                                              |
| `GOOGLE_PLACES_API_KEY`           | No       | Live Google review cards on product pages                           |
| `TRUSTPILOT_API_KEY`              | No       | Live Trustpilot review cards                                        |
| `SUPPLIER_DIRECT_LEADS`           | No       | `on` lets suppliers see RFQs directly (off while the team mediates) |
| `AEKOBABA_DEV_AUTH`               | No       | `1` turns on the dev auth harness (never active in production)      |

\* Without Supabase keys the public catalog still works, but auth, uploads and
realtime don't. `VERCEL_URL` and `VERCEL_PROJECT_PRODUCTION_URL` are read
automatically on Vercel as fallbacks for the site URL.

---

## Scripts

| Command                     | What it does                                           |
| --------------------------- | ------------------------------------------------------ |
| `npm run dev`               | Dev server (Turbopack)                                 |
| `npm run build`             | Production build                                       |
| `npm run start`             | Serve the production build                             |
| `npm run lint`              | ESLint                                                 |
| `npm run typecheck`         | `tsc --noEmit`                                         |
| `npm test`                  | Vitest, single run                                     |
| `npm run test:watch`        | Vitest watch mode                                      |
| `npm run format`            | Prettier, write                                        |
| `npm run format:check`      | Prettier, check                                        |
| `npm run db:migrate:deploy` | Apply committed Prisma migrations (needs `DIRECT_URL`) |
| `npm run db:seed`           | Import `data/aekobaba-seed.json` into the database     |
| `npm run admin:grant`       | Grant or revoke the ADMIN role: `-- email [--revoke]`  |

---

## Project structure

```
aekobaba/
├── .github/workflows/ci.yml     # Lint, typecheck, test, build on PRs to main
├── data/
│   ├── aekobaba-seed.json       # Catalog source of truth (categories, suppliers, products)
│   ├── seed-schema.ts           # Zod schema enforcing provenance on every row
│   └── image-mapping.ts         # Maps seed products to images in /public
├── docs/
│   ├── supabase-setup.md        # Supabase project, RPC, buckets, auth, launch checklist
│   └── partners/                # Research notes per featured partner
├── prisma/
│   ├── schema.prisma            # Domain schema (28 models)
│   └── migrations/              # Committed SQL migrations, never hand-edited
├── public/
│   ├── brand/  hero/            # Site artwork
│   ├── products/                # Product photos, cutouts, multi-angle views
│   ├── partners/                # Partner imagery (Berlin Packaging, Daehung Pack)
│   └── suppliers/               # Per-supplier product images (e.g. packmojo/)
├── scripts/
│   ├── seed.ts                  # Idempotent catalog importer
│   ├── grant-admin.ts           # Role management CLI
│   └── dev-fixtures.sql         # Local-only fixture users for the dev harness
├── src/
│   ├── middleware.ts            # Session refresh + role guards (/admin, /supplier)
│   ├── app/                     # Next.js App Router: pages and API routes
│   ├── components/
│   │   ├── account/             # Profile form
│   │   ├── admin/               # Admin shell, quote workspace, queues, tiers
│   │   ├── auth/                # Sign-in / sign-up forms
│   │   ├── brand/               # Site header, footer, theme toggle, account menu
│   │   ├── catalog/             # Product card/detail, filters, results, reviews
│   │   ├── compare/             # Compare tray
│   │   ├── home/                # Landing page sections
│   │   ├── quotes/              # Basket and request views
│   │   ├── supplier/            # Application, claim, inbox
│   │   ├── ui/  workspace/      # Shared UI primitives and layout shell
│   └── lib/
│       ├── db.ts                # Prisma client singleton
│       ├── admin/               # Category/tier logic, access gates
│       ├── auth/                # Session, guards, roles, provisioning, dev auth
│       ├── basket/              # Zustand basket store + server sync hook
│       ├── catalog/             # Queries, filters, specs, view models, caching
│       ├── compare/             # Compare store and comparison rows
│       ├── inquiries/           # Product-page quote/sample requests
│       ├── integrations/        # External product actions
│       ├── notify/              # Email outbox and templates
│       ├── quotes/              # RFQ submit, MOQ checks, live status, storage
│       ├── reviews/             # Live Google / Trustpilot reviews
│       ├── rfq/                 # Mediated workflow: statuses, admin actions, mailto
│       ├── supabase/            # Browser/server clients, env parsing
│       └── supplier/            # Claim, dashboard, inbox
├── DEPLOY.md                    # Vercel deployment guide
├── next.config.ts  prisma.config.ts  vercel.json  vitest.config.mts
└── package.json
```

Tests sit next to the code they cover (`*.test.ts`).

---

## Routes

### Public

| Path                              | Page                                                  |
| --------------------------------- | ----------------------------------------------------- |
| `/`                               | Landing page                                          |
| `/results`                        | Catalog search, filters and sorting                   |
| `/products/[id]`                  | Product detail                                        |
| `/products/[id]/spec`             | Printable spec sheet                                  |
| `/products/[id]/spec.csv`         | Spec sheet as CSV                                     |
| `/suppliers`                      | Supplier directory                                    |
| `/suppliers/[slug]`               | Supplier profile                                      |
| `/suppliers/[slug]/claim`         | Claim this listing                                    |
| `/suppliers/[slug]/dashboard`     | Partner lead dashboard (demo)                         |
| `/suppliers/[slug]/inbox-preview` | Partner inbox preview (sample data, labelled as such) |
| `/partners`, `/partners/apply`    | Partner collection and application                    |
| `/list-your-company`              | Supplier listing / product fetch request              |
| `/basket`                         | Quote Basket                                          |
| `/basket/requests`                | Product-page requests sent from this browser          |
| `/auth/sign-in`, `/auth/sign-up`  | Authentication                                        |

### Signed in

| Path                           | Role     | Page                               |
| ------------------------------ | -------- | ---------------------------------- |
| `/account`                     | Any      | Profile                            |
| `/account/requests[/id]`       | Any      | My quote requests with live status |
| `/supplier/claim`              | Any      | Claim a listing                    |
| `/supplier`, `/supplier/inbox` | SUPPLIER | Supplier home and lead inbox       |
| `/admin`                       | ADMIN    | Team dashboard                     |
| `/admin/quotes[/id]`           | ADMIN    | RFQ list and workspace             |
| `/admin/inquiries`             | ADMIN    | Product-page quote/sample requests |
| `/admin/applications[/id]`     | ADMIN    | Supplier applications              |
| `/admin/suppliers`             | ADMIN    | Supplier queue and tiers           |
| `/admin/categories`            | ADMIN    | Category manager                   |
| `/admin/notifications`         | ADMIN    | Email outbox                       |
| `/admin/search`                | ADMIN    | Global search                      |

---

## API reference

All routes live under `src/app/api/`.

| Method & path                                                           | Access    | Purpose                                                             |
| ----------------------------------------------------------------------- | --------- | ------------------------------------------------------------------- |
| `GET  /api/catalog/menu`                                                | Public    | Live listing counts for the header mega menu                        |
| `POST /api/inquiries`                                                   | Public    | Product-page quote/sample request (multipart, optional design file) |
| `POST /api/inquiries/lookup`                                            | Public    | Live status for this browser's requests (checked by access token)   |
| `GET/PUT /api/basket`                                                   | Signed in | Persistent basket (merges the guest basket on sign-in)              |
| `POST /api/quotes`                                                      | Buyer     | Submit the Quote Basket as one RFQ                                  |
| `GET  /api/quotes/[id]/events`                                          | Owner     | SSE stream of live item status (dev realtime bridge)                |
| `PATCH /api/account`                                                    | Signed in | Update profile                                                      |
| `POST /api/applications`                                                | Signed in | Supplier listing / partnership application                          |
| `POST /api/supplier/claim`                                              | Signed in | Claim a supplier listing                                            |
| `PATCH /api/supplier/leads/[itemId]`                                    | SUPPLIER  | Respond to a lead (when direct leads are on)                        |
| `POST /api/admin/categories`, `PATCH/DELETE /api/admin/categories/[id]` | ADMIN     | Category management                                                 |
| `PATCH /api/admin/suppliers/[id]/tier`                                  | ADMIN     | Set a supplier tier                                                 |
| `PATCH /api/admin/quotes/[id]`                                          | ADMIN     | RFQ workflow actions                                                |
| `PATCH /api/admin/inquiries/[id]`, `GET .../file`                       | ADMIN     | Inquiry status, design file download                                |
| `PATCH /api/admin/applications/[id]`                                    | ADMIN     | Review applications                                                 |
| `POST /api/admin/outbox/retry`                                          | ADMIN     | Retry undelivered emails                                            |
| `GET  /api/cron/outbox`                                                 | Cron      | Daily email retry (needs `CRON_SECRET`)                             |

---

## Data model

Defined in `prisma/schema.prisma`. Main groups:

| Group             | Models                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| Identity          | `User` (role: `BRAND` / `SUPPLIER` / `ADMIN`), `BrandProfile`                                                      |
| Catalog           | `Supplier`, `Category`, `Product`, `QuantityBreak`, `Image`, `Review`, `Certification`                             |
| Quote requests    | `QuoteRequest`, `QuoteRequestItem`, `Basket`, `BasketItem`                                                         |
| Mediated workflow | `QuoteRequestSupplier`, `SupplierOutreach`, `SupplierQuote`, `SupplierQuoteLine`, `QuoteActivity`, `SampleRequest` |
| Product inquiries | `Inquiry`, `InquiryFile`                                                                                           |
| Supplier growth   | `SupplierApplication`, `PartnerMeeting`, `PartnerSubscription`, `FeaturedPlacement`                                |
| Other             | `NotificationOutbox`, `SavedList`, `SavedListItem`                                                                 |

Schema changes go through new Prisma migrations in `prisma/migrations/`, never
hand-written SQL against the live database.

---

## Auth and roles

- **Supabase Auth** handles sign-in (Email, Magic Link, Google). On first sign-in a
  `User` row is provisioned with the `BRAND` role.
- **`src/middleware.ts`** refreshes the session cookie on every request and guards
  `/admin/*` (ADMIN) and `/supplier/*` (SUPPLIER). `/supplier/claim` only needs a
  signed-in user.
- The role is read **live from the database** through the `current_user_role`
  RPC (see `docs/supabase-setup.md`), never from the JWT. Any failure means
  "no access"; the guard never fails open.
- Page-level checks in `src/lib/auth/page-guards.ts` repeat the check on the server.

---

## Quote (RFQ) workflow

1. A buyer fills the Quote Basket and submits it. One `QuoteRequest` is stored with
   a reference like `AEK-261019-7KQ4`, and the team is emailed.
2. In **Admin → Quote requests**, the team works each request through independent
   tracks:
   - **Request stage:** New → In progress → Quotes shared → Completed / Cancelled
   - **Outreach (per supplier):** Not contacted → Email prepared → Contacted → Replied / Follow-up needed
   - **Commercial:** Awaiting quote → Quote received → Reviewing → Shared with customer → Accepted / Declined / Expired
   - **Samples:** Not requested → Requested → Approved → Dispatched → Delivered
   - **Customer feedback:** Awaiting → Approved / Changes requested / Rejected
3. **Send email** opens the team's own mail client with the RFQ pre-written.
   Replies, quotes and samples are recorded by hand, and every action is logged
   in `QuoteActivity`.
4. The buyer sees live status under `/account/requests`.

Supplier direct access to RFQs is off while the team mediates. Set
`SUPPLIER_DIRECT_LEADS=on` to turn it on.

---

## Email notifications

Notifications use an **outbox pattern** (`src/lib/notify/outbox.ts`). The event
(an RFQ or an application) and its email row are written in one transaction, then
delivered through Resend after commit, with up to 8 attempts.

- Without `RESEND_API_KEY` and `EMAIL_FROM`, emails stay `PENDING` in
  **Admin → Email outbox**, so nothing is lost.
- A daily Vercel cron (`vercel.json`, 13:00 UTC) calls `/api/cron/outbox` to retry
  undelivered emails. Admins can also press **Retry undelivered**.

---

## Catalog data and seeding

`data/aekobaba-seed.json` is the catalog source of truth: **25 categories, 18
suppliers and about 530 products** (Berlin Packaging, TricorBraun, EcoEnclose,
Sticker Mule, PackMojo, Daehung Pack and others).

`npm run db:seed`:

- validates every row against `data/seed-schema.ts`, so no row goes in without a
  source URL and capture date
- upserts categories and suppliers by slug, and products by `(supplier, title)`
- replaces quantity breaks, images and reviews per product
- deletes products no longer in the file, unless a buyer has already referenced them
- is idempotent: re-running updates rows in place

To add a supplier, add its entry and products to the JSON, put its images under
`public/suppliers/<slug>/`, and run the seed.

---

## Testing and CI

```bash
npm test          # all Vitest suites
npm run typecheck
npm run lint
```

The test files sit next to the code they cover and include route handler tests, auth guard tests,
and a schema contract test that keeps TypeScript role and status constants in
sync with `schema.prisma`.

On every pull request to `main`, GitHub Actions (`.github/workflows/ci.yml`) runs
lint, typecheck, test and build as separate jobs on Node 20.

---

## Deployment

The app deploys to **Vercel**, with Postgres, Auth and Storage on **Supabase**.
See [DEPLOY.md](DEPLOY.md) for the full guide. In short:

1. Set up Supabase following [docs/supabase-setup.md](docs/supabase-setup.md):
   migrations, `current_user_role` RPC, Storage buckets (`supplier-logos`,
   `product-images`, `artwork-uploads`) and auth providers.
2. Import the repo into Vercel and add the environment variables above.
3. Run `npx prisma migrate deploy` and `npm run db:seed` from a machine with
   `DIRECT_URL` set. The Vercel build doesn't run migrations.
4. Grant admin to the team accounts with `npm run admin:grant`.

---

## Further docs

- [DEPLOY.md](DEPLOY.md): Vercel deployment and the mediated quote workflow setup
- [docs/supabase-setup.md](docs/supabase-setup.md): Supabase configuration and launch checklist
- [docs/partners/](docs/partners/): partner research (Berlin Packaging, Daehung Pack)
