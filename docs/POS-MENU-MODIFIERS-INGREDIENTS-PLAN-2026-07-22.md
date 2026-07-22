# POS Menu Modifiers And Ingredient Options Plan - 2026-07-22

## User Goal

POS products such as noodles, coffee, drinks, and food must support selectable options before adding to cart.

Examples:

- Noodle menu:
  - choose noodle type
  - add meatballs
  - add/remove/change ingredients
- Iced cappuccino:
  - extra milk
  - less milk
  - no milk
  - other ingredient-linked options

Selected options must:

- appear in the cart and receipt,
- be saved with the order item,
- affect price when configured,
- affect ingredient stock deduction when configured.

## Existing System Findings

- Active guidance starts at `docs/ACTIVE-DOCS-INDEX.md`.
- POS sales flow is API-first per `docs/POS-SALES-FLOW.md`.
- Stock architecture expects recipe deduction and stock movements per `docs/STOCK-ENGINE-ARCHITECTURE.md`.
- Existing core schema has:
  - `products`
  - `ingredients`
  - `recipes`
  - `orders`
  - `order_items`
  - `stock_movements`
- Current `recipes` model supports base recipe per product, but not selectable product options.
- Current POS cart item shape uses only:
  - `product_id`
  - `name`
  - `quantity`
  - `price`
- Current submit payload item shape uses only:
  - `product_id`
  - `quantity`
  - `unit_price`
  - optional `notes` in API route/service
- Current cart keying uses `product_id`, so the same product with different options would incorrectly merge into one line unless a new cart line key is added.
- `order_items` in old migrations did not start with `metadata`, but later migrations and mobile flows reference `order_items.metadata`; verify current DB before relying on it.
- `apps/backoffice-web/src/lib/services/pos-sales-service.ts` currently prefers direct create fallback in normal runtime. Before adding modifier stock deduction, confirm the direct create path deducts recipe stock correctly or extend it in the same change.
- 2026-07-22 checkpoint: read `docs/POS-CATALOG-STOCK-CHECKPOINT-2026-07-22.md` before implementation. Current stock supports both real ingredient recipes and `STOCK:` fallback ingredient bridges for unit/product stock. Direct create fallback may defer deduction until payment completion, where duplicate movement checks prevent double deduction.

## Required Data Model

Use separate option tables instead of encoding everything in free-text notes.

Recommended tables:

- `product_modifier_groups`
  - `id`
  - `tenant_id`
  - `branch_id`
  - `product_id`
  - `name`
  - `selection_type`: `single` or `multiple`
  - `is_required`
  - `min_select`
  - `max_select`
  - `sort_order`
  - `is_active`

- `product_modifier_options`
  - `id`
  - `tenant_id`
  - `branch_id`
  - `group_id`
  - `name`
  - `price_delta`
  - `is_default`
  - `sort_order`
  - `is_active`

- `product_modifier_option_ingredients`
  - `id`
  - `tenant_id`
  - `branch_id`
  - `option_id`
  - `ingredient_id`
  - `quantity_delta_per_item`
  - Positive value means add ingredient usage.
  - Negative value means reduce ingredient usage.

Recommended order persistence:

- Keep selected option snapshot in `order_items.metadata`.
- Add item snapshot like:

```json
{
  "modifiers": [
    {
      "group_id": "...",
      "group_name": "เส้น",
      "option_id": "...",
      "option_name": "เส้นเล็ก",
      "price_delta": 0,
      "ingredient_deltas": [
        {
          "ingredient_id": "...",
          "ingredient_name": "เส้นเล็ก",
          "quantity_delta_per_item": 120
        }
      ]
    }
  ],
  "display_notes": "เส้นเล็ก, เพิ่มลูกชิ้น"
}
```

## Required Runtime Changes

### POS Sales Snapshot

`GET /api/pos/sales` should return modifier groups/options for active products.

Product row should include:

```ts
modifier_groups?: Array<{
  id: string;
  name: string;
  selection_type: "single" | "multiple";
  is_required: boolean;
  min_select: number;
  max_select: number;
  options: Array<{
    id: string;
    name: string;
    price_delta: number;
    is_default: boolean;
  }>;
}>;
```

### POS UI

- When a product has active modifier groups, clicking product opens a modal.
- Modal must support:
  - radio buttons for single choice,
  - checkboxes for multiple choice,
  - required validation,
  - quantity stepper,
  - price preview.
- Products without options should still add directly.
- Cart items must use `cart_line_id`, not `product_id`, so the same product can appear as separate customized lines.
- Cart and receipt must show modifier display lines below product name.

### Order Submit API

Submit payload item should include:

```ts
{
  product_id: string;
  quantity: number;
  unit_price: number;
  notes?: string | null;
  modifiers?: Array<{
    group_id: string;
    option_id: string;
  }>;
}
```

Server must re-load modifier options from DB and re-calculate:

- option validity,
- required selections,
- price delta,
- ingredient deltas.

Do not trust client-sent price or ingredient quantities.

### Stock Deduction

Final deduction per order item:

```text
base recipe quantity
+ selected option ingredient deltas
```

Then multiply by item quantity.

This must run in the same order creation transaction or in a guarded all-or-nothing fallback that deletes the order if stock deduction fails.

## Implementation Phases

### Phase 1: Schema And Read API

- Add modifier tables and RLS policies.
- Add indexes by tenant/branch/product/group.
- Extend `GET /api/pos/sales` to include active modifier groups.
- Seed/demo examples:
  - noodle products with noodle type choices,
  - cappuccino with milk options.

2026-07-22 implementation start:

- Added migration `supabase/migrations/202607220002_product_modifiers.sql`.
- Added tables `product_modifier_groups`, `product_modifier_options`, and `product_modifier_option_ingredients` with tenant/branch indexes and RLS isolation.
- `/api/pos/recipe-products` now returns `modifier_groups_by_product` when modifier tables exist, while still returning linked recipe ingredients for the current popup fallback.

### Phase 2: POS UI Modal And Cart

- Add product modifier modal.
- Add `cart_line_id`.
- Show selected options in cart.
- Update localStorage cart version.
- Keep products without modifiers unchanged.

2026-07-22 implementation start:

- Products returned by POS sales with `has_recipe_deduction` now open a modifier popup before adding to cart.
- The popup loads linked recipe ingredients lazily from `/api/pos/recipe-products` and shows them as selectable chips.
- The popup also supports free-form option/ingredient notes, quantity steppers, and extra ingredient price steppers.
- Extra price is disabled in delivery mode.
- Cart lines now support `cart_line_id` and `notes`, so the same product with different options can remain separate.
- This is the safe UI/cart foundation. Structured modifier tables and ingredient delta deduction still belong to Phase 1/3/4 before full stock-accurate option deduction.

### Phase 3: Order Submit And Receipt

- Extend payload types.
- Save modifier snapshot to `order_items.metadata`.
- Show options in receipt and order review.
- Ensure pending/offline queue keeps modifiers.

### Phase 4: Stock Deduction

- Extend direct create path and RPC path to deduct base recipe plus option ingredient deltas.
- Add insufficient stock validation for option ingredients.
- Write stock movements with enough metadata to audit which option consumed stock.

## Do Not Implement As Free Text Only

Do not solve this by writing `เส้นเล็ก, เพิ่มลูกชิ้น` only in `notes`.

Free text can be displayed, but stock deduction and reporting require structured option IDs and ingredient mappings.

## Verification Checklist

- Product without options adds directly.
- Product with required option opens modal and blocks add until selected.
- Same product with different options becomes separate cart lines.
- Receipt prints selected options under product name.
- Order item stores selected option snapshot.
- Stock deduction includes option ingredient deltas.
- Insufficient option ingredient stock blocks order creation with a clear message.
- Warm POS page remains responsive; do not reintroduce dev prewarming or stale service worker caching.
