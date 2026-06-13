# AI Handoff: IT Backoffice Next Pass

Date: 2026-06-12
Branch: it-admin-planning-2026-06-12
Deployment status: No Vercel deploy. No production deploy.
Latest audit pass: 2026-06-12, GitHub-synced branch was fetched and confirmed up to date before inspection.

Latest implementation update: 2026-06-12 deployment surface isolation planning/code pass. No Vercel command was run. No deployment was made.

Latest access/login update: 2026-06-12 IT Backoffice login and support-role permission pass. No Vercel command was run. No deployment was made.

Latest UI update: 2026-06-12 first `SSTiPOS Support` login UI pass for the separated IT Backoffice project/domain. No Vercel command was run. No deployment was made.

## Source Documents Read

- `context.md`
- `README.md`
- `docs/AI-HANDOFF-IT-BACKOFFICE-2026-06-12.md`
- `docs/system-stability-audit-2026-06-04.md`
- `docs/PROJECT-AUDIT-HANDOFF-2026-06-02.md`
- `docs/pos-multi-owner-branch-architecture.md`
- `docs/production-readiness-checklist.md`
- `docs/manual-qa-checklist.md`
- `docs/go-live-evidence-checklist.md`

Missing documents: none found in current branch.

## Current Project Status From Repo

- Active runtime app: `apps/backoffice-web` with Next.js App Router, Supabase, TypeScript, pnpm workspaces, and shared packages.
- Current active login/POS entry flow: `/login/store -> /login/branches|employee -> /login/devices -> /preview/pos`.
- QR login docs are archived/historical and must not drive active runtime work.
- Completed foundations from repo docs: secure login context, POS session creation, replay protection, shift gate, POS Sales MVP, attendance APIs, backoffice/IT admin route surfaces, package/subscription feature gates, quota enforcement, audit logging, CI/runbook docs, and production readiness docs.
- Production readiness is not complete: secret rotation, shared production rate limiter verification, staged migration rehearsal, backup/restore drill, rollback drill, alert/on-call routing, and manual QA/go-live evidence remain open.
- System stability docs flag admin monitoring and login/session performance as important operational risks, but this IT Backoffice pass should avoid POS sales changes except blocking bug fixes.
- Latest IT focus from README/context: prepare the IT backoffice/admin development pass without running Vercel, deploying, or pushing to main.

## Deployment Separation Model

POS/Sales and IT Backoffice must be separate Vercel Projects with separate public domains:

- POS/Sales project: example `sstipos-pos`, domain example `pos.<domain>`, `APP_SURFACE=pos`.
- IT Backoffice project: `sstipos-support`, display name `SSTiPOS Support`, domain example `admin.<domain>` or `it.<domain>`, `APP_SURFACE=it_admin`.
- Local full-surface development only: `APP_SURFACE=all`.
- Local IT Backoffice preview: `APP_SURFACE=it_admin`, `PORT=30000`, URL `http://localhost:30000/it-admin/login`.
- Local POS command: `pnpm dev` or `pnpm dev:pos`.
- Local IT command: `pnpm dev:it-support`.

Repository separation target as of 2026-06-14:
- POS repo/folder: `sstdevelopaminno/POS-Preview`, `E:\POS Preview`.
- IT repo/folder: `sstdevelopaminno/SSTiPOSSupport`, `E:\SSTiPOSSupport`.
- Runbook: `docs/future-repository-separation-plan.md`.
- Both repositories continue to use the same existing Supabase project/database.
- `packages/*` and `supabase/migrations/*` are canonical shared assets and must not diverge.

They must not share one public URL. POS users must not be able to access `/it-admin/*`, `/api/it-admin/*`, `/audit-logs`, or tenant/admin aliases from the POS domain. IT staff must not use the POS sales URL to access IT Backoffice.

Future Vercel setup must configure separate environment variables, allowed hosts, production aliases, and secrets per project. The IT Backoffice project must reuse the same Supabase project/database as POS: same Supabase URL, anon key, server-only service role key, and required auth/session secrets. Do not create a separate Supabase project for IT Backoffice.

This pass intentionally did not run Vercel and did not create or modify Vercel projects. Do not run `vercel --prod` for IT preview verification.

Proposed/project env variables:

- `APP_SURFACE=pos|it_admin|all`
- `POS_ALLOWED_HOSTS=pos.<domain>`
- `IT_ADMIN_ALLOWED_HOSTS=admin.<domain>,it.<domain>`

Implemented app surface preparation:

- `apps/backoffice-web/src/proxy.ts` adds high-level surface routing:
  - `APP_SURFACE=pos` redirects IT admin routes/APIs away from the POS surface.
  - `APP_SURFACE=it_admin` redirects `/` to `/it-admin` and redirects POS sales/login/API routes away from the IT surface.
  - `APP_SURFACE=all` leaves both surfaces available for local development.
  - Existing `/preview/pos/*` POS session-cookie protection remains active for `APP_SURFACE=pos` and local `APP_SURFACE=all`.
- `/it-admin/login` is prepared as a separate IT staff login route and is not the POS store login.
- `(it-admin)/layout.tsx` now performs a server-side platform role check and redirects non-IT users to `/it-admin/login`.
- IT admin server/API guards now allow only `it_admin` or `it_support`; `tenant_user` is rejected.

Security note: `proxy.ts` is only a routing/domain boundary. It is not the sole auth layer. IT layout and APIs still resolve auth/role server-side, and POS routes must continue resolving POS session, tenant, branch, device, permission, contract, and feature state server-side.

## IT Backoffice Role/Menu Matrix

| Surface / action | `it_admin` | `it_support` | `tenant_user` |
|---|---:|---:|---:|
| `/it-admin/login` Supabase Auth login | yes | yes | rejected |
| IT dashboard | yes | yes | no |
| Tenant management | yes | yes | no |
| Branch management | yes | yes | no |
| Package catalog and quote | yes | yes | no |
| Package contract/subscription | yes | yes | no |
| User/branch-role create/update | yes | yes | no |
| User/branch-role delete/deactivate | yes | no | no |
| Active POS sessions/revoke | yes | yes | no |
| Shifts close/suspend | yes | yes | no |
| Audit log review | yes | yes | no |
| Monitoring/readiness view | yes | yes | no |
| Feature flags and branch overrides | yes | no | no |
| Device/register management | yes | no | no |
| Activation tokens and device enrollments | yes | no | no |
| Customer display device/policy control | yes | no | no |
| Login policy management | yes | no | no |
| Platform users | yes | no | no |
| IT settings pages | yes | no | no |
| Raw audit log edit/delete | no direct route | no direct route | no |

Implementation notes:

- `packages/shared-types/src/index.ts` includes `PlatformRole = "it_admin" | "it_support" | "tenant_user"`.
- `auth-context.ts` accepts `it_support` and resolves platform role from Supabase Auth app metadata or `users_profiles`.
- `it-admin-guard.ts` now exposes capability checks through `requireItAdmin({ permission })`, `hasItAdminPermission`, and `assertItAdminPermission`.
- `it_support` permission is enforced in API guards and server pages. UI menu filtering is only a convenience layer.
- `activation-admin-guard.ts` is intentionally full `it_admin` only because support must not manage device registration/control.
- Migration `supabase/migrations/20260612132854_add_it_support_platform_role.sql` adds `it_support` to the Postgres enum.

## IT Backoffice Login Behavior

- Route: `/it-admin/login`.
- API: `POST /api/it-admin/auth/login`.
- Uses Supabase server client `signInWithPassword`.
- After sign-in, resolves `users_profiles.platform_role` server-side using the service-role client.
- Allows only active `it_admin` and `it_support` profiles.
- Rejects and signs out `tenant_user`, inactive profiles, and missing profiles.
- UI system name/title: `SSTiPOS Support`.
- UI includes a white/blue split card, left branding panel, right email/password form, tablet/mobile responsive stacking, and PWA-ready safe viewport padding.
- UI includes Thai/English loading, error, invalid-role, session-expired, signed-out, and success states.
- Email/password tab is wired to the existing IT auth API; role is still resolved server-side after sign-in.
- QR login tab is a placeholder only and shows: "QR login for mobile support devices is coming soon." No QR authentication runtime was implemented.
- Forgot-password link is a placeholder message only; no reset workflow was implemented.
- Preferred support logo path is `apps/backoffice-web/public/brand/sstipos-support-logo.png`. A placeholder copied from the existing SST iPOS logo is committed for preview; replace that file with the real `SSTiPOS Support` logo before brand QA/production promotion.
- IT staff must not use `/login/store`; POS store login remains for POS users only.
- Development IT platform users can be created or refreshed with `apps/backoffice-web/scripts/create-it-platform-users.mjs`. It uses the same Supabase project/database env as POS and requires `SST_IT_ADMIN_EMAIL`, `SST_IT_ADMIN_PASSWORD`, `SST_IT_SUPPORT_EMAIL`, and `SST_IT_SUPPORT_PASSWORD`. Do not commit real credential values.
- Login usability fix: `/it-admin/login` resets stale invalid-role/error state on input changes, times out stalled login requests, and `/api/it-admin/auth/login` signs out any old Supabase session before signing in the IT account.
- IT menu fix: the IT shell shows `SSTiPOS Support`, displays `IT Admin` or `IT Support`, and removes the duplicate tenant/store nav item while preserving permission-filtered menus.
- IT role menu update: `it_support` nav is limited to tenants, branches, package contracts, users/roles, active sessions, shifts, audit review, and monitoring/readiness. `it_admin` also gets feature flags/branch overrides, devices/registration, customer display devices, platform users, and settings.
- IT office dashboard redesign: `(it-admin)/layout.tsx` now renders `ItSupportShell` with left sidebar navigation, mobile drawer, top bar role/account/language controls, SST Innovation logo, and light-blue/white office dashboard styling. Logo path: `apps/backoffice-web/public/brand/sst-innovation-logo.png`.

Files changed in this UI pass:

- `apps/backoffice-web/src/components/it-admin/it-admin-login-form.tsx`
- `apps/backoffice-web/public/brand/sstipos-support-logo.png`
- `apps/backoffice-web/src/app/it-admin/login/page.tsx`
- `apps/backoffice-web/src/app/globals.css`
- `context.md`
- `README.md`
- `docs/AI-HANDOFF-IT-BACKOFFICE-2026-06-12.md`

Verification for this UI pass:

- `pnpm --filter backoffice-web typecheck` passed.
- `pnpm --filter backoffice-web lint` passed.
- `pnpm --filter backoffice-web test -- --cache false` passed: 22 files, 54 tests.

## Current IT Admin Surface Map

### Routes found under `apps/backoffice-web/src/app/(it-admin)/`

- `layout.tsx` - shared IT admin layout/nav.
- `audit-logs/page.tsx` - platform audit log console.
- `it-admin/page.tsx` - IT admin dashboard entry.
- `it-admin/customer-display/page.tsx` - customer display device console.
- `it-admin/monitoring/page.tsx` - monitoring/readiness entry.
- `it-admin/packages/page.tsx` - package quote/catalog console.
- `it-admin/platform-users/page.tsx` - platform user entry.
- `it-admin/settings/language/page.tsx` - language/settings entry.
- `it-admin/tenants/page.tsx` - tenant index route.
- `tenants/page.tsx` - tenant index route alias.
- `tenants/[tenantId]/page.tsx` - tenant detail route.
- `tenants/[tenantId]/branches/page.tsx` - tenant branch admin.
- `tenants/[tenantId]/devices/page.tsx` - tenant device/register admin.
- `tenants/[tenantId]/features/page.tsx` - tenant contract/features admin.
- `tenants/[tenantId]/login-policies/page.tsx` - branch login policy admin.
- `tenants/[tenantId]/sessions/page.tsx` - POS session admin.
- `tenants/[tenantId]/shifts/page.tsx` - shift admin.
- `tenants/[tenantId]/users/page.tsx` - user/role admin.

### IT login and surface isolation files

- `apps/backoffice-web/src/app/it-admin/login/page.tsx` - separate IT staff login route prepared for the IT Backoffice project/domain.
- `apps/backoffice-web/src/proxy.ts` - high-level Vercel surface/domain isolation for `APP_SURFACE=pos|it_admin|all`.

### Components found under `apps/backoffice-web/src/components/it-admin/`

- `customer-display-admin-console.tsx` - lists/revokes customer display pairings and edits display policies.
- `package-billing-console.tsx` - reads package catalog and calculates package quotes.
- `platform-audit-logs-console.tsx` - filters and displays audit log rows.
- `tenant-admin-nav.tsx` - tenant section navigation.
- `tenant-index-console.tsx` - lists tenants with branch/session counts and drill-down links.
- `tenant-section-console.tsx` - shared tenant section UI for branches, users, devices, login policies, sessions, shifts, features, and contract editing.

### APIs found under `apps/backoffice-web/src/app/api/it-admin/`

- `tenants/route.ts` - creates tenants; writes audit log.
- `packages/route.ts` - lists package catalog for IT admin.
- `packages/quote/route.ts` - calculates quotes; writes audit log.
- `admin/tenants/route.ts` - lists tenants with branch and active-session counts.
- `admin/tenants/[tenantId]/branches/route.ts` - lists, creates, and updates branches; enforces branch feature/quota; writes audit logs.
- `admin/tenants/[tenantId]/contract/route.ts` - reads and patches latest tenant contract and limits; writes plan/status audit events.
- `admin/tenants/[tenantId]/devices/route.ts` - lists and mutates devices; enforces device feature/quota; writes audit logs.
- `admin/tenants/[tenantId]/features/route.ts` - reads feature catalog/effective tenant or branch state; writes tenant/branch overrides and audit logs.
- `admin/tenants/[tenantId]/login-policies/route.ts` - lists and updates branch login policies; writes audit logs.
- `admin/tenants/[tenantId]/sessions/route.ts` - lists and revokes POS sessions; writes audit logs.
- `admin/tenants/[tenantId]/shifts/route.ts` - lists and closes/suspends shifts; writes audit logs.
- `admin/tenants/[tenantId]/users/route.ts` - lists, assigns, updates, and deactivates branch roles; enforces user feature/quota; writes audit logs.
- `admin/audit-logs/route.ts` - paginated audit log query.
- `admin/activation-tokens/route.ts` - creates activation tokens with feature/quota checks and audit logging.
- `admin/device-enrollments/route.ts` - lists enrollment records with feature checks.
- `admin/device-enrollments/[id]/approve/route.ts` - approves enrollments with feature checks and audit logging.
- `admin/device-enrollments/[id]/revoke/route.ts` - revokes enrollments with feature checks and audit logging.
- `customer-display/devices/route.ts` - lists/revokes customer display pairings; writes audit logs.
- `customer-display/policies/route.ts` - reads/updates customer display policies; writes audit logs.

### Services/guards found and their purpose

- `apps/backoffice-web/src/lib/it-admin-guard.ts`
  - Server-only IT admin guard.
  - Uses `getAuthContext({ requireBranchScope: false })`.
  - Requires `platformRole === "it_admin"` or `platformRole === "it_support"`.
  - Provides service-role Supabase client and request metadata.
  - Converts guard/feature errors to safe API responses.
- `apps/backoffice-web/src/lib/feature-gate.ts`
  - Server-only feature and quota resolver.
  - Resolves latest tenant contract, plan features, tenant overrides, and branch overrides.
  - Enforces quotas for branches, devices, and users.
  - Keeps a short-lived feature decision cache and cache invalidation helper.
- `apps/backoffice-web/src/lib/services/subscription-package-service.ts`
  - Reads package and feature catalog.
  - Falls back to default catalog when schema is missing.
  - Builds subscription quotes from package, feature, contract type, billing interval, deployment mode, branch count, and terminal count.

## Completed IT Admin Modules

- Platform access guard: `requireItAdmin()` requires `platformRole === "it_admin"` or `platformRole === "it_support"` and keeps the Supabase service-role client server-only.
- Tenant listing: `/api/it-admin/admin/tenants` lists tenants with branch and active-session counts.
- Tenant creation: `/api/it-admin/tenants` creates tenant records and writes audit logs.
- Branch management: list/create/update is tenant-scoped, feature-gated by `branch_management`, quota-checked, and audited.
- Device/register management: list/update actions are tenant-scoped, feature-gated by `device_management`, quota-checked for active provisioning actions, and audited.
- User/role management: list/assign/update/deactivate flows are tenant-scoped, feature-gated by `user_management`, quota-aware, duplicate-aware, and audited.
- Contract management: latest contract read/update/create flow exists with plan/status audit events and feature gate cache invalidation.
- Feature management: catalog/effective state read flow exists for tenant and optional branch scope; tenant/branch override write flow exists and audits changes.
- Login policy management: branch policy read/update flow exists and audits mutations.
- Active POS session management: tenant/branch scoped list and revoke flow exists and audits revocation.
- Shift management: tenant/branch scoped list and close/suspend flow exists and audits forced state changes.
- Audit log console/API: IT admin can filter paginated audit logs by tenant, branch, actor, action, date, and search.
- Package quote console/API: IT admin can read package catalog and calculate package quotes with quote audit logging.
- Customer display admin: pairings and policies have IT admin read/update/revoke surfaces with audit logging.
- Device enrollment admin: activation token, enrollment list, approve, and revoke flows exist with feature/quota checks and audit logging.

## Missing Or Incomplete IT Admin Modules

- Tenant/package readiness dashboard: tenant index does not show active package/contract state or effective `core_pos_sales`.
- Branch-level readiness: branch views do not clearly show whether each branch is blocked by inactive contract, disabled tenant/branch, or feature override.
- Safe tenant enable/disable action: tenant list shows status but does not expose a complete audited enable/disable workflow in the inspected admin tenant index surface.
- Branch feature override hardening: `features` PATCH accepts `branch_id`; add explicit branch belongs-to-tenant validation before reading/writing overrides.
- Contract setup UX: contract editing exists in feature pane, but no strong readiness banner for missing/inactive/expired contract.
- User lookup UX: role assignment still requires raw `user_id`; add a server-resolved search/select path instead of manual IDs.
- Bilingual IT admin states: loading/error/success states exist, but sensitive actions need clear Thai/English confirmation and empty/error/success copy.
- Safe public errors: many guarded routes use `guardItAdminError`, but it can return raw `error.message` for unexpected errors; review before production hardening.
- Tests: targeted tests for IT admin contract state, feature gates, branch override scope, tenant isolation, quota rejection, and non-IT permission rejection are still incomplete.

## Security Guardrails Confirmed

- Never trust client-sent tenant_id, branch_id, store_code, device_code, owner_id, role, permission, or feature state.
- Resolve tenant, branch, user, role, permission, device, contract, and feature state server-side.
- Keep Supabase service-role usage server-only.
- Preserve tenant isolation and branch scoping.
- Preserve audit logging for all sensitive IT admin mutations.
- Preserve server-side feature gate and quota enforcement.
- Do not follow archived QR-login docs as active runtime guidance.

## Priority Gap Matrix

| Priority | Gap | Why it matters | Next action |
|---|---|---|---|
| P0 | None identified in this planning pass. | No immediate data-loss or deploy-blocking IT admin defect was proven from repo-only inspection. | Keep implementation narrow and verify before release. |
| P1 | Tenant index lacks package/contract/`core_pos_sales` readiness. | IT cannot quickly see whether a tenant can safely use POS sales. | Extend tenant index API/UI with latest contract and effective core feature state. |
| P1 | Branch feature override write lacks explicit branch scope validation. | A client-sent `branch_id` must never be trusted without server-side ownership validation. | Validate branch belongs to tenant before override read/write and add rejection tests. |
| P1 | Contract/package setup is not a complete readiness workflow. | Tenants without valid active/trial contracts must be visibly blocked and explainable. | Add readiness banner/state and targeted contract/feature-gate tests. |
| P1 | Targeted IT admin tests are incomplete. | Guardrails depend on tenant isolation, branch scoping, permission rejection, quotas, and feature gates. | Add focused route/service tests for these paths. |
| P2 | Sensitive action confirmations are thin. | Revoke/close/suspend/disable/toggle actions need safer operator UX. | Add Thai/English confirmation, success, empty, loading, and error states. |
| P2 | User role assignment requires raw `user_id`. | Operators should not paste opaque IDs; server should resolve users. | Add user search/select API and UI flow. |
| P2 | Audit log filters expose raw identifiers. | IT needs readable tenant/branch/user context and evidence export later. | Add selector metadata and plan export/evidence workflow. |
| P2 | Monitoring/readiness is document-driven. | Production readiness evidence is not surfaced inside IT admin. | Add readiness dashboard after P1 guardrails. |

## IT Admin Module Audit Matrix (2026-06-12)

| Module | Existing route/page/API files | Current status | Missing behavior | Risk | API work | UI work | Migration | Tests |
|---|---|---|---|---|---|---|---|---|
| Tenant management | Pages: `tenants/page.tsx`, `it-admin/tenants/page.tsx`, `tenants/[tenantId]/page.tsx`; UI: `tenant-index-console.tsx`, `tenant-admin-nav.tsx`; APIs: `api/it-admin/admin/tenants/route.ts`, `api/it-admin/tenants/route.ts` | Tenant list and drill-down exist; tenant creation API currently returns a generated payload and audit event but does not visibly persist a tenant row in the inspected implementation. | Tenant index lacks active contract/package/core feature readiness; no complete audited enable/disable tenant action in inspected console; tenant create path needs persistence/status validation before being treated as production-ready. | P1 | Yes | Yes | Maybe, only if tenant lifecycle/status fields are missing | Yes |
| Branch management | Page: `tenants/[tenantId]/branches/page.tsx`; UI: `tenant-section-console.tsx`; API: `admin/tenants/[tenantId]/branches/route.ts` | List/create/update are tenant-scoped; create enforces `branch_management`, quota, duplicate handling, and audit logging; update validates branch belongs to tenant before mutation. | UI lacks strong confirmation and bilingual success/error/empty states; readiness does not show contract/feature blockers per branch. | P2 | No for current hardening, yes for readiness data | Yes | No | Optional API/UI tests |
| Device/register management | Page: `tenants/[tenantId]/devices/page.tsx`; UI: `tenant-section-console.tsx`; APIs: `admin/tenants/[tenantId]/devices/route.ts`, `admin/activation-tokens/route.ts`, `admin/device-enrollments/*` | Device list/update are tenant-scoped and feature-gated; approve/activate enforce quota and audit; activation token and enrollment approve/revoke validate activation scope and audit. | UI lacks confirmations for approve/activate/deactivate/block; quota/feature-blocked states need clearer Thai/English copy. | P2 | No for core flow, maybe for richer readiness | Yes | No | Yes for quota and permission rejection |
| User and role management | Page: `tenants/[tenantId]/users/page.tsx`; UI: `tenant-section-console.tsx`; API: `admin/tenants/[tenantId]/users/route.ts` | Role list/assign/update/deactivate exist; tenant filters and audit logs exist; user quota runs for first role assignment. | UI requires raw `user_id`; POST/PATCH should explicitly validate branch belongs to tenant and user exists/is active before write, rather than relying on query/FK behavior; role options should remain server-authorized. | P1 | Yes | Yes | No | Yes |
| Package and subscription contract management | Page: `it-admin/packages/page.tsx`, tenant features page; UI: `package-billing-console.tsx`, `tenant-section-console.tsx`; APIs: `packages/route.ts`, `packages/quote/route.ts`, `admin/tenants/[tenantId]/contract/route.ts`; service: `subscription-package-service.ts` | Package catalog/quote exist; tenant contract read/create/update exists; cache invalidation and plan/status audit events exist. | Tenant index does not show contract readiness; contract PATCH should validate submitted plan/package is active before write; UI needs no-contract/inactive/expired warnings and effective `core_pos_sales` state. | P1 | Yes | Yes | No | Yes |
| Feature flags and branch overrides | Page: `tenants/[tenantId]/features/page.tsx`; UI: `tenant-section-console.tsx`; APIs: `admin/tenants/[tenantId]/features/route.ts`; service: `feature-gate.ts` | Effective feature read combines contract state, plan features, tenant override, and optional branch override; PATCH writes override, invalidates feature cache, and audits. | PATCH accepts client `branch_id` without explicit branch belongs-to-tenant validation; GET should also reject branch filters outside tenant for clearer operator feedback; no targeted branch-scope rejection test. | P1 | Yes | No | No | Yes |
| Active POS sessions | Page: `tenants/[tenantId]/sessions/page.tsx`; UI: `tenant-section-console.tsx`; API: `admin/tenants/[tenantId]/sessions/route.ts` | Tenant/branch scoped list and revoke exist; revoke audits and only mutates session rows in the tenant. | UI revoke action lacks confirmation and explicit success/empty states; session list shows raw IDs only. | P2 | No | Yes | No | Optional |
| Shifts | Page: `tenants/[tenantId]/shifts/page.tsx`; UI: `tenant-section-console.tsx`; API: `admin/tenants/[tenantId]/shifts/route.ts` | Tenant/branch scoped list and force close/suspend exist with audit logging. | Force close/suspend lacks confirmation, operational warning copy, and detailed outcome state; no special check for open settlement risks in inspected IT admin UI. | P2 | No for confirmation, maybe for richer risk metadata | Yes | No | Optional |
| Audit logs | Page: `audit-logs/page.tsx`; UI: `platform-audit-logs-console.tsx`; API: `admin/audit-logs/route.ts` | Paginated audit query with tenant, branch, actor, action, date, and search filters exists. | UI filters are raw IDs; no tenant/branch selectors, export, or evidence workflow; read filter scope is platform-wide for IT admin and should remain explicit. | P2 | Maybe | Yes | No | Optional |
| Monitoring/readiness visibility | Page: `it-admin/monitoring/page.tsx`; related docs: `production-readiness-checklist.md` | Monitoring page exists and polls POS health endpoint; production readiness checklist exists in docs. | IT readiness is not a contract/package/feature/audit dashboard; page uses `/api/admin/pos/monitor` outside the inspected API tree and docs already flag monitor performance risk; Thai copy appears mojibake in shell output and should be checked in IDE before UI edits. | P1 | Yes | Yes | Maybe if storing readiness evidence | Yes |
| UX loading/error/empty states | UI: `tenant-index-console.tsx`, `tenant-section-console.tsx`, `package-billing-console.tsx`, `customer-display-admin-console.tsx`, `platform-audit-logs-console.tsx` | Basic loading and error states exist; some success state exists in tenant section console. | Sensitive actions mostly fire immediately without confirmation; bilingual Thai/English loading, empty, error, success, and confirmation states are inconsistent; several tables lack explicit empty rows. | P2 | No | Yes | No | Optional UI tests/manual QA |
| Tests and QA evidence | Docs: this handoff plus readiness/manual QA docs; no IT admin test files were inspected because the requested scope was limited to IT admin runtime paths. | Prior docs say targeted IT admin tests are incomplete. | Need focused tests for contract inactive/no-contract behavior, `core_pos_sales` readiness, feature override branch scope rejection, user role branch scope rejection, tenant isolation, quota rejection, and non-IT permission rejection. | P1 | No, except where gaps are fixed | No | No | Yes |

## Security Verification Notes (2026-06-12)

- Server-only boundaries are mostly preserved in `it-admin-guard.ts`, `feature-gate.ts`, and `subscription-package-service.ts`.
- `requireItAdmin()` resolves auth server-side and only exposes the service-role Supabase client from server-only code.
- Tenant and branch mutations for branches/devices/sessions/shifts generally include `.eq("tenant_id", tenantId)` and audit logging.
- P1 hardening needed: `admin/tenants/[tenantId]/features/route.ts` must validate any submitted `branch_id` belongs to the route tenant before read/write override operations.
- P1 hardening needed: `admin/tenants/[tenantId]/users/route.ts` should validate the submitted branch and user server-side before assigning/updating roles.
- P1 hardening needed: `customer-display/policies/route.ts` accepts `tenant_id` and `branch_id` directly from request query/body; validate branch ownership before policy read/upsert or route it through a tenant-scoped API.
- P1 hardening needed: `it-admin-guard.ts` currently returns raw unexpected `error.message` for `it_admin_internal_error`; keep detailed errors server-side and return a safer public message.
- Do not use archived QR login docs as active guidance; the current login flow remains store/branch/employee/device.
- Deployment isolation guardrail: POS/Sales and IT Backoffice production surfaces must be deployed as separate Vercel Projects/domains with `APP_SURFACE` and allowed-host env vars configured per project.
- IT support guardrail: `it_support` is a limited platform role and must never inherit full `it_admin` capabilities by default.

## Safe Implementation Task Pack

1. Add tenant readiness data to `/api/it-admin/admin/tenants`: latest contract status, package code/name, contract validity, and effective `core_pos_sales` from server-side feature resolution.
2. Update `tenant-index-console.tsx` to show package/contract/core POS readiness with clear Thai/English loading, empty, error, and warning states.
3. Harden `admin/tenants/[tenantId]/features/route.ts` with branch belongs-to-tenant validation before branch override GET/PATCH.
4. Harden `admin/tenants/[tenantId]/users/route.ts` by resolving submitted branch and user server-side before role assignment/update/deactivation.
5. Validate contract `plan_id` against active subscription packages before writing a tenant contract.
6. Add focused tests for non-IT rejection, feature override branch-scope rejection, user role branch-scope rejection, inactive/no-contract `core_pos_sales`, and quota rejection.
7. Only after P1 hardening, add P2 confirmations and bilingual UX states across branch/device/session/shift/feature actions.

## IT Backoffice Gap List

### 1. Tenant management

- Evidence: `tenant-index-console.tsx` lists tenant status, branch count, active session count, and drill-down links; `admin/tenants/route.ts` currently returns branch/session counts only.
- Gap: tenant index does not show package/contract readiness or effective `core_pos_sales`.
- Risk: P1
- Recommended next action: add contract/package/core POS readiness to tenant index API/UI.
- Requires schema migration: no
- Requires API change: yes
- Requires UI change: yes
- Requires tests: yes

### 2. Branch management

- Evidence: `admin/tenants/[tenantId]/branches/route.ts` creates/updates branches with tenant-scoped queries, feature gate, quota, and audit logs.
- Gap: UI has basic add/toggle controls but sparse confirmation/success/empty states.
- Risk: P2
- Recommended next action: add clear Thai/English confirmation, loading, success, and empty states.
- Requires schema migration: no
- Requires API change: no
- Requires UI change: yes
- Requires tests: optional targeted UI/API tests

### 3. Device/register management

- Evidence: `admin/tenants/[tenantId]/devices/route.ts` enforces `device_management`, quota checks for approve/activate, and audit logs.
- Gap: UI actions are available but have limited confirmation and readiness explanation for quota/feature blocked states.
- Risk: P2
- Recommended next action: add action confirmations and clearer quota/feature error display.
- Requires schema migration: no
- Requires API change: no
- Requires UI change: yes
- Requires tests: yes for quota/permission rejection

### 4. User and role management

- Evidence: `admin/tenants/[tenantId]/users/route.ts` enforces `user_management`, tenant-scoped role assignment, duplicate prevention, quota checks, and audit logs.
- Gap: UI requires raw `user_id`; no search/select workflow for tenant users.
- Risk: P2
- Recommended next action: add safe user lookup/search flow that resolves users server-side.
- Requires schema migration: no
- Requires API change: likely yes
- Requires UI change: yes
- Requires tests: yes

### 5. Package and subscription contract management

- Evidence: `admin/tenants/[tenantId]/contract/route.ts` reads latest contract and limits; patches latest/initial contract. `package-billing-console.tsx` can quote packages but is not a complete contract setup workflow.
- Gap: contract setup is only visible in tenant features pane and does not prominently block/warn when no valid active/trial contract exists.
- Risk: P1
- Recommended next action: make tenant/package contract status visible on tenant index and tenant detail; add safe plan validation and audit event for every contract mutation.
- Requires schema migration: no
- Requires API change: yes
- Requires UI change: yes
- Requires tests: yes

### 6. Feature flags and branch overrides

- Evidence: `admin/tenants/[tenantId]/features/route.ts` computes feature state from latest contract, plan features, tenant override, then branch override; PATCH writes overrides.
- Gap: branch override writes should explicitly validate that submitted `branch_id` belongs to the tenant before writing.
- Risk: P1
- Recommended next action: validate branch scope before feature override write and add targeted branch-scope rejection tests.
- Requires schema migration: no
- Requires API change: yes
- Requires UI change: no
- Requires tests: yes

### 7. Active POS sessions

- Evidence: `admin/tenants/[tenantId]/sessions/route.ts` lists tenant/branch scoped sessions and revokes sessions with audit logs.
- Gap: UI has revoke action but lacks stronger confirmation/empty/success states.
- Risk: P2
- Recommended next action: add confirmation and explicit success state; keep revoke tenant-scoped server-side.
- Requires schema migration: no
- Requires API change: no
- Requires UI change: yes
- Requires tests: optional

### 8. Shifts

- Evidence: `admin/tenants/[tenantId]/shifts/route.ts` lists tenant/branch scoped shifts and closes/suspends with audit logs.
- Gap: force close/suspend UI lacks strong confirmation and operational explanation.
- Risk: P2
- Recommended next action: add confirmation and clear warning copy for forced shift state changes.
- Requires schema migration: no
- Requires API change: no
- Requires UI change: yes
- Requires tests: optional

### 9. Audit logs

- Evidence: `admin/audit-logs/route.ts` supports tenant, branch, actor, action, date, and search filters with pagination. `platform-audit-logs-console.tsx` exposes filters.
- Gap: filters are raw text and do not surface tenant/branch names; manual evidence/signoff is still missing.
- Risk: P2
- Recommended next action: add tenant/branch selector metadata and export/evidence workflow later.
- Requires schema migration: no
- Requires API change: likely yes
- Requires UI change: yes
- Requires tests: optional

### 10. Monitoring/readiness visibility

- Evidence: `production-readiness-checklist.md` marks alert/on-call, restore drill, migration rehearsal, and operational handoff as not done or must-do before go-live.
- Gap: IT admin route exists for monitoring, but readiness evidence is document-driven and not fully wired into a dashboard.
- Risk: P1
- Recommended next action: add an IT admin readiness dashboard pulling contract/feature/session/audit/alert checklist status.
- Requires schema migration: maybe, if storing readiness evidence
- Requires API change: yes
- Requires UI change: yes
- Requires tests: yes

### 11. UX loading/error/empty states

- Evidence: `tenant-index-console.tsx`, `tenant-section-console.tsx`, `package-billing-console.tsx`, `customer-display-admin-console.tsx`, and `platform-audit-logs-console.tsx` have basic loading/error states.
- Gap: sensitive actions need clearer Thai/English loading, empty, success, error, and confirmation states.
- Risk: P2
- Recommended next action: standardize bilingual state copy across IT admin panes.
- Requires schema migration: no
- Requires API change: no
- Requires UI change: yes
- Requires tests: optional

### 12. Tests and QA evidence

- Evidence: existing integration test folder covers many POS/backoffice behaviors; manual QA/go-live evidence docs still require execution and attachment.
- Gap: targeted IT admin tests for contract state, feature gate behavior, branch override scoping, tenant isolation, and permission rejection are incomplete.
- Risk: P1
- Recommended next action: add integration tests around IT admin permission rejection, contract inactive/no-contract behavior, feature override scoping, and quota blocked paths.
- Requires schema migration: no
- Requires API change: no, unless hardening gaps are fixed
- Requires UI change: no
- Requires tests: yes

## Recommended Development Order

1. Stabilize IT admin guard and server-side scope resolution.
2. Add IT dashboard visibility for tenant, branch, package, contract, feature, device, session, shift, and audit status.
3. Add or fix package/contract setup so tenants cannot reach POS sales without a valid active contract.
4. Add effective feature state view per tenant and branch, especially `core_pos_sales`.
5. Add safe enable/disable actions for tenants, branches, devices, and feature overrides with audit logs.
6. Add targeted tests for tenant isolation, branch scoping, permission rejection, feature gate behavior, and contract state.
7. Update context.md and README.md after implementation.

## No Deploy Confirmation

- Vercel was not run.
- Production deploy was not run.
- No deployment command was executed.
- Vercel Projects were not created or modified.
- The branch must be pushed to GitHub for documentation sync, but not to `main` unless explicitly requested.

## Verification Update (2026-06-12 Deployment Surface Pass)

- `cmd /c pnpm --filter backoffice-web typecheck` - pass.
- `cmd /c pnpm --filter backoffice-web lint` - pass.
- `git diff --check` - pass, with Windows line-ending warnings only.
- No Vercel command was run.
- No deployment was made.

## Verification Update (2026-06-12 IT Login/Support Role Pass)

- `cmd /c pnpm --filter backoffice-web typecheck` - pass.
- `cmd /c pnpm --filter backoffice-web lint` - pass.
- `cmd /c pnpm --filter backoffice-web test -- --cache false` - pass, 22 test files / 54 tests.
- `git diff --check` - pass, with Windows line-ending warnings only.
- No Vercel command was run.
- No deployment was made.

## GitHub Documentation Sync Rule

- Every future implementation or bug-fix pass must update the relevant documentation before finishing.
- Documentation updates should be pushed to GitHub so the planning chat can pull current repo context before preparing the next Codex command.
- Each handoff should report current status, changed files, verification results, risks, and next recommended steps.
- Do not run Vercel, deploy, or push to main unless the user explicitly asks for deployment/main push.
