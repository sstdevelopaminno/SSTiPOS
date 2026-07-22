# POS Catalog And Stock Checkpoint - 2026-07-22

## Why This Exists

This checkpoint records the fix for product stock setup popups after the UI showed:

```text
Cross-branch access is not allowed.
```

Future AI/dev work must read this before changing POS product creation, product edit popup, stock setup, recipes, or ingredient deduction.

## Current Fix

- POS add product popups must not send `branch_id` to `/api/backoffice/catalog` for normal POS work.
- POS edit product popups must send the currently viewed stock/catalog `branch_id` when loading recipes and saving existing products. Existing products are branch-owned rows; omitting the viewed branch can make the API use the session branch and return `Product not found in this branch`.
- The catalog API must use the authenticated session branch as the source of truth.
- Passing a stale client `branch_id` can make the API reject a valid save as cross-branch access.
- POST `forbidden_branch_scope` now returns a Thai user-facing message.
- `product_categories` is an optional category registry for UI/category lists. If that registry has a missing table or FK mismatch, product saves must continue because `products.category` remains the authoritative category value for the product row.
- Editing an existing product must resolve the product's real `branch_id` from `products.id` inside the current tenant. Use that product branch for price rows, recipes, fallback `STOCK:` ingredients, and final product reads. Do not rely only on the current session branch because some catalog screens can open products from another managed branch.

## Duplicate Product Rule

When adding a product through `create_product_with_stock_setup`:

- If an active product with the same exact `name` already exists in the same `tenant_id` and `branch_id`, reuse that product.
- Do not create a new product just because the generated SKU would be different.
- Update the existing product price/category/recipe/stock setup instead.
- API response includes `reused_existing_product: true` when this happens.

This prevents repeated product entry from creating duplicate menu items.

## Stock Modes Confirmed

The current system supports both stock styles:

- Ingredient recipe mode:
  - Product is linked to real `ingredients` through `recipes`.
  - Sale deduction uses the recipe quantities.
- Unit/product stock mode:
  - Product stock is bridged into a hidden fallback ingredient named `STOCK:<sku>:<name>`.
  - The product gets one recipe line with `quantity_per_item = 1`.
  - Sale deduction still goes through ingredient deduction, so one engine handles both styles.
- Branches that do not have real ingredient recipes can leave "ingredient recipe mode" unchecked and save. The API will create/update the fallback `STOCK:` ingredient in the product's real branch.

Do not remove the `STOCK:` fallback bridge unless the whole stock engine is redesigned.

## Sale Deduction Timing

- RPC order creation paths may deduct stock during order creation.
- Direct fallback order creation can create queued order rows first.
- Payment completion calls `deductIngredientStockForPaidOrderFallback`.
- That fallback checks existing `stock_movements` for the order before deducting, so it does not double-deduct if stock was already moved.

## Files Changed In This Checkpoint

- `apps/backoffice-web/src/components/pos-preview/add-product-popup-button.tsx`
- `apps/backoffice-web/src/components/pos-preview/edit-product-popup-button.tsx`
- `apps/backoffice-web/src/app/api/backoffice/catalog/route.ts`

## Verification

Validated on 2026-07-22:

```powershell
$env:Path = 'C:\Program Files\nodejs;' + $env:Path
& 'C:\Program Files\nodejs\node.exe' .\node_modules\typescript\bin\tsc -p tsconfig.json --noEmit --incremental false
& 'C:\Program Files\nodejs\node.exe' .\node_modules\eslint\bin\eslint.js src\app\api\backoffice\catalog\route.ts src\components\pos-preview\add-product-popup-button.tsx src\components\pos-preview\edit-product-popup-button.tsx --no-cache
```

Both passed.
