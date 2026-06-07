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

## Development Guardrails / บันทึกกันพลาด (2026-06-05)

This section is the quick handoff for future development. It was added after a lightweight whole-project check of README/package scripts, app route groups, component folders, service modules, and timeout/error patterns.

### Current system map
- Main app: `apps/backoffice-web` using Next.js App Router.
- Route groups: `(backoffice)`, `(it-admin)`, `api`, `login`, and `preview`.
- Main component areas: `backoffice`, `it-admin`, `pos`, `pos-preview`, `pos-ui`, `pre-entry`, `pwa`, and `tables`.
- Main service layer: `activity-audit-service`, `approval-service`, `attendance-service`, `customer-display-policy-service`, `pos-sales-*`, `pos-settings-service`, `shift-close-service`, `stock-transaction-service`, `store-profile-service`, `subscription-package-service`, and `table-service`.
- Database/auth boundary: Supabase service-role access must stay server-only. Client code must not trust or submit authoritative `tenant_id`, `branch_id`, `store_code`, `device_code`, role, or permission state.

### Critical development rules
- Always resolve tenant, branch, user, role, permissions, and POS session on the server before reading or mutating business data.
- Keep business writes fast. Do not block UI/API success on audit logs, telemetry, policy sync, perf logs, or other best-effort background work unless the feature explicitly requires it.
- Add explicit timeouts for user-facing save/login/checkout flows. If a request can hang, the UI must restore buttons and show a clear Thai/English error.
- When changing Supabase schema, update migrations, seed data, service selectors, compatibility fallbacks, and README/docs together.
- After migration changes, restart `next dev`; the first request may compile slowly and should not be treated as runtime slowness.
- Avoid broad refactors in `pos-sales-service`, `pos-settings-service`, and API auth/session routes unless covered by typecheck plus targeted manual flow tests.
- Keep route/API contracts stable for Android handoff: shared payload shapes belong in `packages/shared-types` when reused externally.
- Preserve POS landscape behavior. Any POS UI edit should be checked at tablet landscape and laptop sizes, plus portrait warning state.

### Recent cashier device settings fix
- UI file: `apps/backoffice-web/src/components/pos-preview/pos-settings-workspace.tsx`.
- Service file: `apps/backoffice-web/src/lib/services/pos-settings-service.ts`.
- Cashier device add/edit now shows `กำลังบันทึก...` immediately and uses a 10-second client timeout so the popup cannot stay stuck forever.
- `saveDeviceSettings` returns after the `branch_devices` write succeeds. `syncBranchDevicePolicy` and `appendAuditLog` run as background best-effort tasks to prevent slow audit/policy writes from freezing the save popup.
- If this flow is edited again, verify duplicate device code, missing branch, inactive/maintenance status, edit existing device, and create new device.

### Minimum verification before handoff
- `cmd /c pnpm --filter backoffice-web exec tsc -p tsconfig.json --noEmit --pretty false`
- `cmd /c pnpm --filter backoffice-web exec eslint <changed-files>`
- For POS settings/device edits: open `/preview/pos/settings`, add/edit a cashier machine, confirm popup closes, list updates, and timeout/error state does not trap the user.
- For login/session edits: test `/login/store -> /login/branches -> /login/employee -> /login/devices -> /preview/pos`.
- For sales/payment edits: test order create, payment, receipt, shift guard, and relevant stock deduction behavior.

### Known risk areas to inspect first
- `audit_logs` schema compatibility can cause retry loops; keep audit writes non-blocking unless required.
- Auth and device selection already use timeout helpers; match that pattern for new pre-entry APIs.
- `tenant_payment_accounts` has schema fallback logic; payment setting changes must verify both current and fallback column sets.
- Rate limiting can fail closed when configured with an unavailable backend; verify env vars before blaming UI code.
- Menu scan/slip verification routes depend on external AI/OCR config; keep clear mock/fallback modes for local testing.

## POS Settings Handoff (2026-06-06)

Use this section as the current source of truth before changing the Payment Settings or Tax Settings submenus.

### Supabase migration status
- `supabase db push` completed successfully against linked project ref `deejlitaivfnsbwqdugy` on 2026-06-06.
- `supabase db push` completed successfully again on 2026-06-07 to apply payment account scope uniqueness.
- Applied migrations:
  - `202606050001_add_payment_account_delete_approval_action.sql`
  - `202606050002_payment_account_qr_modes.sql`
  - `202606050003_branch_devices_settings_perf.sql`
  - `202606050004_tax_settings.sql`
  - `202606060001_payment_account_active_scope_uniqueness.sql`
- Do not show a permanent "migration has not been applied" banner in Payment Settings. The required migrations are now applied.
- Never place Supabase access tokens, database passwords, service-role keys, or other secrets in README, source files, commits, screenshots, or client-side code.
- If migration access fails later, verify the linked project, CLI account permissions, and `SUPABASE_DB_PASSWORD` outside source control.

### Payment Settings behavior
- Main UI: `apps/backoffice-web/src/components/pos-preview/pos-settings-workspace.tsx`.
- API: `apps/backoffice-web/src/app/api/pos/settings/payment-accounts/route.ts`.
- Service: `apps/backoffice-web/src/lib/services/pos-settings-service.ts`.
- PostgreSQL table: `tenant_payment_accounts`.
- The database/API is the authoritative source when available.
- Browser `localStorage` is only a POS preview resilience fallback for schema/network/timeout failures. Do not treat it as production persistence and do not move this fallback into normal back-office production workflows.
- Opening Payment Settings loads any preview fallback immediately, then refreshes from the API without clearing a valid visible list when the API is temporarily unavailable.
- Create/edit save must:
  - show the `กำลังบันทึก...` popup clearly;
  - prevent duplicate submissions while saving;
  - use a bounded request timeout;
  - update the visible list immediately after success;
  - show the saved-success popup;
  - preserve the item in preview fallback storage if the API is temporarily unavailable.
- Delete and active/inactive changes must update both the visible list and preview fallback consistently.
- Do not disable the Add Account button merely because a stale initial snapshot reports that the payment schema is unavailable.
- Runtime QR selection rule: an active branch-specific payment account wins over an active tenant-wide/all-branches account. The tenant-wide account is only the fallback when the current branch has no active branch-specific account.
- Active duplicate guard: there can be only one active branch-specific payment account per `tenant_id + branch_id`, and only one active all-branches payment account per `tenant_id`. Migration `202606060001_payment_account_active_scope_uniqueness.sql` deactivates older duplicates and adds partial unique indexes.
- The duplicate-scope migration is applied to linked Supabase project ref `deejlitaivfnsbwqdugy`.

### Tax Settings behavior
- UI/API/service files:
  - `apps/backoffice-web/src/components/pos-preview/pos-settings-workspace.tsx`
  - `apps/backoffice-web/src/app/api/pos/settings/tax/route.ts`
  - `apps/backoffice-web/src/lib/services/pos-settings-service.ts`
- Migration: `supabase/migrations/202606050004_tax_settings.sql`.
- Tax settings are connected to the POS sales/payment summary through `tax_settings`, `tax_total`, and `tax_lines`.
- Preview calculation and sales calculation must follow the same rule: only active tax lines are calculated when the main tax switch is enabled.
- Enabling an individual tax line may enable the main tax switch automatically so the preview responds immediately.
- Tax save must show `กำลังบันทึก...`, enforce a timeout, update local state from the API response, and show a saved-success popup.

## POS Transfer Payment Modal Handoff (2026-06-06)

### What changed
- The bank-transfer payment popup now uses a compact QR-only layout.
- The modal shows only the title, close button, visually prominent amount, QR code, short scan helper text, any transfer error, and the `ยืนยันเงินโอน` confirm button.
- Slip upload, slip OCR/read button, reference input, transfer account detail cards, long helper text, internal cancel-bill action, and the old two-column layout were removed from the transfer modal UI.

### Files/routes/components affected
- POS sales route: `/preview/pos`.
- Modal component: `apps/backoffice-web/src/components/pos/pos-payment-modals.tsx`.
- Transfer labels and payment confirmation caller: `apps/backoffice-web/src/components/pos/pos-sales-module.tsx`.
- Styling: `apps/backoffice-web/src/app/globals.css`.
- Payment Settings source for QR/PromptPay remains `apps/backoffice-web/src/components/pos-preview/pos-settings-workspace.tsx` through the existing payment account state.

### UI behavior notes
- Amount label is `ยอดชำระ`; QR label is `สแกน QR เพื่อชำระเงิน`.
- The QR card is centered in a single-column modal and the confirm button remains clearly visible at the bottom.
- If no PromptPay phone or uploaded QR image is configured, the modal shows an error and disables confirmation until a QR source exists.

### Payment flow safety notes
- Payment calculation, order totals, QR generation, tenant/branch/session/shift guards, and payment API confirmation flow were not moved into the client.
- The modal continues to display `transferReviewOrder.total_amount`, which is prepared by the existing POS order/payment flow.
- Confirm still calls the existing transfer confirmation handler; it does not trust user-entered amount values and does not introduce a new client-side payment total.

### Responsive notes
- Desktop/tablet modal width is capped around 560px, with the QR card centered at about 468px max width and QR image up to 300px.
- Mobile uses `calc(100vw - 24px)`, scales the QR image down to about 252px, keeps the amount large without horizontal overflow, and makes the footer button full width.
- The modal avoids internal scrolling in normal viewports and only allows vertical scrolling when the viewport is very small.

### Required regression checks
- Payment Settings: add an account, leave the submenu, reopen it, and confirm the account remains visible.
- Payment Settings: edit, toggle active status, and delete an account; confirm no duplicate or disappearing rows.
- Payment Settings: confirm the saving popup appears and closes on both success and timeout/error paths.
- Tax Settings: use base amount 1,000; verify VAT 7% produces 1,070 and withholding 3% deducts 30 when enabled.
- POS Sales: reload settings, add an item, and verify the payment summary matches the saved tax configuration.
- POS Sales transfer: open `/preview/pos`, choose bank transfer, verify the QR-only modal at tablet landscape/desktop/mobile widths, and confirm payment still completes through the existing API flow.
- Run:
  - `cmd /c pnpm --filter backoffice-web exec tsc -p tsconfig.json --noEmit --pretty false`
  - `cmd /c pnpm --filter backoffice-web exec eslint <changed-files> --no-cache`

## POS Stability / Performance Handoff (2026-06-06)

### What changed
- Added a shared client-side bounded fetch helper at `apps/backoffice-web/src/lib/client-fetch.ts`.
- POS users, shift, payments, and orders modules now use request timeouts on key load/save/cancel/payment actions so buttons do not stay busy forever when an API request stalls.
- POS order create, direct pay, shift open/join, and POS user management no longer block the HTTP response on audit-log writes. The business write still completes before success is returned; audit logging is now fire-and-forget like other POS routes.
- Backoffice lint no longer runs as `eslint .`; it is scoped to source/config/test paths and uses `.eslintcache`.
- Generated/build/cache outputs are ignored in ESLint and git: `.next`, `.next-local`, `.open-next`, coverage, `.eslintcache`, logs, and `tsconfig.tsbuildinfo`.
- Windows dev startup defaults to webpack and validates the local Next cache junction target before using `.next-local`; if the cache target is not writable, dev falls back instead of hanging on a bad cache path.

### Files/routes/components affected
- Client fetch helper: `apps/backoffice-web/src/lib/client-fetch.ts`.
- POS UI modules: `pos-users-module.tsx`, `pos-shift-module.tsx`, `pos-payments-module.tsx`, `pos-orders-module.tsx`.
- POS API routes: `api/pos/orders`, `api/pos/orders/[orderId]/pay`, `api/pos/shifts/open`, `api/pos/shifts/join`, `api/pos/users`.
- Tooling/config: `apps/backoffice-web/package.json`, `eslint.config.mjs`, `.gitignore`, `scripts/dev-safe.mjs`, `scripts/setup-local-next-cache.mjs`.

### Behavior notes
- Timeout failures now surface through the existing error state instead of leaving loading/busy states stuck.
- Payment/order/shift calculation and write logic was not moved or trusted from the client.
- Audit log failures should not slow cashier-facing responses, but they may be recorded slightly after the API response.
- `api/pos/perf` still awaits audit logging intentionally because that route reports persistence status for performance telemetry.

### Performance notes
- Current local checks are still slow on this Windows workspace, suggesting filesystem/cache I/O is a real bottleneck.
- `npm run typecheck` passed in about 184 seconds.
- `npm run lint` passed in about 245 seconds after scoping lint and enabling `.eslintcache`.
- `npm run build` passed in about 368 seconds; production compile itself took about 117 seconds and TypeScript during build about 102 seconds.
- First full lint run can still be slow; subsequent runs should benefit from `.eslintcache`.

### Checks run
- `npm run typecheck`
- `cmd /c pnpm --filter backoffice-web exec eslint src/lib/client-fetch.ts src/components/pos/pos-shift-module.tsx src/components/pos/pos-payments-module.tsx src/components/pos/pos-orders-module.tsx src/components/pos/pos-users-module.tsx src/app/api/pos/orders/route.ts src/app/api/pos/orders/[orderId]/pay/route.ts src/app/api/pos/shifts/open/route.ts src/app/api/pos/shifts/join/route.ts src/app/api/pos/users/route.ts --no-cache`
- `npm run lint`
- `npm run build`

## Multi-Tenant / Package Release Handoff (2026-06-06)

### Production targets
- GitHub remote: `https://github.com/sstdevelopaminno/POS-Preview.git`.
- Vercel project link: `sstipos`, project id `prj_FA0nK7DoGU1Se6olw48a4wjZlaDi`, org/team id `team_ZKmv6uQSU9QUyP08mxAr2YDI`.
- Supabase linked project ref: `deejlitaivfnsbwqdugy`.
- Supabase migration deploy requires a CLI account with database privileges and `SUPABASE_DB_PASSWORD` set outside source control.
- Never commit `.env.local`, Supabase access tokens, DB passwords, Vercel tokens, service-role keys, or production secrets.

### Multi-tenant model
- One tenant represents one shop owner/business account.
- One tenant can own multiple branches.
- Runtime POS APIs must always resolve scope from the POS session or authenticated branch context, then query by `tenant_id` and `branch_id`.
- IT admin APIs may operate across tenants, but tenant-scoped admin endpoints must keep `tenantId` from the URL and not trust client-submitted tenant scope.
- Branch-specific settings must win over tenant-wide/all-branches settings when both exist. This rule is currently enforced for transfer payment account selection in POS sales.

### Package and feature gating
- Package defaults are read from `subscription_package_features`.
- Tenant-level overrides are read from `tenant_feature_subscriptions` where `branch_id is null`.
- Branch-level overrides are read from `tenant_feature_subscriptions` where `branch_id = current branch`.
- Effective rule: package default -> tenant override -> branch override.
- POS sales now checks `core_pos_sales` in the `/api/pos/sales` runtime path before returning sales data or creating orders.
- Feature decisions are cached for a short TTL in `apps/backoffice-web/src/lib/feature-gate.ts` to reduce DB fan-out under concurrent POS traffic.
- IT admin contract/feature updates invalidate the feature gate cache for the changed tenant.

### Quota and bottleneck notes
- Quotas are enforced through `enforceQuota` for branches, devices, and users.
- Branch/device/user provisioning must stay behind package feature checks and quota checks.
- Feature gate checks are intentionally cached for 15 seconds only; do not increase this without adding cross-instance invalidation, because Vercel serverless instances do not share in-memory cache.
- Cashier-facing API routes should not block on audit logging unless the route explicitly returns audit persistence status.
- Keep performance-critical list endpoints cached by tenant/branch scope, and invalidate by scope after writes.

### Database readiness
- As of 2026-06-07, local and remote migration lists match through `202606060001` on linked project ref `deejlitaivfnsbwqdugy`.
- If `supabase migration list` or `supabase db push` returns privilege errors, set `SUPABASE_DB_PASSWORD` in the shell/session or run from a Supabase account with the correct project database privileges.
- `202606060001_payment_account_active_scope_uniqueness.sql` is applied and guarantees one active branch-specific payment account per branch and one active all-branches account per tenant at the database level.
- `202606050004_tax_settings.sql` is applied and supports branch tax settings and POS tax summary consistency.
- After migration push, verify Supabase schema cache if a route reports missing column/table errors.

### Release checklist
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Run `supabase db push` against the intended project ref only after confirming the linked project.
- Commit and push to `main`.
- Deploy Vercel production from the same commit.
- Smoke test `/login/store`, `/preview/pos/settings`, `/preview/pos`, `/api/pos/sales`, and one bank-transfer payment flow.

## POS Table Mode / Branch Tables / Tax Handoff (2026-06-07)

### What changed
- POS sales now hides the `พักบิล` action in dine-in/table mode and delivery mode.
- POS sales delivery mode no longer shows the table status chip; dine-in still shows table context plus `ย้ายโต๊ะ` and `เลือกโต๊ะ`.
- The `เลือกโต๊ะ` button returns to the table selector while preserving the current table draft until payment clears the bill.
- Table Management now supports branch-scoped table, zone, and floor-plan data with a branch filter and an all-branches read-only view.
- POS payment review, cash, transfer, sidebar summary, receipt preview, and 58mm print HTML now show tax lines from the saved tax settings/order snapshot.

### Files/routes/components affected
- Sales UI: `apps/backoffice-web/src/components/pos/pos-sales-module.tsx`.
- Payment panel/modal UI: `apps/backoffice-web/src/components/pos-ui/pos-payment-panel.tsx`, `apps/backoffice-web/src/components/pos/pos-payment-modals.tsx`.
- Checkout/submit tax snapshot types: `apps/backoffice-web/src/components/pos/features/checkout-flow.ts`, `apps/backoffice-web/src/components/pos/services/pos-sales-service-module.ts`, `apps/backoffice-web/src/lib/services/pos-sales-service.ts`.
- Table Management UI/types: `apps/backoffice-web/src/components/tables/table-management-page.tsx`, `apps/backoffice-web/src/components/tables/types.ts`.
- Branch scope helper: `apps/backoffice-web/src/lib/table-branch-scope.ts`.
- Table APIs: `apps/backoffice-web/src/app/api/backoffice/tables`, `table-zones`, `table-layout-objects`, and `tables/floor-plan/save`.
- Dine-in bill reload API: `apps/backoffice-web/src/app/api/pos/tables/[tableId]/bill/route.ts`.

### UI behavior notes
- In dine-in mode, cashier can switch back to the table selector without losing the selected table cart draft.
- In delivery mode, the pending-delivery queue button may remain visible, but generic hold-bill and table controls are hidden.
- In Table Management, selecting `ทุกสาขา` / `All branches` is for viewing only. Add/edit/delete/save layout requires choosing a specific branch.
- Table creation sends the selected branch to the API; newly created zones and floor objects are created in that same branch.

### Payment flow safety notes
- Tax is still calculated by the existing POS sales API from server-loaded tax settings. Client tax lines are used for preview/snapshot display and do not replace server-calculated totals.
- Receipt tax display reads `tax_lines` from the order snapshot when available and falls back to `tax_total`.
- Payment confirmation APIs and order/bill state transitions were not changed.
- Tenant/session/branch guards remain in place; table-management writes now validate that the actor can manage the target branch.

### Responsive notes
- The payment panel action row now adapts from three buttons to two buttons when hold-bill is hidden, preventing squeezed buttons on tablet/mobile.
- Table Management branch filtering is placed in the list controls row; action buttons are disabled instead of overflowing when all branches are selected.

### Checks for this change
- `npm run typecheck`
- `npm run lint`
- `npm run build`

## POS User / Cashier Device Session Rule Handoff (2026-06-07)

### What changed
- Staff/sales users can re-enter the same cashier device if the active POS session on that device belongs to the same staff user, covering login drops or browser/session recovery during the same shift.
- A different staff/sales user cannot enter a cashier device that still has another user's active POS session.
- Manager and owner users can enter an in-use cashier device for emergency takeover. The old active device session is revoked when the in-use session belongs to another user.
- Takeover creates a new POS session for the manager/owner, so new sales orders continue to use the current session user as `created_by`.
- The device selection UI allows a staff user to pick their own in-use device, but disables in-use devices owned by another staff user unless the current user has manager/owner override permission.
- Shift close now records `closed_by` as the current session user. If a manager/owner closes a staff user's shift, shift/audit metadata records `manager_owner_close_for_staff` with opened-by and closed-by user ids.

### Files/routes/components affected
- Device selection UI: `apps/backoffice-web/src/app/login/devices/page.tsx`.
- Device selection API: `apps/backoffice-web/src/app/api/auth/devices/select/route.ts`.
- Session ownership helper: `apps/backoffice-web/src/lib/server/pos-device-session-rules.ts`.
- Tests: `apps/backoffice-web/tests/integration/pos-device-session-rules.integration.test.ts`.

### Business behavior notes
- Staff A may recover into Staff A's same in-use device after a login interruption while the shift is still open.
- Staff B must choose another ready cashier device when Staff A still owns the selected device session. This avoids mixing staff device ownership across current/next shifts.
- Manager/owner takeover is intentionally allowed for break/emergency coverage and should attribute subsequent sales to the manager/owner session, not the previous staff session.
- If Staff A leaves without closing the shift, manager/owner can enter the device and close the shift; the close action is attributed to the manager/owner while metadata keeps the original shift opener.
- Shift and order calculation logic was not changed; this rule changes only who may open a device session and which session owns subsequent orders.
- Device in-use errors should explain that staff must choose another device or ask a manager/owner to enter instead.

### Safety notes
- Payment, tax, order totals, and bill state flows were not changed.
- POS session cookies and pre-entry flow handling remain the source of runtime scope.
- Do not relax this rule in UI only; the API route must keep the staff block because direct requests can bypass UI state.

## POS Users Save Persistence Handoff (2026-06-07)

### What changed
- Fixed the POS Users API so edit/save no longer reports success when profile settings fail to persist.
- Narrowed the missing-table detector for `pos_user_profiles` so duplicate employee-code constraint errors are not mistaken for missing migration errors.
- POS user profile, role, PIN, and active-status writes now select the updated row back from Supabase and fail if no row was actually updated.
- Changing an employee code, creating a user with an employee code/PIN, or changing a PIN now requires a non-empty valid manager/owner approval PIN.

### Files/routes/components affected
- POS users API: `apps/backoffice-web/src/app/api/pos/users/route.ts`.
- Regression test: `apps/backoffice-web/tests/integration/pos-users-auth-fallback.integration.test.ts`.

### UI behavior notes
- If a cashier/admin enters a duplicate employee code, the POS Users submenu should now show the real API error instead of `บันทึกข้อมูลเรียบร้อย`.
- PIN/password changes are intentionally not displayed back in the table for security; verify by logging in with the new PIN.
- If the remote Supabase project is missing `pos_user_profiles`, the API now returns a migration error instead of silently ignoring the save.

### Safety notes
- Tenant, branch, role, and POS-session fallback guards remain unchanged.
- Device scope, shift, order, tax, and payment flows were not changed.
- Employee-code uniqueness is enforced by `pos_user_profiles` at tenant scope; do not bypass it in the UI.
