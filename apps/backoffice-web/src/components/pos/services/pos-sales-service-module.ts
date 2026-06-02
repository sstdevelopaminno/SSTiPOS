import type { OrderType } from "@pos/shared-types";

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
  } | null;
  data?: unknown;
};

type FetchJsonWithTimeout = (
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs?: number,
  retries?: number
) => Promise<{ response: Response; body: ApiErrorBody }>;

type CartItem = {
  product_id: string;
  name: string;
  quantity: number;
  price: number;
};

type PendingSubmit = {
  idempotencyKey: string;
  payload: {
    order_id?: string;
    shift_id: string;
    order_type: OrderType;
    channel: string;
    table_id?: string;
    customer_name?: string;
    external_order_code?: string;
    notes?: string;
    app_total_amount: number;
    discount_amount?: number;
    gp_amount?: number;
    items: Array<{ product_id: string; quantity: number; unit_price?: number }>;
  };
};

type PendingPaymentQueueItem = {
  idempotencyKey: string;
  payload: {
    order_id: string;
    order_no: string;
    order_type: OrderType;
    total_amount: number;
    method: "bank_transfer";
    reference_no?: string | null;
    transfer_verification_id?: string | null;
    transfer_override_approval_id?: string | null;
    skip_transfer_verification?: boolean;
    receipt_items?: CartItem[];
    discount_amount?: number;
  };
  queued_at: string;
  retry_count: number;
  last_error?: string | null;
};

type ActiveOrder = {
  id: string;
  order_no: string;
  status: string;
  order_type?: OrderType;
  channel?: string | null;
  external_order_code?: string | null;
  total_amount?: number;
  table_id?: string | null;
  created_at?: string;
  updated_existing?: boolean;
};

type HeldBill = {
  id: string;
  held_at: string;
  label: string;
  order_type: OrderType;
  queue_status?: "pending" | "editing" | "sending" | "sent" | "cancelled";
  delivery_app_id?: "lineman" | "grabfood" | "shopeefood" | null;
  delivery_external_code?: string | null;
  delivery_notes?: string | null;
  items: CartItem[];
  subtotal: number;
  discount_amount?: number;
  source_order_id?: string | null;
  source_order_status?: string | null;
  status_history?: Array<{ status: "pending" | "editing" | "sending" | "sent" | "cancelled"; at: string; note?: string | null }>;
};

type TextLabels = {
  orderUpdated: string;
  orderCreated: string;
  receiptSaved: string;
  transferQueued: string;
  deliveryPendingBillNeedOrder: string;
  deliveryPendingStatusCancelled: string;
  deliveryPendingStatusSent: string;
  addItemsFirst: string;
  offlineStaged: string;
  submitFailed: string;
  retrySafe: string;
  openShiftRequired: string;
};

function toErrorMessage(error: unknown, fallback = "Unknown error"): string {
  return error instanceof Error ? error.message : fallback;
}

export async function submitOrderWithEffects(args: {
  payload: PendingSubmit;
  applyUiResult: boolean;
  fetchJsonWithTimeout: FetchJsonWithTimeout;
  text: Pick<TextLabels, "orderUpdated" | "orderCreated">;
  setIsOnline: (value: boolean) => void;
  dequeuePendingSubmit: (idempotencyKey: string) => void;
  setActiveOrder: (next: ActiveOrder | null) => void;
  setCart: (next: CartItem[]) => void;
  setCartDrawerOpen: (next: boolean) => void;
  refreshTables: () => void;
  pushSubmitMessage: (message: string) => void;
}): Promise<ActiveOrder | null> {
  const {
    payload,
    applyUiResult,
    fetchJsonWithTimeout,
    text,
    setIsOnline,
    dequeuePendingSubmit,
    setActiveOrder,
    setCart,
    setCartDrawerOpen,
    refreshTables,
    pushSubmitMessage
  } = args;
  const { response, body } = await fetchJsonWithTimeout(
    "/api/pos/sales",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-idempotency-key": payload.idempotencyKey
      },
      body: JSON.stringify(payload.payload)
    },
    12000,
    0
  );
  if (!response.ok || body.error) {
    const code = String(body.error?.code ?? "").trim();
    const message = String(body.error?.message ?? "").trim() || "Submit failed.";
    throw new Error(code ? `${code}: ${message}` : message);
  }

  setIsOnline(true);
  dequeuePendingSubmit(payload.idempotencyKey);
  const nextOrder = (body.data ?? {}) as Partial<ActiveOrder>;
  let createdOrder: ActiveOrder | null = null;
  if (nextOrder.id && nextOrder.order_no && nextOrder.status) {
    createdOrder = {
      id: nextOrder.id,
      order_no: nextOrder.order_no,
      status: nextOrder.status,
      order_type: nextOrder.order_type as OrderType | undefined,
      channel: typeof nextOrder.channel === "string" ? nextOrder.channel : null,
      external_order_code: typeof nextOrder.external_order_code === "string" ? nextOrder.external_order_code : null,
      total_amount: Number.isFinite(nextOrder.total_amount) ? Number(nextOrder.total_amount) : undefined,
      table_id: nextOrder.table_id ?? null,
      created_at: nextOrder.created_at,
      updated_existing: Boolean(nextOrder.updated_existing)
    };
    if (applyUiResult) {
      setActiveOrder(createdOrder);
    }
  }

  if (applyUiResult) {
    pushSubmitMessage(`${nextOrder.updated_existing ? text.orderUpdated : text.orderCreated}: ${nextOrder.order_no ?? "-"}`);
    if (payload.payload.order_type !== "takeaway") {
      setCart([]);
    }
    setCartDrawerOpen(false);
    if (payload.payload.order_type === "dine_in") {
      refreshTables();
    }
  } else {
    pushSubmitMessage(`${text.orderCreated}: ${nextOrder.order_no ?? "-"}`);
  }

  return createdOrder;
}

export async function submitTransferPaymentWithEffects(args: {
  pendingPaymentEntry: PendingPaymentQueueItem;
  applyUiResult: boolean;
  fetchJsonWithTimeout: FetchJsonWithTimeout;
  text: Pick<TextLabels, "receiptSaved" | "transferQueued">;
  transferSlipPreviewUrl: string | null;
  fallbackReceiptItems: CartItem[];
  setIsOnline: (value: boolean) => void;
  dequeuePendingPayment: (idempotencyKey: string) => void;
  setActiveOrder: (updater: (current: ActiveOrder | null) => ActiveOrder | null) => void;
  setCart: (next: CartItem[]) => void;
  setTakeawayCreatingPreview: (next: null) => void;
  setReviewOrder: (next: null) => void;
  setCashReviewOrder: (next: null) => void;
  setTransferReviewOrder: (next: null) => void;
  setTransferReference: (next: string) => void;
  setCashReceivedInput: (next: string) => void;
  setCashReplaceOnNextKey: (next: boolean) => void;
  setCashError: (next: string | null) => void;
  setTransferError: (next: string | null) => void;
  setTransferSlipFile: (next: File | null) => void;
  revokeTransferSlipPreviewUrl: (url: string) => void;
  setTransferSlipPreviewUrl: (next: string | null) => void;
  setTransferSlipParsed: (next: null) => void;
  setTransferSlipChecks: (next: null) => void;
  setTransferSlipIssues: (next: string[]) => void;
  setTransferSlipVerified: (next: boolean) => void;
  setTransferSlipVerifiedAgainst: (next: string | null) => void;
  setTransferSlipVerificationId: (next: string | null) => void;
  setTransferOverrideApprovalId: (next: string | null) => void;
  setReceiptSession: (next: {
    order_id: string;
    order_no: string;
    created_at: string;
    items: CartItem[];
    total_amount: number;
    discount_amount: number;
    payment_method: "bank_transfer";
    cash_received: number;
    change_amount: number;
  } | null) => void;
  setReceiptSaving: (next: boolean) => void;
  setReceiptSaved: (next: boolean) => void;
  setBillPaymentMethod: (next: "bank_transfer") => void;
  setReceiptError: (next: string | null) => void;
  returnToDineInTableBrowserAfterPayment: () => void;
  pushSubmitMessage: (message: string) => void;
}): Promise<void> {
  const {
    pendingPaymentEntry,
    applyUiResult,
    fetchJsonWithTimeout,
    text,
    transferSlipPreviewUrl,
    fallbackReceiptItems,
    setIsOnline,
    dequeuePendingPayment,
    setActiveOrder,
    setCart,
    setTakeawayCreatingPreview,
    setReviewOrder,
    setCashReviewOrder,
    setTransferReviewOrder,
    setTransferReference,
    setCashReceivedInput,
    setCashReplaceOnNextKey,
    setCashError,
    setTransferError,
    setTransferSlipFile,
    revokeTransferSlipPreviewUrl,
    setTransferSlipPreviewUrl,
    setTransferSlipParsed,
    setTransferSlipChecks,
    setTransferSlipIssues,
    setTransferSlipVerified,
    setTransferSlipVerifiedAgainst,
    setTransferSlipVerificationId,
    setTransferOverrideApprovalId,
    setReceiptSession,
    setReceiptSaving,
    setReceiptSaved,
    setBillPaymentMethod,
    setReceiptError,
    returnToDineInTableBrowserAfterPayment,
    pushSubmitMessage
  } = args;

  const { response, body } = await fetchJsonWithTimeout(
    "/api/pos/payments",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-idempotency-key": pendingPaymentEntry.idempotencyKey
      },
      body: JSON.stringify({
        order_id: pendingPaymentEntry.payload.order_id,
        payment_lines: [
          {
            method: "bank_transfer",
            amount: pendingPaymentEntry.payload.total_amount,
            reference_no: pendingPaymentEntry.payload.reference_no ?? null
          }
        ],
        transfer_verification_id: pendingPaymentEntry.payload.transfer_verification_id ?? null,
        transfer_override_approval_id: pendingPaymentEntry.payload.transfer_override_approval_id ?? null,
        skip_transfer_verification: pendingPaymentEntry.payload.skip_transfer_verification === true,
        cash_received: pendingPaymentEntry.payload.total_amount,
        change_amount: 0
      })
    },
    20000
  );
  if (!response.ok || body.error) {
    throw new Error(body.error?.message ?? "Failed to complete transfer payment.");
  }

  setIsOnline(true);
  dequeuePendingPayment(pendingPaymentEntry.idempotencyKey);

  if (!applyUiResult) {
    pushSubmitMessage(`${text.transferQueued}: ${pendingPaymentEntry.payload.order_no}`);
    return;
  }

  setActiveOrder((current) => (current?.id === pendingPaymentEntry.payload.order_id ? null : current));
  setCart([]);
  setTakeawayCreatingPreview(null);
  setReviewOrder(null);
  setCashReviewOrder(null);
  setTransferReviewOrder(null);
  setTransferReference("");
  setCashReceivedInput("");
  setCashReplaceOnNextKey(false);
  setCashError(null);
  setTransferError(null);
  setTransferSlipFile(null);
  if (transferSlipPreviewUrl) {
    revokeTransferSlipPreviewUrl(transferSlipPreviewUrl);
  }
  setTransferSlipPreviewUrl(null);
  setTransferSlipParsed(null);
  setTransferSlipChecks(null);
  setTransferSlipIssues([]);
  setTransferSlipVerified(false);
  setTransferSlipVerifiedAgainst(null);
  setTransferSlipVerificationId(null);
  setTransferOverrideApprovalId(null);
  setReceiptSession({
    order_id: pendingPaymentEntry.payload.order_id,
    order_no: pendingPaymentEntry.payload.order_no,
    created_at: new Date().toISOString(),
    items: pendingPaymentEntry.payload.receipt_items ?? fallbackReceiptItems,
    total_amount: pendingPaymentEntry.payload.total_amount,
    discount_amount: pendingPaymentEntry.payload.discount_amount ?? 0,
    payment_method: "bank_transfer",
    cash_received: pendingPaymentEntry.payload.total_amount,
    change_amount: 0
  });
  setReceiptSaving(false);
  setReceiptSaved(true);
  setBillPaymentMethod("bank_transfer");
  setReceiptError(null);
  pushSubmitMessage(`${text.receiptSaved}: ${pendingPaymentEntry.payload.order_no}`);
  if (pendingPaymentEntry.payload.order_type === "dine_in") {
    setReceiptSession(null);
    setReceiptSaved(false);
    setReceiptError(null);
    setReceiptSaving(false);
    returnToDineInTableBrowserAfterPayment();
  }
}

export async function sendPendingDeliveryBillNowWithEffects(args: {
  heldBill: HeldBill;
  isBusy: boolean;
  checkoutRequestLockRef: { current: boolean };
  shiftId: string | null;
  isOnline: boolean;
  text: Pick<
    TextLabels,
    | "openShiftRequired"
    | "deliveryPendingBillNeedOrder"
    | "deliveryPendingStatusCancelled"
    | "deliveryPendingStatusSent"
    | "addItemsFirst"
    | "offlineStaged"
    | "submitFailed"
    | "retrySafe"
  >;
  deliveryActionBusyError: string;
  normalizeDeliveryCartItemsForApp: (cart: CartItem[], appId: "lineman" | "grabfood" | "shopeefood" | null | undefined) => CartItem[];
  newIdempotencyKey: () => string;
  mapDeliveryChannel: (appId: "lineman" | "grabfood" | "shopeefood") => string;
  buildDeliveryDraftBillNo: (appId: "lineman" | "grabfood" | "shopeefood", externalCode: string) => string;
  appendDeliveryStatusHistory: (
    bill: HeldBill,
    status: "pending" | "editing" | "sending" | "sent" | "cancelled",
    note?: string | null
  ) => Array<{ status: "pending" | "editing" | "sending" | "sent" | "cancelled"; at: string; note?: string | null }>;
  submitOrder: (payload: PendingSubmit) => Promise<ActiveOrder | null>;
  submitTransferPayment: (pendingPaymentEntry: PendingPaymentQueueItem, applyUiResult: boolean) => Promise<void>;
  enqueuePendingSubmit: (payload: PendingSubmit, lastError?: string) => void;
  enqueuePendingPayment: (payload: PendingPaymentQueueItem) => void;
  markPendingPaymentFailed: (idempotencyKey: string, errorMessage: string) => void;
  markConnectivityFromError: (error: unknown) => void;
  pushSubmitMessage: (message: string | null) => void;
  setSubmitting: (next: boolean) => void;
  setTransferSubmitting: (next: boolean) => void;
  setDeliveryEditingHeldBillId: (next: string | null) => void;
  setSelectedDeliveryApp: (next: "lineman" | "grabfood" | "shopeefood" | null) => void;
  setDeliveryExternalCode: (next: string) => void;
  setDeliveryNotes: (next: string) => void;
  setDeliveryDraftBillNo: (next: string | null) => void;
  setQuickMode: (next: "delivery") => void;
  setOrderType: (next: "delivery_manual") => void;
  setDeliveryCatalogOpen: (next: boolean) => void;
  setCart: (next: CartItem[]) => void;
  setCartDrawerOpen: (next: boolean) => void;
  setHeldBills: (
    updater: (current: HeldBill[]) => HeldBill[]
  ) => void;
  setDeliveryFlowState: (next: "completed") => void;
  updateDeliveryHeldBillStatus: (heldBillId: string, status: "pending" | "editing" | "sending" | "sent" | "cancelled", note?: string | null) => void;
}): Promise<void> {
  const {
    heldBill,
    isBusy,
    checkoutRequestLockRef,
    shiftId,
    isOnline,
    text,
    deliveryActionBusyError,
    normalizeDeliveryCartItemsForApp,
    newIdempotencyKey,
    mapDeliveryChannel,
    buildDeliveryDraftBillNo,
    appendDeliveryStatusHistory,
    submitOrder,
    submitTransferPayment,
    enqueuePendingSubmit,
    enqueuePendingPayment,
    markPendingPaymentFailed,
    markConnectivityFromError,
    pushSubmitMessage,
    setSubmitting,
    setTransferSubmitting,
    setDeliveryEditingHeldBillId,
    setSelectedDeliveryApp,
    setDeliveryExternalCode,
    setDeliveryNotes,
    setDeliveryDraftBillNo,
    setQuickMode,
    setOrderType,
    setDeliveryCatalogOpen,
    setCart,
    setCartDrawerOpen,
    setHeldBills,
    setDeliveryFlowState,
    updateDeliveryHeldBillStatus
  } = args;

  if (isBusy || checkoutRequestLockRef.current) {
    throw new Error(deliveryActionBusyError);
  }
  if (!shiftId) {
    pushSubmitMessage(text.openShiftRequired);
    return;
  }
  if (heldBill.order_type !== "delivery_manual" || !heldBill.delivery_app_id || !heldBill.delivery_external_code) {
    pushSubmitMessage(text.deliveryPendingBillNeedOrder);
    return;
  }
  if (heldBill.queue_status === "cancelled" || heldBill.queue_status === "sent") {
    pushSubmitMessage(heldBill.queue_status === "cancelled" ? text.deliveryPendingStatusCancelled : text.deliveryPendingStatusSent);
    return;
  }

  const cartSnapshot = normalizeDeliveryCartItemsForApp(
    heldBill.items.map((item) => ({ ...item })),
    heldBill.delivery_app_id
  );
  if (cartSnapshot.length === 0) {
    pushSubmitMessage(text.addItemsFirst);
    return;
  }

  const snapshotSubtotal = Number(cartSnapshot.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2));
  const snapshotDiscount = Number(
    Math.min(
      snapshotSubtotal,
      Math.max(0, Number.isFinite(heldBill.discount_amount) ? Number(heldBill.discount_amount) : 0)
    ).toFixed(2)
  );

  checkoutRequestLockRef.current = true;
  setSubmitting(true);
  updateDeliveryHeldBillStatus(heldBill.id, "sending");
  setDeliveryEditingHeldBillId(null);
  setSelectedDeliveryApp(heldBill.delivery_app_id);
  setDeliveryExternalCode(heldBill.delivery_external_code);
  setDeliveryNotes(heldBill.delivery_notes ?? "");
  setDeliveryDraftBillNo(heldBill.label || buildDeliveryDraftBillNo(heldBill.delivery_app_id, heldBill.delivery_external_code));
  setQuickMode("delivery");
  setOrderType("delivery_manual");
  setDeliveryCatalogOpen(true);
  setCart(cartSnapshot);
  pushSubmitMessage(null);

  const payload: PendingSubmit = {
    idempotencyKey: newIdempotencyKey(),
    payload: {
      order_id: undefined,
      shift_id: shiftId,
      order_type: "delivery_manual",
      channel: mapDeliveryChannel(heldBill.delivery_app_id),
      table_id: undefined,
      customer_name: undefined,
      external_order_code: heldBill.delivery_external_code,
      notes: heldBill.delivery_notes ?? undefined,
      app_total_amount: snapshotSubtotal,
      discount_amount: snapshotDiscount,
      gp_amount: 0,
      items: cartSnapshot.map((item) => ({ product_id: item.product_id, quantity: item.quantity, unit_price: item.price }))
    }
  };

  if (!isOnline) {
    enqueuePendingSubmit(payload);
    updateDeliveryHeldBillStatus(heldBill.id, "pending", "offline_staged");
    setCart([]);
    setCartDrawerOpen(false);
    pushSubmitMessage(text.offlineStaged);
    setSubmitting(false);
    checkoutRequestLockRef.current = false;
    return;
  }

  try {
    const createdOrder = await submitOrder(payload);
    if (!createdOrder) {
      throw new Error("Order created but bill information is missing.");
    }
    const settledTotal = Number(createdOrder.total_amount ?? Number(Math.max(0, snapshotSubtotal - snapshotDiscount).toFixed(2)));
    setHeldBills((current) =>
      current.map((entry) => {
        if (entry.id !== heldBill.id || entry.order_type !== "delivery_manual") {
          return entry;
        }
        return {
          ...entry,
          source_order_id: createdOrder.id,
          source_order_status: createdOrder.status,
          queue_status: "sent",
          status_history: appendDeliveryStatusHistory(entry, "sent", createdOrder.order_no)
        };
      })
    );

    const pendingPaymentEntry: PendingPaymentQueueItem = {
      idempotencyKey: `pos-transfer-${crypto.randomUUID()}`,
      payload: {
        order_id: createdOrder.id,
        order_no: createdOrder.order_no,
        order_type: "delivery_manual",
        total_amount: settledTotal,
        discount_amount: snapshotDiscount,
        method: "bank_transfer",
        reference_no: heldBill.delivery_external_code,
        skip_transfer_verification: true,
        receipt_items: cartSnapshot
      },
      queued_at: new Date().toISOString(),
      retry_count: 0,
      last_error: null
    };

    enqueuePendingPayment(pendingPaymentEntry);
    setTransferSubmitting(true);
    try {
      await submitTransferPayment(pendingPaymentEntry, true);
      setDeliveryFlowState("completed");
    } catch (transferPayError) {
      const paymentMessage = toErrorMessage(transferPayError, "Failed to complete transfer payment.");
      markPendingPaymentFailed(pendingPaymentEntry.idempotencyKey, paymentMessage);
      updateDeliveryHeldBillStatus(heldBill.id, "pending", paymentMessage);
      markConnectivityFromError(transferPayError);
      pushSubmitMessage(`${text.submitFailed}: ${paymentMessage}. ${text.retrySafe}`);
    } finally {
      setTransferSubmitting(false);
    }
  } catch (submitError) {
    const message = toErrorMessage(submitError, "Unknown error");
    markConnectivityFromError(submitError);
    enqueuePendingSubmit(payload, message);
    updateDeliveryHeldBillStatus(heldBill.id, "pending", message);
    setCart([]);
    setCartDrawerOpen(false);
    pushSubmitMessage(`${text.submitFailed}: ${message}. ${text.retrySafe}`);
  } finally {
    setSubmitting(false);
    checkoutRequestLockRef.current = false;
  }
}
