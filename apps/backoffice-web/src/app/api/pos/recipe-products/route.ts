import { getPosApiAuthContext } from "@/lib/pos-api-auth";
import { fail, ok } from "@/lib/http";
import { getSupabaseServiceClient } from "@/lib/supabase-admin";

type PostgrestLikeError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

function isMissingRecipesSchemaError(error: PostgrestLikeError | null | undefined): boolean {
  if (!error) return false;
  const code = String(error.code ?? "");
  const text = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
  if (code === "42P01" || code === "PGRST205") return true;
  return text.includes("recipes");
}

function normalizeProductId(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

export async function GET(req: Request) {
  try {
    const auth = await getPosApiAuthContext({ requireBranchScope: true, requiredPermission: "sales:enter" });
    const supabase = getSupabaseServiceClient();
    const url = new URL(req.url);
    const rawProductIds = String(url.searchParams.get("product_ids") ?? "");
    const productIds = Array.from(
      new Set(
        rawProductIds
          .split(",")
          .map((entry) => normalizeProductId(entry))
          .filter(Boolean)
      )
    ).slice(0, 250);

    if (productIds.length === 0) {
      return ok({ product_ids: [] as string[], ingredients_by_product: {} });
    }

    const { data, error } = await supabase
      .from("recipes")
      .select("product_id,ingredient_id,quantity_per_item,ingredients(name,base_unit,quantity_on_hand)")
      .eq("tenant_id", auth.tenantId!)
      .eq("branch_id", auth.branchId!)
      .in("product_id", productIds);

    if (error) {
      if (isMissingRecipesSchemaError(error)) {
        return ok({ product_ids: [] as string[], ingredients_by_product: {} });
      }
      return fail("recipe_products_query_failed", error.message, 500);
    }

    const recipeProductIds = Array.from(
      new Set(
        (data ?? [])
          .map((row) => normalizeProductId(String(row.product_id ?? "")))
          .filter(Boolean)
      )
    );
    const ingredientsByProduct: Record<string, Array<{ ingredient_id: string; name: string; base_unit: string; quantity_per_item: number; quantity_on_hand: number }>> = {};
    for (const row of data ?? []) {
      const productId = normalizeProductId(String(row.product_id ?? ""));
      const ingredientId = normalizeProductId(String(row.ingredient_id ?? ""));
      if (!productId || !ingredientId) continue;
      const ingredient = Array.isArray(row.ingredients) ? row.ingredients[0] : row.ingredients;
      const name = String(ingredient?.name ?? "").trim();
      if (!name || name.startsWith("STOCK:")) continue;
      ingredientsByProduct[productId] ??= [];
      ingredientsByProduct[productId].push({
        ingredient_id: ingredientId,
        name,
        base_unit: String(ingredient?.base_unit ?? ""),
        quantity_per_item: Number(row.quantity_per_item ?? 0),
        quantity_on_hand: Number(ingredient?.quantity_on_hand ?? 0)
      });
    }

    return ok({
      product_ids: recipeProductIds,
      ingredients_by_product: ingredientsByProduct
    });
  } catch (error) {
    return fail("pos_recipe_products_failed", error instanceof Error ? error.message : "Unknown error", 400);
  }
}
