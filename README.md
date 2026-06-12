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

- Monorepo: pnpm workspaces + Turbo
- Main app: Next.js App Router + TypeScript
- Database/Auth: Supabase PostgreSQL + RLS
- Shared contracts: `packages/shared-types`
- Business rules: `packages/pos-domain`
- UI primitives: `packages/ui`

## Repository Map

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

## Main Runtime Flow

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
