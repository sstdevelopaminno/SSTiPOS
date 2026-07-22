# POS Catalog Trash And Modifier Checkpoint - 2026-07-22

## Purpose

This document records the next required design for product catalog cleanup, trash retention, and POS ingredient modifiers. Read this before changing stock product deletion, ingredient recipe links, POS cart item shape, receipts, shift close totals, or sales summary reports.

## UI Layout Fix

- The stock page already has an outer page card.
- `StockProductsTable` must not add another full card container around the entire product list.
- Keep only the real table border and modal/popup frames.
- This prevents the stock list from looking like nested containers and saves vertical space.

## Trash Requirement

Product deletion must become soft delete before adding "delete all" at scale.

Required behavior:

- Delete/deactivate actions should move products to a trash state, not immediately hard-delete rows.
- Trash must stay tenant-scoped and branch-scoped.
- Add a compact settings submenu named "รายการขยะ".
- Trash retention must come from package/backoffice policy, such as 7, 15, or 30 days.
- After retention expires, a server-side cleanup job can hard-delete eligible rows if safe.

Do not hard-delete products that have sales/order history. Sales, receipts, shift close, and accounting reports must remain auditable.

Recommended schema direction:

- `products.deleted_at`
- `products.deleted_by`
- `products.delete_reason`
- `products.restore_until`
- optional `products.is_active = false` while in trash

Current list APIs should exclude trashed products by default and expose a separate trash view for restore/permanent cleanup.

## Bulk Unlink Ingredient Recipe

The search/filter popup can add a checkbox/action for "ยกเลิกผูกวัตถุดิบทั้งหมด", but the save must call a dedicated server action.

Rules:

- Never let the browser directly rewrite recipe rows for multiple products.
- Server must re-check tenant, branch, role, and selected product IDs.
- For each product, remove real ingredient recipe rows and convert it back to unit/product stock mode using the `STOCK:` fallback bridge.
- Preserve product price/category/status.
- Return counts: updated, skipped, failed.

This action should open a confirmation popup before saving because it can change stock deduction behavior.

## POS Modifier Requirement

Products with ingredient recipes may need selectable options before adding to cart:

- noodles: noodle type, extra meatballs, remove/change ingredient
- coffee: extra milk, less milk, no milk

Implementation must follow `docs/POS-MENU-MODIFIERS-INGREDIENTS-PLAN-2026-07-22.md`.

Important constraints:

- Product without modifiers adds directly.
- Product with active modifier groups opens a POS popup in takeaway and dine-in modes.
- Delivery mode must not allow extra-priced ingredient add-ons unless explicitly enabled later.
- Same product with different options must become separate cart lines.
- Receipt and kitchen tickets must show selected options.
- Server must recalculate option price and ingredient deltas; never trust client totals.
- Shift close, sales summary, stock movements, and future accounting export must use server-calculated order totals.

## Verification Needed Before Release

- Stock product page has no double container.
- Bulk unlink recipe action changes products back to fallback `STOCK:` mode and keeps sales history.
- Trash view can restore products inside retention period.
- POS modifier product opens popup and blocks required choices.
- Two customized lines of the same product remain separate in cart, receipt, and order history.
- Option price affects totals in takeaway/dine-in only.
- Delivery mode blocks extra-priced options.
- Stock deduction includes base recipe plus modifier ingredient deltas.
- Shift close totals match paid order totals after modifiers.
