# SST iPOS / POS Platform

Production-oriented multi-tenant, multi-branch POS platform for small restaurants.

## Current Status

Improved, but not yet 100% production complete.

Before go-live, the project still needs passing evidence for typecheck, lint, login, branch selection, device selection, shift, order, payment, receipt, manual QA, deployment, and production environment checks.

### 2026-06-12 POS Sales Checkout Fix

- Fixed the takeaway checkout popup so failed bill creation no longer disappears silently; the popup now keeps the cart context, shows the error, and allows retry.
- Fixed the POS payment summary subtotal binding so checkout totals use the real cart subtotal instead of the discount amount.
- Hardened POS order creation replay responses so the frontend receives usable bill totals, tax lines, and status for the next payment step.
- Enabled the active production demo tenant scope for `core_pos_sales` by adding an active Starter contract after the POS API returned `feature_not_enabled`.
- Fixed the checkout error modal actions by restoring pointer events and resetting the checkout request lock before close/retry.
- Polished the bank-transfer payment popup sizing: smaller QR, smaller tax line, tighter spacing, and better fit in the modal viewport.

### Next Handoff

The next development pass should start with IT backoffice work and keep POS sales changes to bug fixes only unless explicitly requested. Use `docs/AI-HANDOFF-IT-BACKOFFICE-2026-06-12.md` as the bootstrap for the next chat.

## Stack

## Deployment surface model

POS/Sales and IT Backoffice must run as separate Vercel Projects and separate domains. Do not expose IT Backoffice from the POS/Sales public URL.

- POS/Sales: Vercel Project example `sstipos-pos`, domain example `pos.<domain>`, `APP_SURFACE=pos`.
- IT Backoffice: Vercel Project `sstipos-support`, display name `SSTiPOS Support`, domain example `admin.<domain>` or `it.<domain>`, `APP_SURFACE=it_admin`.
- Local full-surface development only: `APP_SURFACE=all`.
- Local IT Backoffice preview: run with `APP_SURFACE=it_admin` and `PORT=30000`, then open `http://localhost:30000/it-admin/login`.
- POS local command: `pnpm dev` or `pnpm dev:pos`.
- IT local command: `pnpm dev:it-support`.

The IT Backoffice uses a separate Vercel Project/domain, but it must use the same Supabase project/database as POS. Do not create a separate Supabase project for IT Backoffice. Configure the IT Vercel project with the same Supabase URL, anon key, server-only service role key, and any required auth/session secrets used by the POS project.

Repository split planning is tracked in `docs/future-repository-separation-plan.md`.

- POS GitHub repository: `sstdevelopaminno/POS-Preview`
- IT GitHub repository: `sstdevelopaminno/SSTiPOSSupport`
- Until shared packages are published separately, keep `packages/*` and `supabase/migrations/*` synchronized in both repositories.
- Treat Supabase migrations as one canonical history; do not add an IT-only database fork.

Surface isolation is prepared in `apps/backoffice-web/src/proxy.ts` with optional host allowlists:
- `POS_ALLOWED_HOSTS=pos.<domain>`
- `IT_ADMIN_ALLOWED_HOSTS=admin.<domain>,it.<domain>`

Security must still be enforced server-side. The IT admin layout and `/api/it-admin/*` guards resolve authenticated platform roles server-side and allow only `it_admin` or `it_support`; POS APIs continue to resolve tenant, branch, device, session, permission, contract, and feature state server-side.

No Vercel deploy is performed by documentation or audit passes unless explicitly requested. Future production setup must configure separate environment variables and production aliases per Vercel Project. Do not run `vercel --prod` for IT preview verification.

## IT Backoffice roles

IT staff must use `/it-admin/login` on the IT Backoffice project/domain, not the POS store login.

| Role | Access |
|---|---|
| `it_admin` | Full IT Backoffice access, including feature flags, branch overrides, devices, customer display devices, platform users, and settings. |
| `it_support` | Limited support access: tenants, branches, package contract/subscription, user branch roles except delete/deactivate, active sessions, shifts, audit review, monitoring/readiness, and package quote/catalog. |
| `tenant_user` | No IT Backoffice access. |

The `platform_role` database enum includes `it_support` via `supabase/migrations/20260612132854_add_it_support_platform_role.sql`. Server-side IT API guards enforce the role/menu matrix; hiding navigation is not treated as authorization.

`/it-admin/login` now presents the first `SSTiPOS Support` UI pass for the separated IT Backoffice project/domain:
- split white/blue login card for desktop and stacked responsive layout for mobile/tablet
- email/password login tab backed by the existing server-side Supabase Auth + platform role check
- QR login tab placeholder only; QR auth is not implemented yet
- Thai/English loading, error, invalid-role, session-expired, signed-out, and success states
- preferred logo path: `apps/backoffice-web/public/brand/sstipos-support-logo.png`; a placeholder copied from the existing SST iPOS logo is committed for preview and should be replaced with the real `SSTiPOS Support` logo before brand QA/production promotion

No Vercel command or deployment was run for this UI pass.

Development IT platform users can be created or refreshed with `apps/backoffice-web/scripts/create-it-platform-users.mjs`. It uses the same Supabase project/database env as POS and reads only these credential env var names: `SST_IT_ADMIN_EMAIL`, `SST_IT_ADMIN_PASSWORD`, `SST_IT_SUPPORT_EMAIL`, and `SST_IT_SUPPORT_PASSWORD`. Do not commit real credential values.

Login usability note: `/it-admin/login` clears stale invalid-role/error state when the user edits the form, times out stalled login requests, and clears any existing Supabase session before signing in an IT staff account. This keeps old POS/tenant_user cookies from blocking IT Support login retries.

IT menu note: the IT shell displays `SSTiPOS Support`, shows the current IT role, and avoids duplicate tenant/store menu entries. Menu visibility is still derived from server-resolved permissions.

IT role menu note: `it_support` sees only support operations: tenants, branches, package contracts, users/roles, active sessions, shifts, audit review, and monitoring/readiness. `it_admin` also sees feature flags/branch overrides, devices/registration, customer display devices, platform users, and settings.

IT UI note: the IT Backoffice now uses a modern office dashboard shell with left sidebar navigation, mobile drawer navigation, top bar account/language controls, role badge, and the SST Innovation logo at `apps/backoffice-web/public/brand/sst-innovation-logo.png`.

## Repository structure

```text
apps/
  backoffice-web/   # Back office, IT admin, POS preview, unified login
  pos-android/      # Android contract/docs placeholder
packages/
  shared-types/
  pos-domain/
  ui/
supabase/
  migrations/
  seeds/
docs/
context.md          # Authoritative Codex/GPT handoff
```

## Business coverage included
- POS sales/orders/receipts
- Dine-in table flows and takeaway
- Manual delivery channels (Grab, LINE MAN, Shopee, Merchant App, Other)
- Cash and bank transfer payment models
- Product/ingredient/recipe/stock movement models
- Shift open/close with mismatch and unpaid bill guardrails
- Staff/manager/owner/it_admin/it_support role model
- Back office and IT admin UI routes
- Audit logging foundation
- Store + POS secure login flow (store -> branch -> employee -> device) now runs in `backoffice-web`
- IT Backoffice login is prepared separately at `/it-admin/login`; do not reuse POS store login for IT staff.

Current login and POS entry flow:

```text
/login/store -> /login/branches or /login/employee -> /login/devices -> /preview/pos
```

QR scan login was removed from the active runtime flow. Historical QR references are archive-only.

## Critical Safety Rules

- Never trust client-sent `tenant_id`, `branch_id`, `store_code`, `device_code`, `owner_id`, or `role`.
- Resolve tenant, branch, device, POS session, user, role, and permissions server-side.
- Keep Supabase service-role usage server-only.
- Preserve tenant isolation and branch scope on every sensitive operation.
- Preserve login context security, shift gate, audit logging, and auth/public rate limiting.
- POS order/payment totals must remain server/database authoritative.

## Core Features

- Store login, branch selection, employee verification, device selection
- POS session and shift gate before sales
- Takeaway, dine-in, and manual delivery order flows
- Cash and bank transfer payments
- Receipt preview and print flow
- Product, recipe, ingredient, and stock movement model
- Table QR customer ordering
- POS users, devices, payment settings, tax settings
- Back office and IT admin routes
- Audit logging and production readiness docs

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Configure environment:

```text
apps/backoffice-web/.env.local
```

Use `apps/backoffice-web/.env.example` as the template. Never commit real secrets.

Supabase migration-ready env structure:

- `SUPABASE_PRIMARY_URL`, `SUPABASE_PRIMARY_ANON_KEY`, `SUPABASE_PRIMARY_SERVICE_ROLE_KEY`
- `SUPABASE_ARCHIVE_URL`, `SUPABASE_ARCHIVE_SERVICE_ROLE_KEY`
- `HOT_DATA_RETENTION_MONTHS=12`, `ENABLE_ARCHIVE_READS=false`, `ENABLE_DUAL_DB_MODE=false`

During transition, existing Supabase env names may temporarily point to the primary database.

3. Apply Supabase migrations:

```bash
supabase db push
```

4. Seed demo data when needed:

```bash
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
```

5. Start local app:

```bash
pnpm dev
```

6. Open:

```text
http://localhost:3000/login/store
http://localhost:3000/preview/pos
```

## Demo Login Pointers

Current seeded/demo access details change over time. Check `context.md` before testing production or preview flows.

Common demo flow:

```text
store code -> branch -> employee code/PIN -> device -> POS shift -> sale
```

## Required Verification

Run these before handing off code changes when the local Node environment is available:

```bash
npm run typecheck
npm run lint
```

For broader release checks:

```bash
npm run build
```

Manual POS QA should cover:

- Login flow
- Branch/device selection
- Shift open/join/close
- Order create
- Payment complete
- Receipt preview/print
- Stock deduction
- Table QR ordering when touched

## Key Documents

* If no orders exist, debug the POS checkout/order creation flow first.
* If orders exist but no `order_items`, debug order item insert.
* If orders and items exist but `recipe_lines = 0`, repair product recipe/stock bridge setup.
* If `recipe_lines > 0` but no `stock_movements`, debug the stock deduction execution path in `pos-sales-service`.
* If `stock_movements` exists but UI stock does not change, debug stock UI refresh/cache.

## Next Development Focus: IT Backoffice

The next development pass focuses on IT backoffice/admin work. Start from:

- `context.md`
- `docs/AI-HANDOFF-IT-BACKOFFICE-2026-06-12.md`
- `apps/backoffice-web/src/app/(it-admin)/`
- `apps/backoffice-web/src/components/it-admin/`
- `apps/backoffice-web/src/app/api/it-admin/`

No Vercel deploy should be run during the planning pass.

## GitHub Documentation Sync Rule

For every future code change, system fix, or development pass:

- Update the relevant repo documentation in the same branch.
- Include the current status, changed files, verification results, risks, and next recommended steps.
- Push the documentation updates to GitHub so the planning chat can read the latest repo state before sending the next Codex command.
- Do not deploy or run Vercel unless the user explicitly asks for deployment.

## IT Backoffice Audit Update (2026-06-12)

The latest IT Backoffice/Admin audit is documented in `docs/AI-HANDOFF-IT-BACKOFFICE-2026-06-12.md`.

Next implementation should start with P1 guardrails:

- tenant package/contract/`core_pos_sales` readiness
- branch feature override scope validation
- user role branch/user validation
- contract plan validation
- targeted IT admin permission, scope, feature gate, and quota tests

No Vercel deploy should be run for this planning/audit pass.
