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
- Local development only: `APP_SURFACE=all`.

Surface isolation is prepared in `apps/backoffice-web/src/proxy.ts` with optional host allowlists:
- `POS_ALLOWED_HOSTS=pos.<domain>`
- `IT_ADMIN_ALLOWED_HOSTS=admin.<domain>,it.<domain>`

Security must still be enforced server-side. The IT admin layout and `/api/it-admin/*` guards resolve authenticated platform roles server-side and allow only `it_admin` or `it_support`; POS APIs continue to resolve tenant, branch, device, session, permission, contract, and feature state server-side.

No Vercel deploy is performed by documentation or audit passes unless explicitly requested. Future production setup must configure separate environment variables and production aliases per Vercel Project.

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

## Runtime And Deployment Topology

- POS local runtime: `http://localhost:3000`
- IT Support local runtime: `http://localhost:30000`
- POS Vercel target: the existing POS project (currently linked locally as `sstipos`)
- IT Support Vercel target: `sstipos-support` with `APP_SURFACE=it_admin`
- Both Vercel projects use the same existing Supabase database.
- Configure environment variables separately in each Vercel project, even when the Supabase values are identical.
- Do not create a new Supabase project for the IT Support deployment.
- A local `.vercel/project.json` can link to only one Vercel project at a time. Verify the project name before pulling env vars or deploying.
- `APP_SURFACE` identifies the runtime/deployment profile; it is not an authorization boundary.
- Keep this GitHub repository and monorepo structure unchanged until the future split plan is approved.

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

5. Start POS locally (normal/default):

```bash
pnpm dev
```

The explicit equivalent is:

```bash
pnpm dev:pos
```

6. Start SSTiPOS Support locally:

```bash
pnpm dev:it-support
```

This command sets `APP_SURFACE=it_admin`, uses port `30000`, and keeps its Next.js development cache separate from POS.

7. Open:

```text
http://localhost:3000/login/store
http://localhost:3000/preview/pos
http://localhost:30000/it-admin
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

- `context.md` - authoritative project handoff and recent status
- `docs/codex-token-saving-workflow.md` - Codex workflow rules
- `docs/current-stability-audit.md` - latest stability audit
- `docs/pos-multi-owner-branch-architecture.md` - architecture and safety model
- `docs/pos-login-context-handoff.md` - login/session context details
- `docs/AI-HANDOFF-IT-BACKOFFICE-2026-06-12.md` - next-chat handoff for IT backoffice development
- `docs/future-repository-separation-plan.md` - staged GitHub split plan; planning only
- `docs/manual-qa-checklist.md` - manual QA checklist
- `docs/production-readiness-checklist.md` - go-live readiness
- `docs/monitoring-alerting-runbook.md` - operations monitoring
- `docs/go-live-evidence-checklist.md` - evidence template
- `docs/ARCHIVE-QR-DECOMMISSION-2026-05-31.md` - legacy QR archive

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
