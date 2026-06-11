# Current Stability Audit

Date: 2026-06-11

## Documents Read

- `context.md`
- `README.md`
- `docs/final-implementation-audit.md`
- `docs/pos-multi-owner-branch-architecture.md`
- `docs/pos-login-context-handoff.md`
- `docs/manual-qa-checklist.md`
- `docs/production-readiness-checklist.md`
- `docs/monitoring-alerting-runbook.md`
- `docs/go-live-evidence-checklist.md`

## Issue Fixed

POS order creation could use the direct JavaScript fallback path for non-delivery orders by default, and insufficient-stock failures could be soft-bypassed by default.

## Root Cause

`POS_FORCE_DIRECT_CREATE_NON_DELIVERY` and `POS_SOFT_BYPASS_INSUFFICIENT_STOCK` treated an unset environment variable as enabled. That made the safer transactional RPC path non-default for normal POS sales and allowed stock deduction failures to be bypassed unless explicitly disabled.

## Files Changed

- `apps/backoffice-web/src/lib/services/pos-sales-service.ts`
- `docs/codex-token-saving-workflow.md`
- `docs/current-stability-audit.md`
- `context.md`

## Fix Summary

- Changed default order creation behavior so non-delivery orders use the RPC transaction path unless `POS_FORCE_DIRECT_CREATE_NON_DELIVERY=1`.
- Changed default stock behavior so insufficient-stock errors fail the order instead of bypassing deduction unless `POS_SOFT_BYPASS_INSUFFICIENT_STOCK=1`.
- Kept tenant and branch scope server-resolved through the existing POS session and auth context.
- Did not change database schema.
- Did not edit unrelated UI.

## Verification

- `npm run typecheck`: blocked because `npm` is not available in the current shell PATH.
- `corepack pnpm --filter backoffice-web typecheck`: blocked because `corepack` is not available in the current shell PATH.
- `C:\Windows\System32\cmd.exe /c node --version`: blocked because `node` is not available in the current process PATH.
- `npm run lint`: blocked by the same missing `npm`/`node` environment issue.

## Remaining Risks

- Typecheck and lint must be re-run in an environment where Node/npm/corepack are available.
- Core POS order, payment, and receipt flows still need manual QA after verification is unblocked.
- If production intentionally needs direct fallback or stock bypass, those env vars must be set explicitly and tracked as operational exceptions.
- Current status: Improved, but not yet 100% production complete.

## Next Recommended Task

Restore Node/npm/corepack availability in the Codex shell, then run `npm run typecheck` and `npm run lint`. If they pass, run a focused POS manual test: login, device select, shift open, create order, payment, receipt, and stock movement check.

---

Date: 2026-06-12

## Issue Checked

Pre-deploy POS sales stability check for slow UI, stuck processing, unresponsive buttons, cart/order/payment/receipt regressions, and unsafe Supabase/env handling.

## Root Cause Found

No new blocking code-level regression was found in the focused POS sales static audit. The prior suspected cart issue had already been addressed by normalizing product add-to-cart behavior and adding touch/pen pointer support on product cards.

## Files Reviewed

- `apps/backoffice-web/src/components/pos/pos-sales-module.tsx`
- `apps/backoffice-web/src/components/pos/pos-product-catalog.tsx`
- `apps/backoffice-web/src/components/pos-ui/pos-product-card.tsx`
- `apps/backoffice-web/src/components/pos/services/pos-sales-service-module.ts`
- `apps/backoffice-web/src/app/api/pos/sales/route.ts`
- `apps/backoffice-web/src/app/api/pos/payments/route.ts`
- `apps/backoffice-web/src/app/api/pos/orders/route.ts`
- `apps/backoffice-web/src/app/api/pos/receipts/route.ts`
- `apps/backoffice-web/src/lib/services/pos-sales-service.ts`

## Verification Commands

- `pnpm --filter backoffice-web exec eslint src/components/pos/pos-sales-module.tsx src/components/pos/pos-product-catalog.tsx src/components/pos-ui/pos-product-card.tsx src/components/pos/services/pos-sales-service-module.ts src/app/api/pos/sales/route.ts src/app/api/pos/payments/route.ts src/app/api/pos/orders/route.ts src/app/api/pos/receipts/route.ts src/lib/services/pos-sales-service.ts --no-cache`
- `pnpm --filter backoffice-web exec tsc -p tsconfig.json --noEmit --pretty false`
- `pnpm --filter backoffice-web test`
- `pnpm --filter backoffice-web build`
- `pnpm --filter backoffice-web lint`

## Result

- Targeted POS sales ESLint: pass
- Typecheck: pass
- Integration tests: pass, 22 files / 54 tests
- Build: pass
- Full lint: pass
- Secret check: `.env.local` is ignored; no real Supabase service key found in non-ignored scanned files.

## Remaining Risks

- Manual browser QA was not completed in this run.
- Must still verify on a real/dev session: login, branch selection, device selection, shift open, add product to cart, create order, payment, receipt preview, and sales history.
- Supabase Singapore primary project is not created yet; current DB remains POS-Preview/Mumbai as configured primary.
- Current status: Improved, but not yet 100% production complete.

## Next Recommended Task

Before GitHub/Vercel deploy, run one manual POS smoke test on `/preview/pos` using the current Supabase DB, then commit and deploy if the order/payment/receipt flow passes.
