"use client";

import { useEffect, useMemo, useState } from "react";

type ApiResponse<T> = {
  data: {
    items: T[];
    pagination: {
      page: number;
      page_size: number;
      total: number;
      total_pages: number;
    };
  } | null;
  error: {
    code: string;
    message: string;
  } | null;
};

export function usePaginatedApi<T>(endpoint: string, query: Record<string, string | number | undefined>) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<T[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 10,
    total: 0,
    total_pages: 0
  });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === "") {
        return;
      }
      params.set(key, String(value));
    });
    return params.toString();
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`${endpoint}?${queryString}`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store"
    })
      .then(async (res) => {
        const body = (await res.json()) as ApiResponse<T>;
        if (!res.ok || body.error || !body.data) {
          throw new Error(body.error?.message ?? "Request failed");
        }
        setItems(body.data.items);
        setPagination(body.data.pagination);
      })
      .catch((fetchError) => {
        if (fetchError instanceof Error && fetchError.name === "AbortError") {
          return;
        }
        setItems([]);
        setError(fetchError instanceof Error ? fetchError.message : "Unknown error");
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [endpoint, queryString]);

  return {
    loading,
    error,
    items,
    pagination
  };
}
