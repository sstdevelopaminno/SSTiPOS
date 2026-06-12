# AI Handoff: IT Backoffice Next Pass

Date: 2026-06-12
Primary next focus: IT backoffice/admin system.
Secondary focus: keep POS sales stable; only fix blocking POS bugs unless the user explicitly asks for more POS polish.

## Current Repo State

- Branch: `fix/pos-sales-cart-checkout`
- Latest committed work:
  - `bfd411c` - POS checkout popup recovery and order response hardening
  - `a14e59e` - checkout error modal action fix
  - `ce7d565` - bank-transfer payment modal sizing polish
- Production alias: `https://sstipos-ten.vercel.app`
- Latest inspected deployment from this pass: `dpl_DQJ4U9EiSnWt3SnfwPaWk3mNRdcj`
- Vercel status after deploy: Ready

## What Was Fixed In POS

- Takeaway checkout now keeps the creating-order popup visible on submit failure and shows the localized error.
- Close/retry actions in that popup are clickable and reset the checkout request lock before closing or resubmitting.
- POS order creation replay responses now include bill identity, total, tax total, tax lines, and status for the next review/payment step.
- Payment summary subtotal now uses the real cart subtotal instead of the discount value.
- Bank-transfer modal was resized so the QR, tax line, and confirm button fit better in the viewport.
- Production demo tenant `NDL-TH-001 / NDL-ONNUT-01` had no active subscription contract, causing `core_pos_sales` to fail. An active Starter contract was added and the feature check was verified true.

## Verification Completed

Commands that passed after the checkout/modal action fixes:

```bash
pnpm --filter backoffice-web typecheck
pnpm --filter backoffice-web lint
pnpm --filter backoffice-web test -- --cache false
```

The test suite passed with 23 files and 55 tests.

For the final CSS-only bank-transfer sizing pass:

```bash
pnpm --filter backoffice-web typecheck
pnpm --filter backoffice-web lint
```

Vercel production build also passed during deploy.

## Important POS Notes For Future Work

- Do not remove `pointer-events: auto` from `.posui-payment-modal--creating`; close/retry buttons depend on it.
- If POS sales returns `feature_not_enabled`, first check `tenant_subscription_contracts`, then `subscription_package_features`, then tenant/branch overrides.
- Demo/prod-like tenants should have an active or trial contract before POS sales QA.
- The bank-transfer QR modal intentionally uses compact sizing. Avoid increasing QR or numeric tax styles without checking tablet viewport fit.

## Recommended IT Backoffice Starting Points

Read these first in the next chat:

- `README.md`
- `docs/PROJECT-AUDIT-HANDOFF-2026-06-02.md`
- `docs/pos-multi-owner-branch-architecture.md`
- `docs/production-readiness-checklist.md`
- `apps/backoffice-web/src/app/(it-admin)/`
- `apps/backoffice-web/src/components/it-admin/`
- `apps/backoffice-web/src/app/api/it-admin/`
- `apps/backoffice-web/src/lib/it-admin-guard.ts`
- `apps/backoffice-web/src/lib/feature-gate.ts`
- `apps/backoffice-web/src/lib/services/subscription-package-service.ts`

## Suggested IT Backoffice Work Order

1. Audit current IT admin pages for tenant, branch, device, users, packages, contracts, feature flags, sessions, shifts, and audit logs.
2. Tighten UX around package/contract setup so new tenants cannot reach POS sales without a valid contract or clear admin warning.
3. Add admin-facing visibility for effective feature state per tenant/branch, especially `core_pos_sales`.
4. Add safe actions for enabling/disabling tenant or branch features with audit logs.
5. Add or refresh integration tests around contract and feature gate behavior.
6. Only then return to POS sales detail polish.

## Guardrails

- Never trust client-sent tenant, branch, device, role, or feature state.
- Keep service-role Supabase usage server-only.
- Preserve audit logging for IT admin mutations.
- Be careful with production data. Prefer code-backed admin flows or explicit SQL with narrow tenant/branch scope.
- Do not follow archived QR-login docs as active runtime guidance.
