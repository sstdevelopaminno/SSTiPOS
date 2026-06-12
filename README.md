# SST iPOS / POS Platform

Production-oriented multi-tenant, multi-branch POS platform for small restaurants.

## Current Status

Improved, but not yet 100% production complete.

Before go-live, the project still needs passing evidence for typecheck, lint, login, branch selection, device selection, shift, order, payment, receipt, manual QA, deployment, and production environment checks.

### 2026-06-12 POS Sales Checkout Fix

- Fixed the takeaway checkout popup so failed bill creation no longer disappears silently; the popup now keeps the cart context, shows the error, and allows retry.
- Fixed the POS payment summary subtotal binding so checkout totals use the real cart subtotal instead of the discount amount.
- Hardened POS order creation replay responses so the frontend receives usable bill totals, tax lines, and status for the next payment step.

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

- `context.md` - authoritative project handoff and recent status
- `docs/codex-token-saving-workflow.md` - Codex workflow rules
- `docs/current-stability-audit.md` - latest stability audit
- `docs/pos-multi-owner-branch-architecture.md` - architecture and safety model
- `docs/pos-login-context-handoff.md` - login/session context details
- `docs/manual-qa-checklist.md` - manual QA checklist
- `docs/production-readiness-checklist.md` - go-live readiness
- `docs/monitoring-alerting-runbook.md` - operations monitoring
- `docs/go-live-evidence-checklist.md` - evidence template
- `docs/ARCHIVE-QR-DECOMMISSION-2026-05-31.md` - legacy QR archive

## Local Troubleshooting

- If `/preview/pos` hangs, check `GET /api/pos/session/current` and `GET /api/pos/shifts/current`.
- Restart `next dev` after migration changes.
- First request in `next dev` may be slow while routes compile.
- If a POS device is stuck `in_use`, use the logout/reset flow from the active session before testing another login.
- `POST /api/pos/perf` should not block the POS UI when telemetry/audit writes fail.

## Latest Important Handoff

2026-06-11 POS stock/order path:

- POS order creation now prefers the transactional RPC path by default.
- Direct non-delivery fallback requires `POS_FORCE_DIRECT_CREATE_NON_DELIVERY=1`.
- Insufficient stock no longer soft-bypasses by default.
- Stock bypass requires `POS_SOFT_BYPASS_INSUFFICIENT_STOCK=1`.
- Re-run typecheck, lint, and focused POS QA after Node/npm/corepack are available in the shell.
