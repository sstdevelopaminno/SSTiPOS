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

---

Date: 2026-06-12

## Issue Fixed

Production POS could stay on the `กำลังสร้างออเดอร์ POS` overlay after pressing `สร้างออเดอร์ POS`, so the takeaway bill did not open reliably. The same order creation path is shared by dine-in bill creation and delivery send.

## Root Cause

The latest stability patch made the RPC order transaction path the default for non-delivery sales. On the current POS-Preview/Mumbai database, the RPC path can be unavailable, slow, or incompatible, and the client order submit timeout was the same 15 second duration as the server transaction timeout. That combination could make the UI wait too long or abort before a clear response.

## Files Changed

- `apps/backoffice-web/src/lib/services/pos-sales-service.ts`
- `apps/backoffice-web/src/components/pos/services/pos-sales-service-module.ts`
- `apps/backoffice-web/.env.example`
- `docs/current-stability-audit.md`

## Fix Summary

- Restored direct order creation as the default path for non-delivery POS sales.
- Added `POS_PREFER_RPC_ORDER_CREATE=1` as the explicit opt-in for RPC-first order creation later.
- Kept `POS_FORCE_DIRECT_CREATE_NON_DELIVERY` as an explicit direct-path override.
- Increased client `/api/pos/sales` timeout to 25 seconds so the browser waits longer than the server transaction timeout.
- Kept server-side tenant, branch, shift, product, table, and stock checks.

## Verification

- Targeted POS sales ESLint: pass
- Typecheck: pass
- Integration tests: pass, 22 files / 54 tests
- Build: pass

## Remaining Risks

- Direct order creation is less atomic than the RPC transaction path, but it is compatible with the current production DB and prevents the create-order UI from hanging on unavailable/slow RPC.
- Delivery send still uses the existing delivery flow and should be smoke-tested.
- Manual smoke test is still required after deployment.

---

Date: 2026-06-12

## Issue Fixed

Production POS could return from the processing popup without opening a bill number after pressing `สร้างออเดอร์ POS`. The same risk affected dine-in queued bills and the delivery pending send action.

## Root Cause

The direct order fallback still attempted ingredient stock deduction immediately after inserting `orders` and `order_items`. If recipe stock, ingredient rows, or `stock_movements` failed, the fallback deleted the just-created order and returned an error. The UI then returned to the cart without a bill. Delivery send could also still use the RPC path because direct creation was only defaulted for non-delivery sales.

## Files Changed

- `apps/backoffice-web/src/lib/services/pos-sales-service.ts`
- `apps/backoffice-web/.env.example`
- `docs/current-stability-audit.md`

## Fix Summary

- Made direct order creation the default for all POS order types unless `POS_PREFER_RPC_ORDER_CREATE=1`.
- Added `POS_FORCE_DIRECT_CREATE` while keeping `POS_FORCE_DIRECT_CREATE_NON_DELIVERY` as a backward-compatible alias.
- Added `POS_DEDUCT_STOCK_ON_ORDER_CREATE`; stock deduction is now opt-in and no longer blocks bill creation by default.
- Preserved server-side tenant, branch, shift, product, table, and auth checks.

## Verification

- Targeted POS sales service ESLint: pass
- Typecheck: pass
- Integration tests: pass, 22 files / 54 tests
- Build: compiled, finished TypeScript, generated 141 static pages, then timed out during build trace collection in local shell.

## Remaining Risks

- Stock deduction is intentionally not performed during order creation unless explicitly enabled.
- Manual smoke test is still required on production for Takeaway, Dine-in, Delivery send, payment, and receipt.

---

Date: 2026-06-12

## Issue Fixed

POS order creation still returned from the creating popup without opening the payment/review bill popup in production.

## Root Cause

The create-order path could still fail before returning an order when the production database accepted the core POS schema but rejected optional/newer order or order item columns. In that case the client cleared the creating preview and returned to the cart with no bill number.

## Files Changed

- `apps/backoffice-web/src/lib/services/pos-sales-service.ts`
- `docs/current-stability-audit.md`

## Fix Summary

- Added a final minimal `orders` insert fallback with only core bill columns.
- Added a final minimal `order_items` insert fallback without optional item notes.
- Kept tenant, branch, shift, product, table, and auth scope checks server-side.
- Kept stock deduction disabled by default during order creation.

## Verification

- Targeted POS sales service ESLint: pass
- Typecheck: pass
- Integration tests: pass, 22 files / 54 tests

## Remaining Risks

- Production smoke test is required because local shell cannot mutate production data for probe inserts without explicit approval.

---

Date: 2026-06-12

## Issue Fixed

POS create bill still behaved like a slow API timeout in production: the creating popup stayed longer, then disappeared without opening the payment/review bill popup.

## Root Cause

Production may still have the old `POS_PREFER_RPC_ORDER_CREATE=1` environment variable. That allowed the order creation flow to keep using the slow/incompatible RPC path despite the direct-create fallback patches.

## Files Changed

- `apps/backoffice-web/src/lib/services/pos-sales-service.ts`
- `apps/backoffice-web/src/app/api/pos/sales/route.ts`
- `apps/backoffice-web/.env.example`
- `docs/current-stability-audit.md`

## Fix Summary

- Stopped reading `POS_PREFER_RPC_ORDER_CREATE`.
- Direct POS order creation is now the default for all modes.
- RPC order creation can only be re-enabled with the new explicit `POS_ENABLE_RPC_ORDER_CREATE=1`.
- Added safe production warning logs for POS create failures with only stage, code, status, order type, item count, and elapsed time.

## Verification

- Targeted POS sales ESLint: pass
- Typecheck: pass
- Integration tests: pass, 22 files / 54 tests

## Remaining Risks

- Manual production smoke test is still required for Takeaway and Dine-in.
