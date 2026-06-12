# AI Handoff: IT Backoffice Next Pass

Date: 2026-06-12
Branch: it-admin-planning-2026-06-12
Deployment status: No Vercel deploy. No production deploy.

## Source Documents Read

- `context.md`
- `README.md`
- `docs/PROJECT-AUDIT-HANDOFF-2026-06-02.md`
- `docs/pos-multi-owner-branch-architecture.md`
- `docs/production-readiness-checklist.md`
- `docs/manual-qa-checklist.md`
- `docs/go-live-evidence-checklist.md`

Missing documents: none found in current branch.

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
  - Requires `platformRole === "it_admin"`.
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

## Security Guardrails Confirmed

- Never trust client-sent tenant_id, branch_id, store_code, device_code, owner_id, role, permission, or feature state.
- Resolve tenant, branch, user, role, permission, device, contract, and feature state server-side.
- Keep Supabase service-role usage server-only.
- Preserve tenant isolation and branch scoping.
- Preserve audit logging for all sensitive IT admin mutations.
- Preserve server-side feature gate and quota enforcement.
- Do not follow archived QR-login docs as active runtime guidance.

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
