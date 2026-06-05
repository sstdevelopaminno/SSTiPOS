"use client";

import Image from "next/image";
import type { ReactNode, RefObject } from "react";

type QuickMode = "home" | "dine_in" | "delivery";

type CartItem = {
  product_id: string;
  name: string;
  quantity: number;
  price: number;
};

type CheckoutReviewOrder = {
  order_id: string;
  order_no: string;
  external_order_code?: string | null;
  table_id?: string | null;
  created_at: string;
  items: CartItem[];
  total_amount: number;
  discount_amount?: number;
};

type ReceiptSession = CheckoutReviewOrder & {
  payment_method: "cash" | "bank_transfer";
  cash_received: number;
  change_amount: number;
};

type TakeawayCreatingPreview = {
  items: CartItem[];
  total_amount: number;
};

type SlipExtractPayload = {
  payer_name: string | null;
  payee_name: string | null;
  amount: number | null;
  transfer_datetime: string | null;
  transaction_id: string | null;
  confidence: number | null;
};

type SlipVerifyChecks = {
  amount_match: boolean;
  payee_match: boolean;
  datetime_present: boolean;
  confidence_pass: boolean;
};

type TransferVerification = {
  id: string;
  verification_status: "passed" | "failed" | "override_passed" | "error";
  expected_amount: number;
  parsed_amount: number | null;
  parsed_reference_no: string | null;
  parsed_transaction_id: string | null;
  issues?: unknown;
  error_message: string | null;
  verified_at: string;
};

type Props = {
  text: any;
  lang: "th" | "en";
  shiftStatus: string | undefined;
  sellerName: string;
  quickMode: QuickMode;
  receiptLogoPath: string;
  receiptStoreName: string;
  receiptStoreAddress: string;
  receiptStorePhone: string;
  receiptBranchLabel: string;
  takeawayCreatingPreview: TakeawayCreatingPreview | null;
  reviewOrder: CheckoutReviewOrder | null;
  cashReviewOrder: CheckoutReviewOrder | null;
  transferReviewOrder: CheckoutReviewOrder | null;
  receiptSession: ReceiptSession | null;
  receiptSaving: boolean;
  cashSubmitting: boolean;
  transferSubmitting: boolean;
  transferSlipChecking: boolean;
  transferSlipFile: File | null;
  transferSlipPreviewUrl: string | null;
  transferSlipParsed: SlipExtractPayload | null;
  transferSlipChecks: SlipVerifyChecks | null;
  transferSlipIssues: string[];
  transferSlipVerified: boolean;
  transferSlipReverifyRequired: boolean;
  transferNeedsOverride: boolean;
  transferCanSubmit: boolean;
  transferError: string | null;
  transferReference: string;
  transferAmountInteger: number;
  promptPayQrUrl: string | null;
  promptPayPhone: string;
  promptPayPhoneDisplay: string;
  promptPayLocked: boolean;
  promptPayQrMode: "promptpay_link" | "qr_image";
  paymentAccountLabel: string;
  expectedPayeeName: string;
  transferVerificationHistory: TransferVerification[];
  cashReceivedInput: string;
  cashReceivedDisplay: string;
  cashDiff: number;
  cashQuickAmounts: number[];
  cashKeypadKeys: string[];
  cashError: string | null;
  cashConfirmNeedsAttention: boolean;
  transferSlipInputRef: RefObject<HTMLInputElement | null>;
  formatMoney: (value: number) => string;
  formatQuantity: (value: number) => string;
  formatReceiptDateTime: (value: string, lang: "th" | "en") => string;
  renderExternalOrderCode: (order: CheckoutReviewOrder) => ReactNode;
  renderDineInPaymentIdentity: (tableId?: string | null) => ReactNode;
  getQuickModeLabel: () => string;
  getReceiptPaymentMethodLabel: (session: ReceiptSession) => string;
  getTransferVerificationStatusTone: (status: TransferVerification["verification_status"]) => "pass" | "fail" | "warn";
  getTransferVerificationStatusLabel: (status: TransferVerification["verification_status"]) => string;
  normalizeTransferVerificationIssues: (value: unknown) => string[];
  canDeductIngredientForItem: (productId: string) => boolean;
  ingredientDeductingKey: string | null;
  ingredientDeductingMode: "deduct" | "restore" | null;
  onCloseReview: () => void;
  onCancelFromReview: (order: CheckoutReviewOrder) => void;
  onCancelFromCash: (order: CheckoutReviewOrder) => void;
  onCancelFromTransfer: (order: CheckoutReviewOrder) => void;
  onDeductIngredientForItem: (order: CheckoutReviewOrder, item: CartItem) => void;
  onOpenCash: (order: CheckoutReviewOrder) => void;
  onOpenTransfer: (order: CheckoutReviewOrder) => void;
  onCloseCash: () => void;
  onConfirmCash: () => Promise<void> | void;
  onApplyQuickCashAmount: (amount: number) => void;
  onAppendCashKeypadValue: (value: string) => void;
  onClearCashInput: () => void;
  onBackspaceCashInput: () => void;
  onCloseTransfer: () => void;
  onPromptPayPhoneChange: (value: string) => void;
  onTransferSlipFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onVerifyTransferSlip: () => Promise<void> | void;
  onRequestTransferOverride: () => void;
  onTransferReferenceChange: (value: string) => void;
  onConfirmTransfer: () => Promise<void> | void;
  onPrintReceipt: () => void;
  onCloseReceipt: () => void;
};

export function PosPaymentModals({
  text,
  lang,
  shiftStatus,
  sellerName,
  quickMode,
  receiptLogoPath,
  receiptStoreName,
  receiptStoreAddress,
  receiptStorePhone,
  receiptBranchLabel,
  takeawayCreatingPreview,
  reviewOrder,
  cashReviewOrder,
  transferReviewOrder,
  receiptSession,
  receiptSaving,
  cashSubmitting,
  transferSubmitting,
  transferSlipChecking,
  transferSlipFile,
  transferSlipPreviewUrl,
  transferSlipParsed,
  transferSlipChecks,
  transferSlipIssues,
  transferSlipVerified,
  transferSlipReverifyRequired,
  transferNeedsOverride,
  transferCanSubmit,
  transferError,
  transferReference,
  transferAmountInteger,
  promptPayQrUrl,
  promptPayPhone,
  promptPayPhoneDisplay,
  promptPayLocked,
  promptPayQrMode,
  paymentAccountLabel,
  expectedPayeeName,
  transferVerificationHistory,
  cashReceivedInput,
  cashReceivedDisplay,
  cashDiff,
  cashQuickAmounts,
  cashKeypadKeys,
  cashError,
  cashConfirmNeedsAttention,
  transferSlipInputRef,
  formatMoney,
  formatQuantity,
  formatReceiptDateTime,
  renderExternalOrderCode,
  renderDineInPaymentIdentity,
  getQuickModeLabel,
  getReceiptPaymentMethodLabel,
  getTransferVerificationStatusTone,
  getTransferVerificationStatusLabel,
  normalizeTransferVerificationIssues,
  canDeductIngredientForItem,
  ingredientDeductingKey,
  ingredientDeductingMode,
  onCloseReview,
  onCancelFromReview,
  onCancelFromCash,
  onCancelFromTransfer,
  onDeductIngredientForItem,
  onOpenCash,
  onOpenTransfer,
  onCloseCash,
  onConfirmCash,
  onApplyQuickCashAmount,
  onAppendCashKeypadValue,
  onClearCashInput,
  onBackspaceCashInput,
  onCloseTransfer,
  onPromptPayPhoneChange,
  onTransferSlipFileChange,
  onVerifyTransferSlip,
  onRequestTransferOverride,
  onTransferReferenceChange,
  onConfirmTransfer,
  onPrintReceipt,
  onCloseReceipt
}: Props) {
  function resolveReceiptDiscountAmount(session: ReceiptSession): number {
    const explicitDiscount = Number(session.discount_amount ?? 0);
    if (Number.isFinite(explicitDiscount) && explicitDiscount > 0) {
      return Number(Math.max(0, explicitDiscount).toFixed(2));
    }
    const cartSubtotal = session.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    const fallbackDiscount = Math.max(0, cartSubtotal - Number(session.total_amount ?? 0));
    return Number(fallbackDiscount.toFixed(2));
  }

  return (
    <>
      {takeawayCreatingPreview ? (
        <div className="posui-payment-modal-backdrop" role="dialog" aria-modal="true" aria-label={text.creatingOrderTitle}>
          <section className="posui-payment-modal posui-payment-modal--review posui-payment-modal--creating">
            <header className="posui-payment-modal__header">
              <h3>{text.creatingOrderTitle}</h3>
            </header>
            <p className="posui-payment-modal__hint">{text.creatingOrderHint}</p>
            <div className="posui-payment-receipt-card">
              <div className="posui-payment-modal__items">
                {takeawayCreatingPreview.items.map((item) => (
                  <div key={`creating-${item.product_id}`} className="posui-payment-modal__item-row">
                    <div className="posui-payment-modal__item-main">
                      <strong className="posui-payment-modal__item-name">{item.name}</strong>
                      <small className="posui-payment-modal__item-meta">
                        {text.reviewQtyPriceLabel}: {formatQuantity(item.quantity)} x {formatMoney(item.price)}
                      </small>
                    </div>
                    <strong className="posui-payment-modal__item-total">{formatMoney(item.price * item.quantity)}</strong>
                  </div>
                ))}
              </div>
              <div className="posui-payment-modal__total">
                <span>{text.reviewGrandTotalLabel}</span>
                <strong>{formatMoney(takeawayCreatingPreview.total_amount)}</strong>
              </div>
            </div>
            <div className="posui-payment-modal__creating-progress" aria-hidden="true" />
          </section>
        </div>
      ) : null}

      {reviewOrder ? (
        <div className="posui-payment-modal-backdrop" role="dialog" aria-modal="true" aria-label={text.reviewBillTitle}>
          <section className="posui-payment-modal posui-payment-modal--review posui-payment-modal--review-bill" onClick={(event) => event.stopPropagation()}>
            <header className="posui-payment-modal__header posui-payment-modal__header--review-bill">
              <div className="posui-payment-modal__title-wrap">
                <span className="posui-payment-modal__review-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M7.25 3.5h9.5a2.75 2.75 0 0 1 2.75 2.75v11.5a2.75 2.75 0 0 1-2.75 2.75h-9.5a2.75 2.75 0 0 1-2.75-2.75V6.25A2.75 2.75 0 0 1 7.25 3.5Z" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M8.5 8h7M8.5 11.5h7M8.5 15h3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
                <div>
                  <h3>{text.reviewBillTitle}</h3>
                  <p className="posui-payment-modal__hint">{text.reviewBillHint}</p>
                </div>
              </div>
              <button type="button" className="posui-btn posui-btn--review-close" onClick={onCloseReview}>
                {text.close}
              </button>
            </header>
            <div className="posui-payment-modal__review-content">
              {renderExternalOrderCode(reviewOrder)}
              <div className="posui-payment-receipt-card">
                <div className="posui-payment-modal__items">
                  <div className="posui-payment-modal__items-head">
                    <span>{text.reviewItemsHeader}</span>
                    <span>{text.reviewQtyHeader ?? "Qty"}</span>
                    <span>{text.reviewLineTotalLabel}</span>
                  </div>
                  {reviewOrder.items.map((item) => (
                    <div key={`${reviewOrder.order_id}-${item.product_id}`} className="posui-payment-modal__item-row">
                      {(() => {
                        const lineKey = `${reviewOrder.order_id}:${item.product_id}`;
                        const isBusy = ingredientDeductingKey === lineKey;
                        const actionLabel = isBusy
                          ? ingredientDeductingMode === "restore"
                            ? text.reviewItemIngredientRestoring
                            : text.reviewItemIngredientDeducting
                          : text.reviewItemIngredientDeductAction;
                        return (
                          <>
                      <div className="posui-payment-modal__item-main">
                        <strong className="posui-payment-modal__item-name">{item.name}</strong>
                        <small className="posui-payment-modal__item-meta">
                          {text.reviewQtyPriceLabel}: {formatQuantity(item.quantity)} x {formatMoney(item.price)}
                        </small>
                        {canDeductIngredientForItem(item.product_id) ? (
                          <button
                            type="button"
                            className="posui-payment-modal__item-ingredient-btn"
                            disabled={isBusy}
                            onClick={() => onDeductIngredientForItem(reviewOrder, item)}
                          >
                            {actionLabel}
                          </button>
                        ) : null}
                      </div>
                      <span className="posui-payment-modal__item-qty">{formatQuantity(item.quantity)}</span>
                      <strong className="posui-payment-modal__item-total">{formatMoney(item.price * item.quantity)}</strong>
                          </>
                        );
                      })()}
                    </div>
                  ))}
                </div>
                <div className="posui-payment-modal__total">
                  <span>{text.reviewGrandTotalLabel}</span>
                  <strong>{formatMoney(reviewOrder.total_amount)}</strong>
                </div>
              </div>
            </div>
            <div className="posui-payment-modal__actions posui-payment-modal__actions--review-bill">
              <button type="button" className="posui-btn posui-btn--review-cancel" onClick={() => onCancelFromReview(reviewOrder)}>
                {text.cancelBill}
              </button>
              <button type="button" className="posui-btn posui-btn--review-cash" onClick={() => onOpenCash(reviewOrder)}>
                {text.paymentCash}
              </button>
              <button type="button" className="posui-btn posui-btn--review-transfer" onClick={() => onOpenTransfer(reviewOrder)}>
                {text.paymentTransfer}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {cashReviewOrder ? (
        <div className="posui-payment-modal-backdrop" role="dialog" aria-modal="true" aria-label={text.cashReceiveTitle}>
          <section className="posui-payment-modal posui-payment-modal--cash" onClick={(event) => event.stopPropagation()}>
            <header className="posui-payment-modal__header">
              <h3>{text.cashReceiveTitle}</h3>
              <button type="button" className="posui-btn" onClick={onCloseCash} disabled={cashSubmitting}>
                {text.close}
              </button>
            </header>
            <p className="posui-payment-modal__hint">{text.cashReceiveHint}</p>
            {renderExternalOrderCode(cashReviewOrder)}
            <div className="posui-cash-layout">
              <section className="posui-cash-panel">
                <div className="posui-cash-summary-row posui-cash-summary-row--due">
                  <span>{text.paymentTotalDue}</span>
                  <strong>{formatMoney(cashReviewOrder.total_amount)}</strong>
                </div>
                <div className="posui-cash-summary-row posui-cash-summary-row--received" aria-live="polite" aria-label={text.cashReceivedLabel}>
                  <span>{text.cashReceivedLabel}</span>
                  <strong className={cashReceivedInput ? "" : "is-placeholder"}>{cashReceivedDisplay}</strong>
                </div>
                <div className="posui-cash-quick">
                  <span>{text.cashQuickBlocksLabel}</span>
                  <div className="posui-cash-quick__grid">
                    {cashQuickAmounts.map((amount) => (
                      <button key={amount} type="button" className="posui-btn posui-cash-quick__btn" onClick={() => onApplyQuickCashAmount(amount)} disabled={cashSubmitting}>
                        {`฿${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="posui-cash-summary-row posui-cash-summary-row--accent">
                  <span>{cashDiff >= 0 ? text.cashChange : text.cashRemaining}</span>
                  <strong>{formatMoney(Math.abs(cashDiff))}</strong>
                </div>
              </section>
              <section className="posui-cash-keypad" aria-label={text.cashKeypadTitle}>
                <p className="posui-cash-keypad__label">{text.cashKeypadTitle}</p>
                <div className="posui-cash-keypad__grid">
                  {cashKeypadKeys.map((key) => (
                    <button key={key} type="button" className="posui-btn posui-cash-keypad__key" onClick={() => onAppendCashKeypadValue(key)} disabled={cashSubmitting}>
                      {key}
                    </button>
                  ))}
                </div>
                <div className="posui-cash-keypad__foot">
                  <button type="button" className="posui-btn posui-cash-keypad__cmd" onClick={onClearCashInput} disabled={cashSubmitting}>
                    {text.cashKeyClear}
                  </button>
                  <button type="button" className="posui-btn posui-cash-keypad__cmd" onClick={onBackspaceCashInput} disabled={cashSubmitting}>
                    {text.cashKeyBackspace}
                  </button>
                </div>
              </section>
            </div>
            {cashError ? <p className="posui-payment-modal__error">{cashError}</p> : null}
            <div className="posui-payment-modal__actions posui-payment-modal__actions--cash">
              <button type="button" className="posui-btn posui-btn--danger posui-btn--cash-cancel" onClick={() => onCancelFromCash(cashReviewOrder)} disabled={cashSubmitting}>
                {text.cancelBill}
              </button>
              <button
                type="button"
                className={`posui-btn posui-btn--primary posui-btn--cash-confirm ${cashConfirmNeedsAttention ? "posui-btn--cash-confirm-warn" : ""}`}
                onClick={() => void onConfirmCash()}
                disabled={cashSubmitting}
              >
                {cashSubmitting ? text.submitting : text.cashConfirm}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {transferReviewOrder ? (
        <div className="posui-payment-modal-backdrop" role="dialog" aria-modal="true" aria-label={text.transferTitle}>
          <section className="posui-payment-modal posui-payment-modal--cash" onClick={(event) => event.stopPropagation()}>
            <header className="posui-payment-modal__header">
              <h3>{text.transferTitle}</h3>
              <button type="button" className="posui-btn" onClick={onCloseTransfer} disabled={transferSubmitting || transferSlipChecking}>
                {text.close}
              </button>
            </header>
            <p className="posui-payment-modal__hint">{text.transferHint}</p>
            {renderExternalOrderCode(transferReviewOrder)}
            {renderDineInPaymentIdentity(transferReviewOrder.table_id)}
            <div className="posui-transfer-layout">
              <section className="posui-transfer-qr-panel">
                <div className="posui-cash-summary-row posui-cash-summary-row--due">
                  <span>{text.transferPromptPayAmountLabel}</span>
                  <strong>฿{transferAmountInteger}</strong>
                </div>
                <h4 className="posui-transfer-section-title">{text.transferQrTitle}</h4>
                <p className="posui-transfer-section-hint">{text.transferQrHint}</p>
                {paymentAccountLabel ? <p className="posui-transfer-section-hint">{paymentAccountLabel}</p> : null}
                {promptPayQrUrl ? (
                  <div className="posui-transfer-qr-box">
                    <Image src={promptPayQrUrl} alt="PromptPay QR" className="posui-transfer-qr-image" width={320} height={320} unoptimized />
                  </div>
                ) : (
                  <p className="posui-payment-modal__error">{lang === "th" ? "ยังไม่ได้ตั้งค่าเบอร์พร้อมเพย์" : "PromptPay phone is not configured."}</p>
                )}
                <label className={`posui-payment-modal__input-label ${promptPayQrMode === "qr_image" ? "hidden" : ""}`} htmlFor="transfer-promptpay-phone">
                  {text.transferPromptPayPhoneLabel}
                  <input
                    id="transfer-promptpay-phone"
                    className="posui-payment-modal__input"
                    value={promptPayPhone}
                    onChange={(event) => onPromptPayPhoneChange(event.target.value)}
                    placeholder="0843374982"
                    inputMode="numeric"
                    disabled={promptPayLocked || transferSubmitting || transferSlipChecking}
                    autoComplete="off"
                  />
                </label>
                {promptPayQrMode === "promptpay_link" ? <p className="posui-transfer-phone-readonly">{promptPayPhoneDisplay || "-"}</p> : null}
                <p className="posui-transfer-mobile-hint">{text.transferScanWithPhone}</p>
              </section>
              <section className="posui-transfer-slip-panel">
                <label className="posui-payment-modal__input-label" htmlFor="transfer-slip-upload">
                  {text.transferUploadSlipLabel}
                </label>
                <input
                  ref={transferSlipInputRef}
                  id="transfer-slip-upload"
                  className="posui-payment-modal__input"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={onTransferSlipFileChange}
                  disabled={transferSubmitting || transferSlipChecking}
                />
                {transferSlipPreviewUrl ? (
                  <div className="posui-transfer-slip-preview-wrap">
                    <p className="posui-transfer-section-title">{text.transferSlipPreview}</p>
                    <Image src={transferSlipPreviewUrl} alt="Transfer slip preview" className="posui-transfer-slip-preview" width={640} height={960} unoptimized />
                  </div>
                ) : null}
                <button
                  type="button"
                  className="posui-btn posui-btn--ghost"
                  onClick={() => void onVerifyTransferSlip()}
                  disabled={!transferSlipFile || transferSubmitting || transferSlipChecking}
                >
                  {transferSlipChecking ? text.transferSlipAnalyzing : text.transferSlipAnalyze}
                </button>
                {transferSlipChecks ? (
                  <div className={`posui-transfer-verify-banner ${transferSlipVerified ? "is-pass" : "is-fail"}`}>
                    {transferSlipVerified ? text.transferSlipVerifyPassed : text.transferSlipVerifyFailed}
                  </div>
                ) : null}
                {transferSlipParsed ? (
                  <div className="posui-transfer-slip-details">
                    <p><span>{text.transferSlipInfoPayer}</span><strong>{transferSlipParsed.payer_name ?? "-"}</strong></p>
                    <p><span>{text.transferSlipInfoPayee}</span><strong>{transferSlipParsed.payee_name ?? "-"}</strong></p>
                    <p><span>{text.transferSlipInfoDateTime}</span><strong>{transferSlipParsed.transfer_datetime ?? "-"}</strong></p>
                    <p><span>{text.transferSlipInfoTxn}</span><strong>{transferSlipParsed.transaction_id ?? "-"}</strong></p>
                    <p><span>{text.transferSlipInfoAmount}</span><strong>{transferSlipParsed.amount ?? "-"}</strong></p>
                    <p><span>{text.transferPayeeExpected}</span><strong>{expectedPayeeName || "-"}</strong></p>
                    {transferSlipParsed.confidence !== null ? (
                      <p><span>OCR confidence</span><strong>{Math.round((transferSlipParsed.confidence ?? 0) * 100)}%</strong></p>
                    ) : null}
                  </div>
                ) : null}
                {transferSlipChecks ? (
                  <div className="posui-transfer-check-grid">
                    <span className={transferSlipChecks.amount_match ? "is-pass" : "is-fail"}>{text.transferCheckAmount}: {transferSlipChecks.amount_match ? "OK" : "NO"}</span>
                    <span className={transferSlipChecks.payee_match ? "is-pass" : "is-fail"}>{text.transferCheckPayee}: {transferSlipChecks.payee_match ? "OK" : "NO"}</span>
                    <span className={transferSlipChecks.datetime_present ? "is-pass" : "is-fail"}>{text.transferCheckDateTime}: {transferSlipChecks.datetime_present ? "OK" : "NO"}</span>
                    <span className={transferSlipChecks.confidence_pass ? "is-pass" : "is-fail"}>{text.transferCheckConfidence}: {transferSlipChecks.confidence_pass ? "OK" : "NO"}</span>
                  </div>
                ) : null}
                {transferSlipIssues.length > 0 ? (
                  <ul className="posui-transfer-issues">
                    {transferSlipIssues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                ) : null}
                {quickMode === "dine_in" ? (
                  <div className="posui-transfer-history">
                    <p className="posui-transfer-history__title">{text.transferVerificationHistoryTitle}</p>
                    {transferVerificationHistory.length === 0 ? (
                      <p className="posui-transfer-history__empty">{text.transferVerificationHistoryEmpty}</p>
                    ) : (
                      <div className="posui-transfer-history__list">
                        {transferVerificationHistory.map((verification) => {
                          const tone = getTransferVerificationStatusTone(verification.verification_status);
                          const issues = normalizeTransferVerificationIssues(verification.issues);
                          const fallbackIssue = verification.error_message?.trim() ? [verification.error_message.trim()] : [];
                          const allIssues = issues.length > 0 ? issues : fallbackIssue;
                          const reference = verification.parsed_reference_no ?? verification.parsed_transaction_id ?? "-";
                          return (
                            <article key={verification.id} className="posui-transfer-history__item">
                              <p className="posui-transfer-history__meta"><span>{text.transferVerificationHistoryAt}</span><strong>{formatReceiptDateTime(verification.verified_at, lang)}</strong></p>
                              <p className="posui-transfer-history__meta"><span>{text.transferVerificationHistoryStatus}</span><strong className={`posui-transfer-history__status is-${tone}`}>{getTransferVerificationStatusLabel(verification.verification_status)}</strong></p>
                              <p className="posui-transfer-history__meta"><span>{text.transferVerificationHistoryExpectedAmount}</span><strong>{formatMoney(Number(verification.expected_amount ?? 0))}</strong></p>
                              <p className="posui-transfer-history__meta"><span>{text.transferVerificationHistoryParsedAmount}</span><strong>{verification.parsed_amount !== null ? formatMoney(Number(verification.parsed_amount)) : "-"}</strong></p>
                              <p className="posui-transfer-history__meta"><span>{text.transferVerificationHistoryReference}</span><strong>{reference}</strong></p>
                              {allIssues.length > 0 ? (
                                <div className="posui-transfer-history__issues">
                                  <span>{text.transferVerificationHistoryIssues}</span>
                                  <ul>
                                    {allIssues.map((issue) => (
                                      <li key={`${verification.id}-${issue}`}>{issue}</li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}
                {transferNeedsOverride ? (
                  <div className="posui-transfer-override-box">
                    <p>{text.transferOverrideNeedReason}</p>
                    <button type="button" className="posui-btn posui-btn--danger" onClick={onRequestTransferOverride} disabled={transferSubmitting || transferSlipChecking}>
                      {text.transferOverrideRequest}
                    </button>
                  </div>
                ) : null}
                <label className="posui-payment-modal__input-label" htmlFor="transfer-reference">{text.transferReferenceLabel}</label>
                <input
                  id="transfer-reference"
                  className="posui-payment-modal__input"
                  value={transferReference}
                  onChange={(event) => onTransferReferenceChange(event.target.value)}
                  placeholder={text.transferReferencePlaceholder}
                  disabled={transferSubmitting || transferSlipChecking}
                  autoComplete="off"
                />
              </section>
            </div>
            {transferSlipReverifyRequired ? <p className="posui-payment-modal__error">{text.transferSlipNeedVerify}</p> : null}
            {transferError ? <p className="posui-payment-modal__error">{transferError}</p> : null}
            <div className="posui-payment-modal__actions posui-payment-modal__actions--cash">
              <button type="button" className="posui-btn posui-btn--danger" onClick={() => onCancelFromTransfer(transferReviewOrder)} disabled={transferSubmitting || transferSlipChecking}>
                {text.cancelBill}
              </button>
              <button type="button" className="posui-btn posui-btn--primary" onClick={() => void onConfirmTransfer()} disabled={transferSubmitting || transferSlipChecking || !transferCanSubmit}>
                {transferSubmitting ? text.submitting : text.transferConfirm}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {receiptSession ? (
        <div className="posui-payment-modal-backdrop" role="dialog" aria-modal="true" aria-label={text.receiptTitle}>
          <section className="posui-payment-modal posui-payment-modal--receipt" onClick={(event) => event.stopPropagation()}>
            <header className="posui-payment-modal__header">
              <h3>{text.receiptTitle}</h3>
              <button type="button" className="posui-btn" onClick={onCloseReceipt}>
                {text.receiptClose}
              </button>
            </header>
            <article className="posui-receipt-card-preview" aria-label={text.receiptTitle}>
              <header className="posui-receipt-card-preview__head">
                <Image src={receiptLogoPath} alt="Receipt logo" className="posui-receipt-card-preview__logo" width={196} height={78} unoptimized />
                <h4>{receiptStoreName}</h4>
                {receiptStoreAddress ? <p>{receiptStoreAddress}</p> : null}
                {receiptStorePhone ? <p>{receiptStorePhone}</p> : null}
                <p>{receiptBranchLabel}</p>
              </header>
              <div className="posui-receipt-card-preview__divider" />
              <div className="posui-receipt-card-preview__meta">
                <p><span>{text.sellerName}</span><span>:</span><strong>{sellerName}</strong></p>
                <p><span>{text.shiftName}</span><span>:</span><strong>{shiftStatus ?? "-"}</strong></p>
                <p><span>{text.modeLabel}</span><span>:</span><strong>{getQuickModeLabel()}</strong></p>
                <p><span>{text.billNo}</span><span>:</span><strong>{receiptSession.order_no}</strong></p>
                {receiptSession.external_order_code ? (
                  <p><span>{text.externalCode}</span><span>:</span><strong>{receiptSession.external_order_code}</strong></p>
                ) : null}
                <p><span>{text.date}</span><span>:</span><strong>{formatReceiptDateTime(receiptSession.created_at, lang)}</strong></p>
              </div>
              <div className="posui-receipt-card-preview__divider" />
              <div className="posui-receipt-card-preview__items">
                <div className="posui-receipt-card-preview__items-head">
                  <span>{lang === "th" ? "รายการสินค้า" : "Item"}</span>
                  <span>{text.reviewQtyHeader ?? "Qty"}</span>
                  <span>{lang === "th" ? "ราคารวม" : "Total"}</span>
                </div>
                {receiptSession.items.map((item) => (
                  <div key={`receipt-${receiptSession.order_id}-${item.product_id}`} className="posui-receipt-card-preview__item">
                    <div className="posui-receipt-card-preview__item-main">
                      <strong>{item.name}</strong>
                      <small>x {formatMoney(item.price)}</small>
                    </div>
                    <span className="posui-receipt-card-preview__qty">{formatQuantity(item.quantity)}</span>
                    <strong className="posui-receipt-card-preview__item-total">{formatMoney(item.quantity * item.price)}</strong>
                  </div>
                ))}
              </div>
              <div className="posui-receipt-card-preview__divider" />
              <footer className="posui-receipt-card-preview__summary">
                <p><span>{text.paymentMethod}</span><strong>{getReceiptPaymentMethodLabel(receiptSession)}</strong></p>
                <p><span>{text.discount}</span><strong>{formatMoney(resolveReceiptDiscountAmount(receiptSession))}</strong></p>
                <p><span>{text.paymentTotalDue}</span><strong>{formatMoney(receiptSession.total_amount)}</strong></p>
                {receiptSession.payment_method === "cash" ? (
                  <>
                    <p><span>{text.cashReceivedLabel}</span><strong>{formatMoney(receiptSession.cash_received)}</strong></p>
                    <p><span>{text.cashChange}</span><strong>{formatMoney(receiptSession.change_amount)}</strong></p>
                  </>
                ) : null}
              </footer>
            </article>
            <div className="posui-payment-modal__actions posui-payment-modal__actions--cash">
              <button
                type="button"
                className="posui-btn posui-btn--primary"
                onClick={onPrintReceipt}
                disabled={receiptSaving}
              >
                {text.receiptPrint}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
