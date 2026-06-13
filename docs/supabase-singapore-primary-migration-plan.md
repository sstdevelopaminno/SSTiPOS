# Supabase Singapore Primary Migration Plan

Date: 2026-06-12

## Current Project Summary

- Current Supabase project: POS-Preview
- Current region: ap-south-1 / Mumbai
- Current role: active primary database until a Singapore project can be created.
- Target role after future cutover: legacy archive, rollback source, and historical reference
- Rule: do not delete the old project and do not route new POS writes to it after cutover.
- Note: Singapore project creation is pending because the current Supabase account/plan cannot create the desired new project yet.

## Target Primary Database

- New Supabase project region: ap-southeast-1 / Singapore
- Target role: primary production database for Thailand users
- Status: planned, not created yet
- Active writes must use the Singapore primary database:
  - login
  - device activation
  - branch selection
  - open/close shift
  - orders, order items, payments, receipts
  - active products, users, tenants, branches, subscriptions, and feature gates

## Required Environment Variables

Primary DB:

- `SUPABASE_PRIMARY_URL`
- `SUPABASE_PRIMARY_ANON_KEY`
- `SUPABASE_PRIMARY_SERVICE_ROLE_KEY`

Archive DB:

- `SUPABASE_ARCHIVE_URL`
- `SUPABASE_ARCHIVE_SERVICE_ROLE_KEY`

Migration flags:

- `HOT_DATA_RETENTION_MONTHS=12`
- `ENABLE_ARCHIVE_READS=false`
- `ENABLE_DUAL_DB_MODE=false`

Temporary compatibility:

- For now, existing `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` continue to point to POS-Preview and act as the configured primary DB.
- After Singapore is available, either set `SUPABASE_PRIMARY_*` to Singapore or map the legacy env names to Singapore during transition.

## Current Supabase Usage Audit

Primary client files:

- `apps/backoffice-web/src/lib/supabase-admin.ts`
- `apps/backoffice-web/src/lib/supabase-server.ts`
- `apps/backoffice-web/src/lib/server/db/primary.ts`
- `apps/backoffice-web/src/lib/server/db/archive.ts`
- `apps/backoffice-web/src/lib/server/db/router.ts`

High-impact service/API areas that must stay on primary for writes:

- `apps/backoffice-web/src/lib/server/*`
- `apps/backoffice-web/src/lib/pos-session-guard.ts`
- `apps/backoffice-web/src/lib/feature-gate.ts`
- `apps/backoffice-web/src/lib/services/pos-sales-service.ts`
- `apps/backoffice-web/src/lib/services/pos-sales-list-service.ts`
- `apps/backoffice-web/src/lib/services/pos-sales-summary-service.ts`
- `apps/backoffice-web/src/app/api/auth/*`
- `apps/backoffice-web/src/app/api/store/*`
- `apps/backoffice-web/src/app/api/pos/*`
- `apps/backoffice-web/src/app/api/backoffice/*`
- `apps/backoffice-web/src/app/api/it-admin/*`

## Schema Migration Steps

1. Backup the Mumbai database first.
2. Create the new Singapore Supabase project.
3. Apply repository migrations to the Singapore project.
4. Verify RLS is enabled on exposed `public` tables.
5. Verify compatibility views and feature gate objects exist.
6. Verify functions, indexes, triggers, policies, and extensions.

## Data Migration Steps

1. Export schema and required data from Mumbai.
2. Copy tenants, branches, users, roles, devices, products, subscriptions, feature gates, settings, and active operational data.
3. Copy historical orders/payments only as needed for hot data.
4. Validate row counts by table.
5. Validate tenant_id and branch_id isolation.
6. Validate RLS policies.
7. Validate auth, device, login, shift, sales, payment, receipt, and report flows.

## Storage, Auth, And Functions

- Review Supabase Auth users and identity mapping before cutover.
- Review Storage buckets, policies, and object migration if used.
- Review Edge Functions, secrets, and schedules if any are added later.
- Do not expose service-role keys to browser code.

## Cutover Checklist

Prerequisite:

0. Upgrade/adjust Supabase plan or account permissions so a Singapore project can be created.

1. Set Vercel/GitHub env to Singapore primary values.
2. Set archive env to Mumbai values.
3. Keep `ENABLE_ARCHIVE_READS=false` initially.
4. Deploy preview.
5. Run smoke tests:
   - login
   - branch selection
   - device validation
   - open shift
   - create order
   - pay order
   - receipt preview
   - recent sales history
   - archive mode disabled by default
6. Promote to production only after evidence is attached.

## Rollback Plan

- Keep Mumbai POS-Preview project for at least 30-90 days.
- Keep application code capable of temporarily mapping legacy env names to the active primary DB.
- If cutover fails before production writes begin, revert env to Mumbai and redeploy.
- If cutover fails after production writes begin, stop writes first and reconcile data before rollback.

## Post-Migration Monitoring

- Monitor login failures, POS order failures, payment failures, and receipt failures.
- Monitor Supabase API/database errors.
- Monitor latency from Thailand users.
- Compare row counts and audit logs after cutover.
- Archive DB is not a replacement for proper backups or PITR.
