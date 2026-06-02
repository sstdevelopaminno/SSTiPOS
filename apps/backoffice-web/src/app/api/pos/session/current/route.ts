import { NextResponse } from "next/server";
import {
  PosGuardError,
  requirePosSession,
  withPosSessionCookie
} from "@/lib/pos-session-guard";
import { getSupabaseServiceClient } from "@/lib/supabase-admin";

async function withQueryTimeout<T>(queryPromise: Promise<T>, timeoutMs: number): Promise<T | null> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race<T | null>([
      queryPromise,
      new Promise<null>((resolve) => {
        timeoutId = setTimeout(() => resolve(null), timeoutMs);
      })
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export async function GET() {
  const startedAt = Date.now();
  try {
    const scope = await requirePosSession();
    const supabase = getSupabaseServiceClient();

    const shiftId = scope.session.shift_id;
    let shiftSummary: { id: string; status: string; opened_at: string; closed_at: string | null } | null = null;
    let shiftLookupFallback = false;
    if (shiftId) {
      const shiftQuery = supabase
        .from("shifts")
        .select("id,status,opened_at,closed_at")
        .eq("id", shiftId)
        .eq("tenant_id", scope.session.tenant_id)
        .eq("branch_id", scope.session.branch_id)
        .maybeSingle<{ id: string; status: string; opened_at: string; closed_at: string | null }>();
      const shiftResult = await withQueryTimeout(
        Promise.resolve(shiftQuery) as Promise<{ data: { id: string; status: string; opened_at: string; closed_at: string | null } | null }>,
        3500
      );
      if (!shiftResult) {
        shiftLookupFallback = true;
      } else {
        shiftSummary = shiftResult.data ?? null;
      }
    }

    if (!shiftSummary && shiftId && shiftLookupFallback) {
      shiftSummary = {
        id: shiftId,
        status: "open",
        opened_at: new Date().toISOString(),
        closed_at: null
      };
    }

    const response = NextResponse.json({
      data: {
        session: {
          id: scope.session.id,
          status: scope.session.status,
          expires_at: scope.session.expires_at
        },
        tenant: {
          id: scope.session.tenant_id,
          code: scope.tenant?.code ?? null,
          name: scope.tenant?.name ?? null
        },
        branch: {
          id: scope.session.branch_id,
          code: scope.branch?.code ?? null,
          name: scope.branch?.name ?? null
        },
        user: {
          id: scope.session.user_id,
          full_name: scope.user.full_name ?? scope.session.user_id
        },
        role: scope.session.role,
        permissions: scope.permissions,
        device: {
          id: scope.session.device_id,
          code: scope.session.device_code
        },
        shift: shiftSummary,
        has_active_shift: shiftSummary?.status === "open"
      },
      error: null
    });

    response.headers.set("x-pos-session-shift-fallback", shiftLookupFallback ? "1" : "0");
    const durationMs = Date.now() - startedAt;
    response.headers.set("x-pos-api-ms", String(durationMs));
    response.headers.set("server-timing", `total;dur=${durationMs}`);
    return withPosSessionCookie(response, scope.session.id);
  } catch (error) {
    if (error instanceof PosGuardError) {
      const response = NextResponse.json({ data: null, error: { code: error.code, message: error.message } }, { status: error.status });
      const durationMs = Date.now() - startedAt;
      response.headers.set("x-pos-api-ms", String(durationMs));
      response.headers.set("server-timing", `total;dur=${durationMs}`);
      return response;
    }
    console.error("[pos-session-current] unexpected error", {
      error: error instanceof Error ? error.message : "Unknown error"
    });
    const response = NextResponse.json(
      { data: null, error: { code: "pos_session_current_failed", message: "Unable to load POS session." } },
      { status: 500 }
    );
    const durationMs = Date.now() - startedAt;
    response.headers.set("x-pos-api-ms", String(durationMs));
    response.headers.set("server-timing", `total;dur=${durationMs}`);
    return response;
  }
}
