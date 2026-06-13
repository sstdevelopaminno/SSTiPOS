# SST iPOS Project Context (Authoritative Handoff)

Last updated: 2026-06-12
Workspace: `e:\POS Preview`

This file is the primary context handoff for future GPT/Codex runs.
Read this file before making any code changes.

## 1) Product and System Scope

SST iPOS is a multi-owner, multi-branch POS platform with 4 logical surfaces:
1. `id.<domain>`: identity/login gateway (`backoffice-web` `/login/*`)
2. `pos.<domain>`: POS operations and sales flow (`backoffice-web` POS APIs/UI)
3. `admin.<domain>`: backoffice + IT admin operations (`backoffice-web`)
4. `www.<domain>`: marketing/onboarding (if enabled)

Primary architectural goals:
- strict tenant isolation
- strict branch scoping
- secure login handoff
- auditable operational actions
- feature gate + quota control for SaaS packaging

**IMPORTANT:** QR Scan login flow has been **removed** as of 2026-05-29. The system now uses only the standard Store Login / Pre-entry flow.

### Deployment surface separation (2026-06-12)

POS/Sales and IT Backoffice must be deployed as separate Vercel Projects with separate public domains:
- POS/Sales project: example `sstipos-pos`, domain `pos.<domain>`.
- IT Backoffice project: `sstipos-support`, display name `SSTiPOS Support`, domain `admin.<domain>` or `it.<domain>`.

The IT Backoffice must not share the same public URL as POS/Sales. POS users must not reach IT admin routes from the POS domain, and IT staff must not use the POS sales URL for IT Backoffice.

`apps/backoffice-web/src/proxy.ts` now provides high-level app surface isolation:
- `APP_SURFACE=pos` blocks/redirects `/it-admin/*`, `/api/it-admin/*`, `/audit-logs`, and `/tenants`.
- `APP_SURFACE=it_admin` redirects `/` to `/it-admin`, blocks POS sales/login/API surfaces such as `/preview/pos/*`, `/api/pos/*`, `/login/*`, `/api/auth/*`, and `/api/store/*`, and leaves IT auth to server-side guards.
- `APP_SURFACE=all` is for local full-surface development only.
- Local IT Backoffice preview uses `APP_SURFACE=it_admin`, `PORT=30000`, and `http://localhost:30000/it-admin/login`.
- `POS_ALLOWED_HOSTS` and `IT_ADMIN_ALLOWED_HOSTS` are comma-separated host allowlists for each Vercel Project.
- Existing POS session-cookie protection for `/preview/pos/*` is preserved when `APP_SURFACE=pos` or `APP_SURFACE=all`.

Repository separation target as of 2026-06-14:
- POS source folder/repo: `E:\POS Preview`, `sstdevelopaminno/POS-Preview`.
- IT Support source folder/repo: `E:\SSTiPOSSupport`, `sstdevelopaminno/SSTiPOSSupport`.
- POS local command remains `pnpm dev` or `pnpm dev:pos` on port `3000`.
- IT local command is `pnpm dev:it-support` on port `30000`.
- Shared packages and `supabase/migrations/*` must be kept synchronized in both repositories until a package/migration release process replaces direct copying.
- POS Vercel root deploy uses root `vercel.json` with output directory `apps/backoffice-web/.next`; IT projects with Root Directory `apps/backoffice-web` can continue using the app-level `apps/backoffice-web/vercel.json`.

This proxy is not the only security boundary. IT admin server layout and API guards still resolve user/role server-side and only allow `it_admin` or `it_support`. POS APIs must continue to derive POS session, tenant, branch, device, role, permission, contract, and feature state server-side.

The IT Backoffice uses a separate Vercel Project/domain, but it must use the same Supabase project/database as POS. Do not create a new Supabase project for IT. Copy/configure the same Supabase URL, anon key, server-only service role key, and required auth/session secrets from the POS project into the IT Vercel project.

No Vercel deploy was performed for this pass. Future deployment must configure separate environment variables and production aliases per Vercel Project. Do not run `vercel --prod` for IT preview verification.

### IT Backoffice access roles (2026-06-12)

- `it_admin`: full IT Backoffice access.
- `it_support`: limited IT support access.
- `tenant_user`: must not access IT Backoffice.

`/it-admin/login` uses the Supabase Auth server session flow, then resolves `users_profiles.platform_role` server-side. Only active `it_admin` and `it_support` profiles are allowed through to `/it-admin`; `tenant_user` is rejected and signed out from the IT login attempt. Do not reuse `/login/store` for IT staff.

First UI pass for the separated IT login is complete:
- system name/title: `SSTiPOS Support`
- route: `/it-admin/login`
- desktop/tablet/mobile split login card with blue branding panel and white email/password form
- Thai/English loading, error, invalid-role, session-expired, signed-out, and success states
- QR login tab is UI placeholder only: "QR login for mobile support devices is coming soon."
- no QR authentication runtime was implemented in this pass
- preferred support logo path remains `apps/backoffice-web/public/brand/sstipos-support-logo.png`; a placeholder copied from the existing SST iPOS logo is committed there for preview, and the real `SSTiPOS Support` logo should replace that file before brand QA/production promotion
- no Vercel command was run and no deployment was made

Development IT platform users can be created or refreshed with `apps/backoffice-web/scripts/create-it-platform-users.mjs`. The script uses the same Supabase project/database env as POS, requires `SST_IT_ADMIN_EMAIL`, `SST_IT_ADMIN_PASSWORD`, `SST_IT_SUPPORT_EMAIL`, and `SST_IT_SUPPORT_PASSWORD`, and must never print or commit password values.

2026-06-13 login usability fix: `/it-admin/login` now clears stale invalid-role/error state as soon as the user edits email/password, times out stalled login requests, and the IT login API signs out any existing Supabase session before signing in the IT staff account. This prevents old POS/tenant_user cookies from making the SSTiPOS Support login feel stuck.

2026-06-13 IT menu fix: the IT shell now uses `SSTiPOS Support` as the visible product title, shows the active IT role (`IT Admin` or `IT Support`), and removes the duplicate tenant/store nav entry. `it_support` still receives only permission-filtered support menus; `it_admin` receives the full admin menu.

2026-06-13 IT role menu update: the IT nav now maps directly to the approved access matrix. `it_support` sees tenant, branch, package contract, users/roles, active sessions, shifts, audit review, and monitoring/readiness menus only. `it_admin` additionally sees feature flags/branch overrides, devices/registration, customer display devices, platform users, and settings.

2026-06-13 IT office dashboard redesign: the IT Backoffice shell now uses a modern light office/SaaS layout with a fixed left sidebar on desktop, mobile drawer navigation, top bar language/account controls, role badge, SST Innovation logo at `apps/backoffice-web/public/brand/sst-innovation-logo.png`, and a card-based `SSTiPOS Support Console` dashboard. Server-side role guards and permission filtering remain unchanged.

`it_support` allowed surfaces:
- tenant management
- branch management
- package contract/subscription
- tenant user/branch-role control, except delete/deactivate
- active sessions
- shifts
- audit log review
- monitoring/readiness
- package catalog/quote

`it_support` denied surfaces/actions:
- hard delete/delete/deactivate actions
- feature flags and branch overrides
- device registration/control
- customer display device control
- login policy management
- platform users
- platform/settings pages
- IT admin role changes
- raw audit log edit/delete

The database enum `platform_role` is extended by migration `20260612132854_add_it_support_platform_role.sql`. Database helper `app.is_it_admin()` remains intentionally full-admin only; `it_support` is authorized through server-side API guards and does not get broad DB-level admin RLS powers.

## 2) Completed Delivery by Prompt (1 -> 8)

### Prompt 1: Real Authentication + POS Session
- Implemented secure verification endpoints:
  - `POST /api/auth/pin/verify`
  - `POST /api/auth/staff-card/verify`
- Server-side re-validation on every verify:
  - context (`ctx`), tenant, branch, policy, device, user role
- Added/normalized auth/session persistence:
  - `pos_sessions`
  - `login_attempts`
  - `audit_logs` extension usage
  - hardened auth tables:
    - `pos_staff_cards` with hashed `card_hash` and lifecycle (`active|inactive|lost|revoked`)
- Added replay protection:
  - consume `pos_login_contexts` on success
  - reject reused context (`context_consumed`, `context_replay_detected`)
- Session handoff uses short-lived signed HttpOnly cookie (no sensitive query params)

### Prompt 2: Shift Check-in Gate
- Added shift gate flow before POS sales access:
  - `GET /api/pos/session/current`
  - `GET /api/pos/shifts/current`
  - `POST /api/pos/shifts/open`
  - `POST /api/pos/shifts/join`
  - `POST /api/pos/shifts/close`
- Bound `pos_sessions.shift_id` to active shift
- Added/used server guards:
  - `requirePosSession`
  - `requireActiveShift`
  - `requirePermission`
  - `getTenantBranchScopeFromSession`

### Prompt 3: POS Sales MVP
- Implemented minimum sellable flow for 1 real bill:
  - product loading
  - cart
  - order create
  - payment record
  - receipt preview
  - current shift order history
- APIs:
  - `GET /api/pos/products`
  - `POST /api/pos/orders`
  - `POST /api/pos/orders/:id/pay`
  - `GET /api/pos/orders/current-shift`
- Server calculates totals (client totals are not trusted)
- Scoping enforced: tenant + branch + shift + session + user + device

### Prompt 4: Attendance Real-time (Owner/Manager in POS)
- Added attendance domain:
  - `staff_attendance_records`
  - `staff_leave_requests`
  - `staff_attendance_events`
- APIs:
  - `GET /api/pos/attendance/status`
  - `POST /api/pos/attendance/check-in`
  - `POST /api/pos/attendance/check-out`
  - `POST /api/pos/attendance/manual-status`
- Role visibility:
  - owner/manager: branch summary + list
  - staff: self-only
- Real-time behavior:
  - scoped polling fallback (tenant + branch + day)
  - no broad subscription

### Prompt 5: Backoffice/Admin
- Added admin route groups and IT-admin APIs for:
  - tenants, branches, users/roles
  - devices
  - login policies
  - active sessions
  - shifts
  - features
  - audit logs
- Platform-only controls require IT admin privilege
- Mutations log to audit

### Prompt 6: Subscription / Package / Feature Gate
- Implemented package/feature/quota model using canonical existing schema:
  - `subscription_packages`
  - `subscription_package_features`
  - `tenant_subscription_contracts`
  - `tenant_feature_subscriptions`
- Added compatibility views:
  - `plans`, `plan_features`, `tenant_contracts`, `feature_subscriptions`, `branch_feature_overrides`
- Enforced feature gate server-side in auth/attendance/admin/sales flows
- Enforced quotas:
  - branches
  - devices
  - users

### Prompt 7: Production Deployment Readiness
- Added CI and operations documentation:
  - branch strategy
  - env checklist
  - migration runbook
  - RLS verification checklist
  - monitoring/alerting runbook
  - incident/rollback runbook
  - production readiness checklist

### Prompt 8: Final Hardening + Definition of Done
- Added final readiness docs:
  - `docs/definition-of-done.md`
  - `docs/manual-qa-checklist.md`
- Added rate limiting to public/security-sensitive endpoints:
  - `/api/store/resolve`
  - `/api/store/login-context`
  - `/api/auth/pin/verify`
  - `/api/auth/staff-card/verify`
- Added centralized-capable rate limiter abstraction:
  - `RATE_LIMIT_BACKEND=memory|upstash|redis`
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
  - auth verify routes fail closed in production when backend is unavailable
- Added safer public error responses (avoid DB/internal detail leakage)
- Expanded audit coverage in login/replay/failure paths
- Added audit schema compatibility migration for legacy/local DBs missing `audit_logs.target_user_id` and related columns.
- Updated `/api/pos/perf` to fail-soft (`logged:false` non-blocking response) so perf/audit write failures do not block POS preview/session UI.
- Added timeout+retry resilience in POS preview session gate (`/preview/pos`) to avoid indefinite loading state.
- Updated architecture/handoff/readiness/README docs
- Checks passed at prompt completion:
  - `typecheck`: pass
  - `lint`: pass
  - `build`: pass

## 3) Security Invariants (Must Never Break)

1. Never trust client-sent `tenant_id`, `branch_id`, `store_code`, `device_code`.
2. Login flow must use opaque `ctx` and server-side re-validation.
3. `ctx` must be short-lived and consumed once authentication succeeds.
4. Consumed/expired context must be rejected (replay blocked).
5. Service role keys are server-only; never expose to client bundles.
6. Sensitive queries must stay tenant-scoped and branch-scoped.

## 3.1) Supabase Primary/Archive Migration Prep (2026-06-12)

- Current active primary DB: existing POS-Preview in `ap-south-1` / Mumbai.
- Singapore primary DB: pending until Supabase plan/project creation is available.
- Target future primary production DB: new Supabase project in `ap-southeast-1` / Singapore.
- Future legacy DB after cutover: existing POS-Preview in `ap-south-1` / Mumbai, kept as archive/rollback source only.
- New env structure:
  - `SUPABASE_PRIMARY_URL`
  - `SUPABASE_PRIMARY_ANON_KEY`
  - `SUPABASE_PRIMARY_SERVICE_ROLE_KEY`
  - `SUPABASE_ARCHIVE_URL`
  - `SUPABASE_ARCHIVE_SERVICE_ROLE_KEY`
  - `HOT_DATA_RETENTION_MONTHS=12`
  - `ENABLE_ARCHIVE_READS=false`
  - `ENABLE_DUAL_DB_MODE=false`
- Existing `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` remain the active database config for now and are also temporary fallback names during transition.
- `getSupabaseServiceClient()` now routes through the primary DB client layer.
- All active writes must remain on the configured primary DB. Archive DB is read-only from application design and disabled by default.
- Migration plan: `docs/supabase-singapore-primary-migration-plan.md`.
7. Feature gates must be enforced server-side, not UI-only.
8. Shift gate must block sales APIs without active shift.
9. Audit logs must exist for sensitive auth/admin/sales/attendance actions.
10. Public/auth endpoints must be rate-limited.
11. POS/Sales and IT Backoffice production deployments must use separate Vercel Projects and domains.
12. Do not rely on navigation hiding for IT isolation; enforce route/domain isolation, server layout guard, API guards, and platform role checks.
13. `it_support` must be enforced with server-side capability checks, not UI-only menu hiding.

## 4) Critical Error Codes to Preserve

Login/context/device:
- `missing_context`
- `invalid_context`
- `expired_context`
- `context_consumed`
- `context_replay_detected`
- `missing_device`
- `unregistered_device`
- `inactive_device`
- `device_branch_mismatch`
- `device_tenant_mismatch`
- `device_not_allowed`
- `device_policy_blocked`
- `login_method_not_allowed`
- `role_not_allowed`
- `auth_failed`
- `session_creation_failed`
- `rate_limited`

## 5) Current Endpoint Security Pattern

For every sensitive route:
1. derive scope from trusted server session/context
2. validate tenant+branch+policy+device+role
3. enforce feature gate and quota where applicable
4. enforce rate limit on public/login routes
5. write login_attempts and/or audit logs
6. return safe public errors

## 6) Key Documents (Read First)

- `docs/pos-multi-owner-branch-architecture.md`
- `docs/pos-login-context-handoff.md`
- `docs/definition-of-done.md`
- `docs/manual-qa-checklist.md`
- `docs/production-readiness-checklist.md`
- `docs/production-env-checklist.md`
- `docs/supabase-migration-runbook.md`
- `docs/rls-verification-checklist.md`
- `docs/monitoring-alerting-runbook.md`
- `docs/incident-runbook.md`
- `docs/go-live-evidence-checklist.md`

## 7) Environment and Secrets

Important env vars include:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `POS_LOGIN_CONTEXT_TTL_MINUTES`
- `POS_SESSION_HANDOFF_SECRET`
- `POS_SESSION_COOKIE_*`
- rate-limit knobs:
  - `POS_PUBLIC_RATE_LIMIT_WINDOW_SECONDS`
  - `POS_STORE_RESOLVE_RATE_LIMIT_MAX`
  - `POS_STORE_LOGIN_CONTEXT_RATE_LIMIT_MAX`
  - `POS_LOGIN_RATE_LIMIT_IP_MAX`
  - `POS_LOGIN_RATE_LIMIT_DEVICE_MAX`
  - `ACTIVATION_TOKEN_TTL_MINUTES`
  - `MOBILE_DEVICE_CODE_COOKIE_NAME`
  - `MOBILE_ENROLLMENT_COOKIE_NAME`
  - `MOBILE_ENROLLMENT_SECRET`
  - `MOBILE_ENROLLMENT_REF_TTL_SECONDS`
  - `MOBILE_LOGIN_CONTEXT_TTL_MINUTES`
  - `MOBILE_DEVICE_SESSION_TTL_HOURS`
  - `MOBILE_COOKIE_SECURE`
  - `MOBILE_COOKIE_DOMAIN`
  - `MOBILE_ACTIVATION_CLAIM_RATE_LIMIT_MAX`
  - `MOBILE_ACTIVATION_CLAIM_RATE_LIMIT_WINDOW_SECONDS`
  - `MOBILE_LOGIN_START_RATE_LIMIT_MAX`
  - `MOBILE_LOGIN_START_RATE_LIMIT_WINDOW_SECONDS`
  - `MOBILE_LOGIN_VERIFY_RATE_LIMIT_IP_MAX`
  - `MOBILE_LOGIN_VERIFY_RATE_LIMIT_DEVICE_MAX`
  - `MOBILE_LOGIN_VERIFY_RATE_LIMIT_WINDOW_SECONDS`
  - `RATE_LIMIT_BACKEND`
  - `RATE_LIMIT_REDIS_PREFIX`
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
- app surface isolation:
  - `APP_SURFACE=pos|it_admin|all`
  - `POS_ALLOWED_HOSTS`
  - `IT_ADMIN_ALLOWED_HOSTS`

## 8) Known Gaps / Go-live Blockers

Must complete before production go-live:
1. run manual QA checklist with evidence/signoff
2. rotate all production secrets and verify no leakage
3. run restore + rollback drills and keep reports
4. verify monitoring alerts and on-call ownership
5. configure centralized rate limiter in production env and verify fail-closed behavior
6. complete and attach `docs/go-live-evidence-checklist.md` evidence to release ticket

## 9) Guidance for Future GPT/Codex

When implementing next features:
1. keep security invariants in section 3 unchanged
2. avoid schema/logic changes that bypass tenant/branch scope
3. do not add client-trusted identifiers for auth/sales scope
4. extend existing guard utilities, do not duplicate ad hoc checks
5. keep audit logging and failure logging on all sensitive mutations
6. update docs with every behavior change
7. run `typecheck`, `lint`, and `build` before closing

If unsure, prefer safer behavior and explicit rejection over permissive behavior.

## 10) Local Troubleshooting (POS Preview Loading)

If `/preview/pos` hangs on `Loading POS session...`:
1. apply latest Supabase migrations (especially audit compatibility migration)
2. restart local dev server
3. verify `GET /api/pos/session/current` returns either:
   - `401` with `missing_pos_session`, or
   - `200` with session payload
4. verify `GET /api/pos/shifts/current` returns safe non-500 response in normal missing-shift flow
5. verify `POST /api/pos/perf` failures do not block UI (should return non-blocking `logged:false`)

## 11) Removed: QR Scan Login Flow (2026-05-29)

The QR Scan login flow has been completely removed from the system.

What was removed:
- UI pages: `/scan`, `/qr-scan`, `/login/qr-scan`, `/login/qr-card`, `/login/qr-success`
- API routes: `/api/auth/qr/*`, `/api/mobile/login/*`, `/api/mobile/activation/*`, `/api/auth/employee/verify-qr`
- Test scripts: `qr-register-e2e-smoke.mjs`, `qr-branch-approve-smoke.mjs`
- Environment variables: `POS_QR_APPROVAL_SECRET`, `NEXT_PUBLIC_POS_QR_APPROVAL_KEY`, `POS_QR_CREATE_RATE_LIMIT_MAX`, all `MOBILE_*` variables

Database tables remain for backward compatibility but are no longer used:
- `pos_qr_login_tokens` (deprecated, no new tokens created)
- Related QR/mobile policy fields in `branch_policies` (will not be read by login flow)

Current login flow uses only Store Login / Pre-entry:
1. `/login/store` - store code verification
2. `/login/branches` - branch selection (if multi-branch)
3. `/login/employee` - employee code verification only (no QR)
4. `/login/devices` - device/register selection
5. POS session established and user redirected to `/preview/pos`

All security invariants regarding tenant/branch/device/role scoping remain **strictly enforced**.

## Table QR Customer Order Submit Fix (2026-06-10)

### What changed
- Fixed customer QR table ordering submit failure.
- Public customer QR submit now reaches the backend transaction and can insert customer items into the active dine-in table order.
- Fixed Supabase RPC error: `column reference "table_id" is ambiguous`.
- The RPC now qualifies `table_bill_sessions.table_id = v_qr.table_id`.
- Customer submit payload was normalized to send only server-safe fields: `request_id`, `items.product_id`, and numeric `quantity`.
- Client totals/prices remain display-only. Server/database totals remain authoritative.
- The POS shift close reminder was restored to its original behavior: `ต่อกะ` closes the old shift and opens the next shift, and still shows the override error when the shift cannot be closed.

### Files changed
- apps/backoffice-web/src/app/api/table-order/[token]/route.ts
- apps/backoffice-web/src/components/table-order/table-order-mobile.tsx
- apps/backoffice-web/src/components/pos/table-qr-order-modal.tsx
- apps/backoffice-web/src/components/pos/pos-shift-cycle-guard.tsx
- supabase/migrations/202606100001_fix_table_qr_order_tx_table_id_ambiguity.sql

### Verification
- Customer QR submit succeeded and returned a DIN-QR bill number.
- Submitted QR customer items appeared back in the correct POS table cart/order.
- pnpm build passed locally.


## POS Stock Deduction Investigation Handoff (2026-06-11)

### Current status

POS pre-entry login and device selection now work in production for the seeded tenant/branch/device flow.

Verified working login path:

* Store/Tenant code: `NDL-TH-001`
* Branch: `NDL-ONNUT-01` / `อ่อนนุช`
* Employee code: `sst182536`
* PIN: `182536`
* Role: `owner`
* POS device: `NDL-ONNUT-POS-01`
* Production URL: `/preview/pos`

### Current stock issue under investigation

The next blocker is stock deduction after POS sales.

Observed diagnostic result:

* Latest order stock deduction diagnostic returned `Success. No rows returned`.
* Latest order stock movement diagnostic returned `Success. No rows returned`.

This means the diagnostic query did not find a latest order for the checked tenant/branch scope, so the stock deduction issue is not yet proven to be a deduction failure. First confirm whether POS order creation is actually writing rows into `orders` and `order_items`.

### Important stock model

The current system is designed around recipe/ingredient stock tracking:

* `products` = sellable menu items.
* `ingredients` = actual stock quantities.
* `recipes` = mapping from product to ingredient usage per sold item.
* `stock_movements` = audit/history of stock in/out.
* Recipe-based deduction updates `ingredients.quantity_on_hand` and writes `stock_movements`.

For product stock that should behave like simple unit stock, use the existing bridge model:

* Create a fallback ingredient named like `STOCK:<sku>:<product_name>`.
* Create a recipe line of `1` unit per product.
* Set the product to recipe-based stock deduction mode when supported.

Do not rely on client-side totals or client-submitted tenant/branch ids. Tenant, branch, user, role, device, POS session, shift, and feature gates must remain server-resolved.

### Next verification queries

1. Check whether any orders exist in production:

```sql
SELECT
  t.code AS tenant_code,
  b.code AS branch_code,
  b.name AS branch_name,
  o.id AS order_id,
  o.order_no,
  o.status,
  o.order_type,
  o.total_amount,
  o.created_at,
  COUNT(oi.id) AS item_count
FROM public.orders o
JOIN public.tenants t ON t.id = o.tenant_id
JOIN public.branches b ON b.id = o.branch_id
LEFT JOIN public.order_items oi ON oi.order_id = o.id
GROUP BY
  t.code,
  b.code,
  b.name,
  o.id,
  o.order_no,
  o.status,
  o.order_type,
  o.total_amount,
  o.created_at
ORDER BY o.created_at DESC
LIMIT 20;
```

2. If orders exist, inspect product recipe linkage for the latest order:

```sql
WITH latest_order AS (
  SELECT o.*
  FROM public.orders o
  ORDER BY o.created_at DESC
  LIMIT 1
)
SELECT
  t.code AS tenant_code,
  b.code AS branch_code,
  o.order_no,
  o.status,
  p.name AS product_name,
  p.stock_deduction_mode,
  oi.quantity,
  COUNT(r.ingredient_id) AS recipe_lines
FROM latest_order o
JOIN public.tenants t ON t.id = o.tenant_id
JOIN public.branches b ON b.id = o.branch_id
JOIN public.order_items oi ON oi.order_id = o.id
JOIN public.products p
  ON p.id = oi.product_id
 AND p.tenant_id = o.tenant_id
 AND p.branch_id = o.branch_id
LEFT JOIN public.recipes r
  ON r.product_id = p.id
 AND r.tenant_id = p.tenant_id
 AND r.branch_id = p.branch_id
GROUP BY
  t.code,
  b.code,
  o.order_no,
  o.status,
  p.name,
  p.stock_deduction_mode,
  oi.quantity
ORDER BY p.name;
```

### Interpretation

* If no orders exist, debug the POS checkout/order creation flow first.
* If orders exist but no `order_items`, debug order item insert.
* If orders and items exist but `recipe_lines = 0`, repair product recipe/stock bridge setup.
* If `recipe_lines > 0` but no `stock_movements`, debug the stock deduction execution path in `pos-sales-service`.
* If `stock_movements` exists but UI stock does not change, debug stock UI refresh/cache.

## IT Backoffice Planning Sync (2026-06-12)

- Next development focus: IT backoffice/admin system.
- Planning branch: `it-admin-planning-2026-06-12`.
- New handoff document: `docs/AI-HANDOFF-IT-BACKOFFICE-2026-06-12.md`.
- This pass does not run Vercel and does not deploy production.
- IT admin work must preserve tenant isolation, branch scoping, server-side feature gates, service-role server-only usage, and audit logging.

## GitHub Documentation Sync Rule (2026-06-12)

- After every code change, bug fix, or development pass, update the relevant docs before finishing.
- Push documentation updates to GitHub so the planning chat can pull the latest repo context and produce the next Codex command from current evidence.
- Each handoff should include current status, changed files, verification results, risks, and next recommended steps.
- Do not run Vercel, deploy, or push to main unless the user explicitly asks for that action.

## IT Backoffice Audit Update (2026-06-12)

- Branch `it-admin-planning-2026-06-12` was fetched from GitHub and confirmed up to date before audit.
- Latest IT audit details are in `docs/AI-HANDOFF-IT-BACKOFFICE-2026-06-12.md`.
- P1 implementation candidates: tenant package/contract/`core_pos_sales` readiness, branch feature override scope validation, user role branch/user validation, contract plan validation, safer IT admin public errors, and targeted permission/scope/quota tests.
- No Vercel deploy should be run for this audit/development planning pass.
