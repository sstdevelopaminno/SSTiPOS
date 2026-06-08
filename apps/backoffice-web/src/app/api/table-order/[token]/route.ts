import { fail, ok } from "@/lib/http";
import { loadTableQrMenu, resolveTableQrContext, submitTableQrOrder } from "@/lib/table-qr-ordering";

type SubmitPayload = {
  request_id?: string;
  note?: string | null;
  items?: Array<{ product_id?: string; quantity?: number; note?: string | null }>;
};

const requestBuckets = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

function rateLimit(request: Request, token: string): boolean {
  const now = Date.now();
  if (requestBuckets.size > 2000) {
    for (const [bucketKey, bucket] of requestBuckets) {
      if (bucket.resetAt <= now) requestBuckets.delete(bucketKey);
    }
  }
  const key = `${getClientIp(request)}:${token.slice(0, 36)}`;
  const current = requestBuckets.get(key);
  if (!current || current.resetAt <= now) {
    requestBuckets.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (current.count >= 20) return false;
  current.count += 1;
  return true;
}

function publicError(error: unknown) {
  const message = error instanceof Error ? error.message : "Table ordering is unavailable.";
  if (
    message.includes("invalid_qr_token") ||
    message.includes("qr_session_expired") ||
    message.includes("QR_SESSION_EXPIRED") ||
    message.includes("TABLE_SESSION_CLOSED") ||
    message.includes("table_session_closed")
  ) {
    return fail("table_order_link_expired", "ลิงก์สั่งอาหารหมดอายุหรือปิดบิลแล้ว", 410);
  }
  if (message.includes("SHIFT_NOT_OPEN")) return fail("shift_not_open", "ร้านยังไม่พร้อมรับรายการในขณะนี้", 409);
  if (message.includes("PRODUCT_NOT_AVAILABLE")) return fail("product_unavailable", "มีเมนูที่ไม่พร้อมจำหน่าย กรุณาโหลดใหม่", 409);
  if (message.includes("INVALID_ITEM") || message.includes("ITEMS_REQUIRED")) {
    return fail("invalid_items", "กรุณาเลือกรายการอาหารให้ถูกต้อง", 422);
  }
  return fail("table_order_failed", "ไม่สามารถส่งรายการได้ กรุณาลองใหม่หรือติดต่อพนักงาน", 400);
}

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    if (!rateLimit(request, token)) return fail("rate_limited", "กรุณารอสักครู่แล้วลองใหม่", 429);
    const qrContext = await resolveTableQrContext(token);
    return ok(await loadTableQrMenu(qrContext));
  } catch (error) {
    return publicError(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    if (!rateLimit(request, token)) return fail("rate_limited", "กรุณารอสักครู่แล้วลองใหม่", 429);
    const body = (await request.json()) as SubmitPayload;
    const requestId = String(body.request_id ?? "").trim();
    const items = (body.items ?? []).map((item) => ({
      product_id: String(item.product_id ?? "").trim(),
      quantity: Number(item.quantity),
      note: typeof item.note === "string" ? item.note.trim().slice(0, 240) : null
    }));
    if (!requestId || requestId.length > 120) return fail("invalid_request_id", "Invalid request id.", 422);
    if (items.length < 1 || items.length > 50) return fail("invalid_items", "กรุณาเลือกเมนู 1-50 รายการ", 422);
    if (items.some((item) => !item.product_id || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99)) {
      return fail("invalid_items", "จำนวนอาหารไม่ถูกต้อง", 422);
    }

    const qrContext = await resolveTableQrContext(token);
    const result = await submitTableQrOrder({
      context: qrContext,
      requestId,
      items,
      note: typeof body.note === "string" ? body.note.trim().slice(0, 500) : null
    });
    return ok({
      submission_id: result.submission_id,
      order_no: result.order_no,
      table_code: qrContext.table_code,
      subtotal: Number(result.subtotal),
      tax_total: Number(result.tax_total),
      grand_total: Number(result.grand_total),
      duplicate_request: result.duplicate_request
    }, result.duplicate_request ? 200 : 201);
  } catch (error) {
    return publicError(error);
  }
}
