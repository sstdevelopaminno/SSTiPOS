"use client";

import { FormEvent, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "@/components/backoffice/list-state";
import { PaginationControls } from "@/components/backoffice/pagination-controls";
import { usePaginatedApi } from "@/components/backoffice/use-paginated-api";

type IngredientRow = {
  id: string;
  name: string;
  base_unit: string;
  quantity_on_hand: number;
  reorder_level: number;
  updated_at: string;
};

type MovementRow = {
  id: string;
  ingredient_id: string;
  movement_type: string;
  quantity_delta: number;
  reason: string;
  created_at: string;
  ingredients?: { name?: string } | null;
};

export function StockModule() {
  const [view, setView] = useState<"ingredients" | "movements">("ingredients");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [movementType, setMovementType] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [adjustSuccess, setAdjustSuccess] = useState<string | null>(null);

  const endpointQuery: Record<string, string | number | undefined> = {
    view,
    page,
    page_size: 10,
    search: search || undefined
  };

  if (view === "ingredients") {
    endpointQuery.low_stock = lowStockOnly ? "true" : undefined;
  } else {
    endpointQuery.movement_type = movementType || undefined;
  }

  const { loading, error, items, pagination } = usePaginatedApi<IngredientRow | MovementRow>(
    "/api/backoffice/stock",
    endpointQuery
  );

  async function handleAdjustmentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAdjusting(true);
    setAdjustError(null);
    setAdjustSuccess(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      ingredient_id: String(form.get("ingredient_id") ?? ""),
      quantity_delta: Number(form.get("quantity_delta") ?? 0),
      reason: String(form.get("reason") ?? ""),
      approval_id: String(form.get("approval_id") ?? "")
    };

    try {
      const response = await fetch("/api/backoffice/stock/adjust", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-idempotency-key": `adj-${crypto.randomUUID()}`
        },
        body: JSON.stringify(payload)
      });
      const body = await response.json();
      if (!response.ok || body.error) {
        throw new Error(body.error?.message ?? "Stock adjustment failed.");
      }
      setAdjustSuccess(`Adjustment recorded: ${body.data.id}`);
      setPage(1);
    } catch (submitError) {
      setAdjustError(submitError instanceof Error ? submitError.message : "Unknown error");
    } finally {
      setAdjusting(false);
    }
  }

  return (
    <section className="surface">
      <h2>Ingredients & Stock</h2>
      <p style={{ color: "var(--muted)" }}>Real API integration with stock list and movement history.</p>

      <div className="grid cols-4" style={{ marginBottom: 12 }}>
        <select
          value={view}
          onChange={(event) => {
            setPage(1);
            setView(event.target.value as "ingredients" | "movements");
          }}
          style={{ minHeight: 42 }}
        >
          <option value="ingredients">Ingredients</option>
          <option value="movements">Stock Movements</option>
        </select>
        <input
          placeholder={view === "ingredients" ? "Search ingredient name" : "Search reason"}
          value={search}
          onChange={(event) => {
            setPage(1);
            setSearch(event.target.value);
          }}
          style={{ minHeight: 42, padding: "8px 10px" }}
        />
        {view === "ingredients" ? (
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(event) => {
                setPage(1);
                setLowStockOnly(event.target.checked);
              }}
            />
            Low Stock Only
          </label>
        ) : (
          <select
            value={movementType}
            onChange={(event) => {
              setPage(1);
              setMovementType(event.target.value);
            }}
            style={{ minHeight: 42 }}
          >
            <option value="">All Movements</option>
            <option value="sale_deduction">sale_deduction</option>
            <option value="manual_adjustment">manual_adjustment</option>
            <option value="purchase">purchase</option>
            <option value="waste">waste</option>
          </select>
        )}
      </div>

      {loading ? <LoadingState label="Loading stock data..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}
      {!loading && !error && items.length === 0 ? <EmptyState label="No stock records found for current filters." /> : null}

      {!loading && !error && items.length > 0 ? (
        <>
          <div style={{ overflowX: "auto" }}>
            {view === "ingredients" ? (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", borderBottom: "1px solid var(--border)", padding: 8 }}>Ingredient</th>
                    <th style={{ textAlign: "left", borderBottom: "1px solid var(--border)", padding: 8 }}>Unit</th>
                    <th style={{ textAlign: "right", borderBottom: "1px solid var(--border)", padding: 8 }}>On Hand</th>
                    <th style={{ textAlign: "right", borderBottom: "1px solid var(--border)", padding: 8 }}>Reorder Level</th>
                    <th style={{ textAlign: "left", borderBottom: "1px solid var(--border)", padding: 8 }}>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {(items as IngredientRow[]).map((item) => (
                    <tr key={item.id}>
                      <td style={{ borderBottom: "1px solid var(--border)", padding: 8 }}>{item.name}</td>
                      <td style={{ borderBottom: "1px solid var(--border)", padding: 8 }}>{item.base_unit}</td>
                      <td style={{ borderBottom: "1px solid var(--border)", padding: 8, textAlign: "right" }}>
                        {Number(item.quantity_on_hand).toFixed(3)}
                      </td>
                      <td style={{ borderBottom: "1px solid var(--border)", padding: 8, textAlign: "right" }}>
                        {Number(item.reorder_level).toFixed(3)}
                      </td>
                      <td style={{ borderBottom: "1px solid var(--border)", padding: 8 }}>
                        {new Date(item.updated_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", borderBottom: "1px solid var(--border)", padding: 8 }}>Ingredient</th>
                    <th style={{ textAlign: "left", borderBottom: "1px solid var(--border)", padding: 8 }}>Type</th>
                    <th style={{ textAlign: "right", borderBottom: "1px solid var(--border)", padding: 8 }}>Delta</th>
                    <th style={{ textAlign: "left", borderBottom: "1px solid var(--border)", padding: 8 }}>Reason</th>
                    <th style={{ textAlign: "left", borderBottom: "1px solid var(--border)", padding: 8 }}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(items as MovementRow[]).map((item) => (
                    <tr key={item.id}>
                      <td style={{ borderBottom: "1px solid var(--border)", padding: 8 }}>{item.ingredients?.name ?? item.ingredient_id}</td>
                      <td style={{ borderBottom: "1px solid var(--border)", padding: 8 }}>{item.movement_type}</td>
                      <td style={{ borderBottom: "1px solid var(--border)", padding: 8, textAlign: "right" }}>
                        {Number(item.quantity_delta).toFixed(3)}
                      </td>
                      <td style={{ borderBottom: "1px solid var(--border)", padding: 8 }}>{item.reason}</td>
                      <td style={{ borderBottom: "1px solid var(--border)", padding: 8 }}>
                        {new Date(item.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div style={{ marginTop: 10 }}>
            <PaginationControls page={pagination.page} totalPages={pagination.total_pages} onPageChange={setPage} />
          </div>
        </>
      ) : null}

      <hr style={{ margin: "18px 0", borderColor: "var(--border)" }} />
      <h3 style={{ marginTop: 0 }}>Manual Stock Adjustment</h3>
      <form className="grid cols-4" onSubmit={handleAdjustmentSubmit}>
        <input required name="ingredient_id" placeholder="ingredient_id (uuid)" style={{ minHeight: 42, padding: "8px 10px" }} />
        <input required name="quantity_delta" type="number" step="0.001" placeholder="quantity_delta (e.g. -2 or 5)" style={{ minHeight: 42, padding: "8px 10px" }} />
        <input required name="reason" placeholder="reason" style={{ minHeight: 42, padding: "8px 10px" }} />
        <input required name="approval_id" placeholder="approval_id (manager/owner PIN)" style={{ minHeight: 42, padding: "8px 10px" }} />
        <button type="submit" disabled={adjusting} style={{ minHeight: 42 }}>
          {adjusting ? "Submitting..." : "Submit Adjustment"}
        </button>
      </form>
      {adjustError ? <p style={{ color: "#b42318" }}>{adjustError}</p> : null}
      {adjustSuccess ? <p style={{ color: "#067647" }}>{adjustSuccess}</p> : null}
    </section>
  );
}
