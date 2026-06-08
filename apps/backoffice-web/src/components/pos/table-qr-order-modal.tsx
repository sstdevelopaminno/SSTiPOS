"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type QrData = {
  qr_session_id: string;
  table_session_id: string;
  table_id: string;
  table_code: string;
  table_name: string | null;
  order_url: string;
  qr_data_url: string;
  expires_at: string;
};

type ApiResponse = {
  data?: QrData;
  error?: { message?: string };
};

function buildPrintHtml(data: QrData) {
  const safeTable = data.table_code.replace(/[<>&"']/g, "");
  const safeUrl = data.order_url.replace(/[<>&"']/g, "");
  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>QR โต๊ะ ${safeTable}</title>
<style>
@page{size:58mm auto;margin:0}
*{box-sizing:border-box}
body{width:58mm;margin:0;padding:4mm 3mm;color:#000;background:#fff;font-family:Arial,"Noto Sans Thai",sans-serif;text-align:center}
h1{margin:0;font-size:16px}
p{margin:2mm 0;font-size:11px;line-height:1.35}
.line{border-top:1px dashed #000;margin:3mm 0}
.table{font-size:18px;font-weight:800}
img{display:block;width:46mm;height:46mm;object-fit:contain;margin:2mm auto}
.url{overflow-wrap:anywhere;font-size:7px}
.footer{font-size:12px;font-weight:800}
</style>
</head>
<body>
<h1>SST iPOS</h1>
<p>สแกน QR เพื่อสั่งอาหาร</p>
<div class="line"></div>
<p class="table">โต๊ะ ${safeTable}</p>
${data.table_name ? `<p>${data.table_name.replace(/[<>&"']/g, "")}</p>` : ""}
<div class="line"></div>
<img src="${data.qr_data_url}" alt="QR สั่งอาหารโต๊ะ ${safeTable}">
<p>กรุณาสแกน QR เพื่อเลือกเมนูอาหาร</p>
<p class="url">${safeUrl}</p>
<div class="line"></div>
<p class="footer">สแกนเพื่อสั่งอาหาร</p>
</body>
</html>`;
}

export function TableQrOrderModal({
  open,
  tableId,
  tableCode,
  onClose,
  onBusyChange
}: {
  open: boolean;
  tableId: string | null;
  tableCode: string | null;
  onClose: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [data, setData] = useState<QrData | null>(null);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !tableId) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setData(null);
    onBusyChange?.(true);
    void fetch(`/api/pos/tables/${tableId}/qr-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      signal: controller.signal
    })
      .then(async (response) => {
        const body = (await response.json()) as ApiResponse;
        if (!response.ok || !body.data) throw new Error(body.error?.message || "สร้าง QR ไม่สำเร็จ");
        setData(body.data);
      })
      .catch((loadError) => {
        if ((loadError as { name?: string }).name !== "AbortError") {
          setError(loadError instanceof Error ? loadError.message : "สร้าง QR ไม่สำเร็จ");
        }
      })
      .finally(() => {
        setLoading(false);
        onBusyChange?.(false);
      });
    return () => controller.abort();
  }, [onBusyChange, open, tableId]);

  if (!open) return null;

  async function printQr() {
    if (!data || printing) return;
    setPrinting(true);
    setError(null);
    const html = buildPrintHtml(data);
    const printWindow = window.open("", "_blank", "width=420,height=720");
    if (printWindow) {
      printWindow.document.write("<p style=\"font-family:Arial;padding:24px\">กำลังเตรียมพิมพ์ QR...</p>");
    }
    try {
      const response = await fetch("/api/pos/receipts/bluetooth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_no: `TABLE-${data.table_code}-QR`, receipt_html: html })
      });
      const body = (await response.json().catch(() => null)) as {
        data?: { ok?: boolean; data?: { fallback_to_browser_print?: boolean } };
      } | null;
      if (response.ok && body?.data?.ok === true && body.data.data?.fallback_to_browser_print !== true) {
        printWindow?.close();
        return;
      }
    } catch {
      // Browser print remains available when no Bluetooth bridge is configured.
    } finally {
      setPrinting(false);
    }

    if (!printWindow) {
      setError("เบราว์เซอร์ปิดกั้นหน้าพิมพ์ กรุณาอนุญาต Pop-up");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  }

  async function copyLink() {
    if (!data) return;
    await navigator.clipboard.writeText(data.order_url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="posui-modal-backdrop" role="presentation">
      <section className="posui-modal posui-table-qr-modal" role="dialog" aria-modal="true" aria-labelledby="table-qr-title">
        <header className="posui-modal__header">
          <div>
            <h2 id="table-qr-title">QR สแกนสั่งอาหาร</h2>
            <p>โต๊ะ {tableCode ?? "-"}</p>
          </div>
          <button type="button" className="posui-btn" onClick={onClose} disabled={loading || printing} aria-label="ปิดหน้าต่าง QR">
            ปิด
          </button>
        </header>

        <div className="posui-table-qr-modal__body">
          {loading ? (
            <div className="posui-table-qr-modal__state" role="status">
              <span className="table-loading-spinner" aria-hidden="true" />
              <strong>กำลังสร้างลิงก์ QR ของโต๊ะ...</strong>
            </div>
          ) : error && !data ? (
            <div className="posui-table-qr-modal__state is-error">
              <strong>สร้าง QR ไม่สำเร็จ</strong>
              <p>{error}</p>
            </div>
          ) : data ? (
            <>
              <div className="posui-table-qr-ticket">
                <strong>SST iPOS</strong>
                <span>สแกน QR เพื่อสั่งอาหาร</span>
                <hr />
                <b>โต๊ะ {data.table_code}</b>
                <Image
                  src={data.qr_data_url}
                  alt={`QR สั่งอาหารสำหรับโต๊ะ ${data.table_code}`}
                  width={250}
                  height={250}
                  unoptimized
                />
                <span>สแกนเพื่อเลือกเมนูอาหาร</span>
              </div>
              <p className="posui-table-qr-modal__expiry">
                ลิงก์จะหมดอายุเมื่อชำระเงินหรือปิดบิลโต๊ะ
              </p>
              {error ? <p className="posui-table-qr-modal__error">{error}</p> : null}
              <div className="posui-table-qr-modal__actions">
                <button type="button" className="posui-btn" onClick={copyLink}>{copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}</button>
                <button type="button" className="posui-btn posui-btn--primary" onClick={printQr} disabled={printing}>
                  {printing ? "กำลังพิมพ์..." : "พิมพ์ QR 58mm"}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}
