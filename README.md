# POS Platform (Multi-tenant)

Production-oriented monorepo for a noodle shop and small restaurant POS platform.

## Stack
- Monorepo: pnpm workspaces + Turbo
- Web apps: Next.js 16 App Router + TypeScript
- Database/Auth: Supabase (PostgreSQL + RLS)
- Shared contracts: TypeScript packages for Android POS and web modules

## Repository structure

```text
pos-platform/
  - apps/![alt text](image-1.png)
    - backoffice-web/    # Back Office + IT Admin + POS preview + Unified Store/POS login
    - pos-android/       # Placeholder docs + API contract reference
  - packages/
  - shared-types/        # Shared domain types and API payload contracts
  - pos-domain/          # Business rules and policy guards
  - ui/                  # Reusable UI primitives
  - supabase/
  - migrations/
  - seeds/
  - seed.sql
  - rls-policies.sql
```

## Business coverage included
- POS sales/orders/receipts
- Dine-in table flows and takeaway
- Manual delivery channels (Grab, LINE MAN, Shopee, Merchant App, Other)
- Cash and bank transfer payment models
- Product/ingredient/recipe/stock movement models
- Shift open/close with mismatch and unpaid bill guardrails
- Staff/manager/owner/it_admin role model
- Back office and IT admin UI routes
- Audit logging foundation
- Store + POS secure login flow (store -> branch -> employee -> device) now runs in `backoffice-web`

## Login / Pre-entry flow (updated)
- Scope: only login and pre-sales entry flow was changed. Existing POS Sales screen/UI is unchanged.
- Security model:
  - never trust client `tenant_id`, `branch_id`, `store_code`, `device_code`
  - server resolves scope from store code + signed opaque pre-entry context cookie
  - final POS session and handoff cookie are server-created only
  - service-role remains server-only
  - feature gates and tenant/branch scope checks remain enforced server-side

### Step routes
- `/login/store`: store code verification
- `/login/branches`: branch selection (auto-skip when single-branch mode is active)
- `/login/employee`: employee verification by employee code
- `/login/devices`: POS device/register selection

### API routes for login flow
- `POST /api/auth/store-code/verify`
- `GET /api/auth/branches`
- `POST /api/auth/branches/select`
- `POST /api/auth/employee/verify-code`
- `GET /api/auth/devices`
- `POST /api/auth/devices/select`
- `GET /api/auth/session/context`
- `DELETE /api/auth/session/context`

### Variant behavior
- Variant A (multi-branch owner):
  - user verifies store code, then selects branch, then verifies employee, then selects device, then enters POS.
- Variant B (single-branch/no branch-selection mode):
  - store verification auto-resolves branch and skips branch selection UI, then proceeds to employee verification and device selection.

### Device access rules before sales entry
- device status is resolved server-side from `branch_devices` and active `pos_sessions`
- public statuses: `ready`, `in_use`, `offline`, `disabled`
- in-use devices require `pos.device.override_in_use` permission to force entry

### Employee and permission rules before sales entry
- employee must be active and belong to resolved tenant+branch
- role is resolved from `user_branch_roles` (`owner|manager|staff`)
- pre-entry permission gate requires `pos.sales.access`

### Testing checklist for this flow
- store code validation success/failure
- branch selection shown only when needed
- employee code login success/failure
- device list/status/in-use override behavior
- successful handoff redirects to existing POS route
- shift gate still applies in POS APIs after login

## Important rule enforcement
Implemented in domain logic + SQL triggers:
- Staff cannot self-cancel bills
- Bill cancellation requires manager/owner PIN approval
- Stock adjustment requires manager/owner PIN approval
- Shift close with unpaid dine-in bills or cash mismatch requires manager/owner override
- Recipe-based stock deduction hook (`app.consume_ingredient`) with stock movements

## Setup

1. Install pnpm (once)
```bash
npm install -g pnpm
```

2. Install dependencies
```bash
pnpm install
```

3. Configure environment files
- Copy `apps/backoffice-web/.env.example` to `apps/backoffice-web/.env.local`
- Set strong value for `POS_SESSION_HANDOFF_SECRET` before any shared/staging deployment

4. Apply Supabase migrations
```bash
supabase db reset
# or
supabase db push
```

5. Seed demo data
```bash
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
```

6. Run local POS preview (Back Office app)
```bash
pnpm dev
```

7. Open POS sales preview in browser
- `http://localhost:3000/preview/pos`

Optional shortcut command:
```bash
pnpm dev:pos
```
This prints the POS preview URL and starts `apps/backoffice-web`.

## Demo Store Bootstrap (recommended before UI test)
Use demo data so the unified login flow and POS preview can connect immediately:

1. Apply latest migrations
```bash
supabase db push
```

2. Seed demo tenant/branch/products/users
```bash
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
```

3. Demo values for login flow
- Store code: `NDL-TH-001`
- Branch: `BKK-01` (auto-selected in single-branch demo mode)
- Demo device code (UI shortcut): `POS-DEMO-01`

4. Open login/POS preview
- Login: `http://localhost:3000/login/store`
- POS: `http://localhost:3000/preview/pos`

## Local troubleshooting (`/preview/pos`)
- Apply latest migrations (`supabase db push`) so `audit_logs` includes compatibility columns (e.g. `target_user_id`).
- Restart local dev server after migration changes.
- First request in `next dev` can be slow while routes compile. Re-test after the first compile before judging runtime speed.
- Verify:
  - `GET /api/pos/session/current` -> `401 missing_pos_session` or `200`
  - `GET /api/pos/shifts/current` -> safe non-500 response in normal flow
- If login reaches device selection but a POS terminal remains `in_use`, call logout/reset from the current browser session first. New logout/reset flow revokes the active `pos_sessions` row before clearing cookies.
- Auth API timeout is controlled by `AUTH_API_TIMEOUT_MS` in `apps/backoffice-web/.env.local` (default from `.env.example`: `8000` ms).
- `POST /api/pos/perf` is non-blocking by design; telemetry write failures should not block POS preview rendering.

## Key docs
- `docs/PROJECT-AUDIT-HANDOFF-2026-06-02.md` (latest project audit + development handoff)
- `docs/database-schema-plan.md`
- `docs/rls-policy-plan.md`
- `docs/api-route-design.md`
- `docs/ui-route-structure.md`
- `context.md` (authoritative GPT/Codex handoff context)
- `docs/pos-multi-owner-branch-architecture.md`
- `docs/POS-LOGIN-POS-BRIDGE-E2E-CHECKLIST.md`
- `docs/definition-of-done.md`
- `docs/manual-qa-checklist.md`
- `docs/production-readiness-checklist.md`
- `docs/go-live-evidence-checklist.md`
- `docs/ARCHIVE-QR-DECOMMISSION-2026-05-31.md` (legacy QR reference archive)

Note: docs marked as archived are historical reference only. Use the current `/login/store -> branch/employee -> devices -> /preview/pos` flow for new development.

## API contract handoff for Android
- `GET /api/contracts`
- Shared TS contracts in `packages/shared-types`

## Current implementation status
This scaffold is production-oriented in architecture and separation of concerns, with working route surfaces and enforceable schema constraints. Latest audit handoff: `docs/PROJECT-AUDIT-HANDOFF-2026-06-02.md`; latest system/UI stability update: `docs/system-stability-audit-2026-06-04.md`.

Before go-live, complete:
- Execute the manual QA checklist and attach signoff evidence
- Run staging backup/restore and rollback drills with recorded results
- Rotate all production secrets and verify alert/on-call routing
- Configure centralized rate limiter backend (`RATE_LIMIT_BACKEND=upstash|redis`) and verify auth fail-closed behavior
- Complete `docs/go-live-evidence-checklist.md` with evidence links

## POS Sales Summary

- Route: `/preview/pos/sales-summary`
- API: `GET /api/pos/sales-summary`
- Returned data: `summary`, `paymentMethods`, `shifts`, `cashiers`, `bestSellingProducts`, and `salesRows`.
- Filters: `dateFrom`, `dateTo`, `branchId`, `shiftId`, `cashierId`, `paymentMethod`, and `status`.
- Access rules: the API resolves tenant, branch, user, and role from the authenticated server/POS session. The client never supplies trusted `tenant_id`.
- Branch isolation: owner/IT admin can view active branches in the tenant; manager/accountant are limited to assigned branches; staff-style access is scoped to self if reports permission is ever granted.
- UI behavior: the page shows KPI cards, payment breakdown, shift summary, cashier performance, best-selling products, detailed sales rows, loading/error/empty states, and CSV export.
- Verification commands used for this module should include `npm run typecheck`, `npm run lint`, and `npm run build`.

## POS Responsive Landscape UI

- POS route scope: `/preview/pos/*`
- Viewport behavior: the POS layout exports route-level viewport settings with `width=device-width`, `initial-scale=1`, `maximum-scale=1`, `user-scalable=no`, and `viewport-fit=cover`.
- Orientation guard: `PosViewportGuard` blocks unsupported portrait or narrow POS usage and asks users to rotate to landscape. It shows Thai and English text and displays the current viewport size.
- Breakpoints:
  - `< 768px` or portrait: blocked/warning overlay for POS usage.
  - `768px-1023px` landscape: compact tablet/iPad layout, compact icon sidebar, tighter spacing, smaller product cards.
  - `1024px-1439px` landscape: laptop/small desktop layout with standard product grid and right cart panel.
  - `1440px+` landscape: expanded desktop layout with wider cart and 4-column product grid.
  - `1600px+` and `2200px+`: centered workspace with larger max-width and 5-6 product columns.
- App-ready CSS: POS shell uses `100dvh`, safe-area padding, `overscroll-behavior`, and `touch-action: manipulation` to reduce accidental zoom/double-tap behavior.
- Modal behavior: POS dialogs and drawers now have viewport-safe max-height, internal scrolling, safe-area padding, and sticky action zones where possible.
- Files changed for this layer: `app/preview/pos/layout.tsx`, `components/pos-preview/pos-viewport-guard.tsx`, `lib/viewport-hooks.ts`, `components/pos-preview/pos-shell-sidebar.tsx`, and `app/globals.css`.
- Target checklist: verify 1024x768, 1180x820, 1194x834, 1366x1024, 1280x720, 1366x768, 1440x900, 1536x864, 1600x900, 1920x1080, 2560x1440, plus portrait/narrow warning states.
