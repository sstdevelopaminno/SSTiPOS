"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./table-order-mobile.module.css";

type MenuProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
};

type MenuResponse = {
  data?: {
    store_name: string;
    branch_name: string;
    table_code: string;
    table_name: string | null;
    expires_at: string;
    categories: string[];
    products: MenuProduct[];
  };
  error?: { message?: string };
};

type SubmitResponse = {
  data?: {
    submission_id: string;
    order_no?: string;
    table_code: string;
    grand_total?: number;
    action?: "call_staff" | "request_checkout";
  };
  error?: { message?: string };
};

type ServiceRequestAction = "call_staff" | "request_checkout";

function money(value: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(value);
}

function productMark(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "M";
}

export function TableOrderMobile({ token }: { token: string }) {
  const [menu, setMenu] = useState<MenuResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("ทั้งหมด");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serviceSubmitting, setServiceSubmitting] = useState<ServiceRequestAction | null>(null);
  const [successOrderNo, setSuccessOrderNo] = useState<string | null>(null);
  const [serviceMessage, setServiceMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/table-order/${encodeURIComponent(token)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as MenuResponse;
        if (!response.ok || !body.data) throw new Error(body.error?.message || "ไม่สามารถโหลดเมนูได้");
        setMenu(body.data);
        setError(null);
      })
      .catch((loadError) => {
        if ((loadError as { name?: string }).name !== "AbortError") {
          setError(loadError instanceof Error ? loadError.message : "ไม่สามารถโหลดเมนูได้");
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [token]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return (menu?.products ?? []).filter((product) => {
      const matchesCategory = activeCategory === "ทั้งหมด" || product.category === activeCategory;
      const matchesSearch = !normalizedSearch || product.name.toLowerCase().includes(normalizedSearch);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, menu?.products, search]);

  const cartItems = useMemo(
    () =>
      (menu?.products ?? [])
        .map((product) => ({ ...product, quantity: cart[product.id] ?? 0 }))
        .filter((product) => product.quantity > 0),
    [cart, menu?.products]
  );
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce((sum, item) => sum + item.quantity * item.price, 0);

  function changeQuantity(productId: string, delta: number) {
    if (submitting || serviceSubmitting) return;
    setCart((current) => {
      const nextQuantity = Math.max(0, Math.min(99, (current[productId] ?? 0) + delta));
      const next = { ...current };
      if (nextQuantity === 0) delete next[productId];
      else next[productId] = nextQuantity;
      return next;
    });
  }

  function removeItem(productId: string) {
    if (submitting || serviceSubmitting) return;
    setCart((current) => {
      const next = { ...current };
      delete next[productId];
      return next;
    });
  }

  async function submitOrder() {
    if (!menu || cartItems.length === 0 || submitting || serviceSubmitting) return;
    setSubmitting(true);
    setError(null);
    setServiceMessage(null);
    const requestId = crypto.randomUUID();
    try {
      const response = await fetch(`/api/table-order/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-idempotency-key": requestId },
        body: JSON.stringify({
          action: "order",
          request_id: requestId,
          note: null,
          items: cartItems.map((item) => ({ product_id: item.id, quantity: item.quantity }))
        })
      });
      const body = (await response.json()) as SubmitResponse;
      if (!response.ok || !body.data) throw new Error(body.error?.message || "ส่งรายการไม่สำเร็จ");
      setSuccessOrderNo(body.data.order_no ?? "-");
      setCart({});
      setCartOpen(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "ส่งรายการไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitServiceRequest(action: ServiceRequestAction) {
    if (!menu || submitting || serviceSubmitting) return;
    setServiceSubmitting(action);
    setError(null);
    setServiceMessage(null);
    const requestId = crypto.randomUUID();
    try {
      const response = await fetch(`/api/table-order/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-idempotency-key": requestId },
        body: JSON.stringify({
          action,
          request_id: requestId,
          note: null
        })
      });
      const body = (await response.json()) as SubmitResponse;
      if (!response.ok || !body.data) throw new Error(body.error?.message || "ส่งคำขอไม่สำเร็จ");
      setServiceMessage(action === "call_staff" ? "เรียกพนักงานแล้ว กรุณารอสักครู่" : "แจ้งต้องการชำระบิลแล้ว");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "ส่งคำขอไม่สำเร็จ");
    } finally {
      setServiceSubmitting(null);
    }
  }

  if (loading) {
    return (
      <main className={styles.statePage}>
        <span className={styles.spinner} />
        <p>กำลังเปิดเมนูของโต๊ะ...</p>
      </main>
    );
  }

  if (!menu) {
    return (
      <main className={styles.statePage}>
        <strong>ไม่สามารถสั่งอาหารผ่านลิงก์นี้ได้</strong>
        <p>{error || "QR อาจหมดอายุหรือโต๊ะปิดบิลแล้ว กรุณาติดต่อพนักงาน"}</p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.brand}>{menu.store_name}</p>
          <h1>สั่งอาหารที่โต๊ะ {menu.table_code}</h1>
          <p>{menu.branch_name}{menu.table_name ? ` · ${menu.table_name}` : ""}</p>
        </div>
        <span className={styles.tableBadge}>{menu.table_code}</span>
      </header>

      <section className={styles.controls}>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ค้นหาเมนู"
          aria-label="ค้นหาเมนูอาหาร"
        />
        <nav className={styles.categories} aria-label="ประเภทอาหาร">
          {["ทั้งหมด", ...menu.categories].map((category) => (
            <button
              key={category}
              type="button"
              className={activeCategory === category ? styles.activeCategory : ""}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </nav>
      </section>

      {error ? <div className={styles.alert}>{error}</div> : null}
      {successOrderNo ? (
        <div className={styles.success}>
          <strong>ส่งรายการเข้าครัวแล้ว</strong>
          <span>เลขบิล {successOrderNo}</span>
          <button type="button" onClick={() => setSuccessOrderNo(null)}>สั่งเพิ่ม</button>
        </div>
      ) : null}
      {serviceMessage ? (
        <div className={styles.success}>
          <strong>{serviceMessage}</strong>
          <span>โต๊ะ {menu.table_code}</span>
        </div>
      ) : null}

      <section className={styles.menuGrid} aria-label="รายการอาหาร">
        {filteredProducts.map((product, index) => {
          const quantity = cart[product.id] ?? 0;
          return (
            <article className={styles.productCard} key={product.id}>
              <button
                type="button"
                className={styles.productPickButton}
                onClick={() => changeQuantity(product.id, 1)}
                disabled={submitting || Boolean(serviceSubmitting)}
                aria-label={`เพิ่ม ${product.name} ลงตะกร้า`}
              >
                <div className={`${styles.productVisual} ${styles[`tone${index % 5}`]}`}>
                  <span>{productMark(product.name)}</span>
                </div>
                <div className={styles.productBody}>
                  <p className={styles.productCategory}>{product.category}</p>
                  <h2>{product.name}</h2>
                  <strong>{money(product.price)}</strong>
                </div>
              </button>
              <div className={styles.productActions}>
                <div className={styles.stepper}>
                  <button type="button" aria-label={`ลดจำนวน ${product.name}`} onClick={() => changeQuantity(product.id, -1)} disabled={quantity === 0}>−</button>
                  <span>{quantity}</span>
                  <button type="button" aria-label={`เพิ่มจำนวน ${product.name}`} onClick={() => changeQuantity(product.id, 1)} disabled={submitting || Boolean(serviceSubmitting)}>+</button>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {filteredProducts.length === 0 ? <p className={styles.empty}>ไม่พบเมนูที่ค้นหา</p> : null}

      <section className={styles.cartSheet} aria-label="ตะกร้าสั่งอาหาร">
        <div className={styles.cartSummary}>
          <span>{cartCount} รายการในตะกร้า</span>
          <strong>ยอดชำระ {money(cartTotal)}</strong>
        </div>
        <div className={styles.serviceActions}>
          <button type="button" onClick={() => submitServiceRequest("call_staff")} disabled={submitting || Boolean(serviceSubmitting)}>
            {serviceSubmitting === "call_staff" ? "กำลังเรียก..." : "เรียกพนักงาน"}
          </button>
          <button type="button" onClick={() => submitServiceRequest("request_checkout")} disabled={submitting || Boolean(serviceSubmitting)}>
            {serviceSubmitting === "request_checkout" ? "กำลังแจ้ง..." : "ต้องการชำระบิล"}
          </button>
        </div>
        <button
          type="button"
          className={styles.cartOpenButton}
          onClick={() => setCartOpen(true)}
          disabled={cartCount === 0 || submitting || Boolean(serviceSubmitting)}
        >
          ดูรายการตะกร้า ({cartCount})
        </button>
        <button type="button" className={styles.submitButton} onClick={submitOrder} disabled={submitting || cartCount === 0}>
          {submitting ? "กำลังส่งรายการ..." : "ยืนยันสั่งอาหาร"}
        </button>
      </section>

      {cartOpen ? (
        <div className={styles.cartModalBackdrop} role="presentation" onMouseDown={() => setCartOpen(false)}>
          <section
            className={styles.cartModal}
            role="dialog"
            aria-modal="true"
            aria-label="รายการในตะกร้า"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className={styles.cartModalHead}>
              <div>
                <strong>รายการในตะกร้า</strong>
                <span>{cartCount} รายการ</span>
              </div>
              <button type="button" onClick={() => setCartOpen(false)} aria-label="ปิดรายการตะกร้า">×</button>
            </header>
            <div className={styles.cartRows}>
              {cartItems.map((item) => (
                <article className={styles.cartRow} key={item.id}>
                  <div className={styles.cartRowMeta}>
                    <strong>{item.name}</strong>
                    <span>{money(item.price * item.quantity)}</span>
                  </div>
                  <div className={styles.cartRowControls}>
                    <div className={styles.stepper}>
                      <button type="button" onClick={() => changeQuantity(item.id, -1)} aria-label={`ลดจำนวน ${item.name}`}>−</button>
                      <span>{item.quantity}</span>
                      <button type="button" onClick={() => changeQuantity(item.id, 1)} aria-label={`เพิ่มจำนวน ${item.name}`}>+</button>
                    </div>
                    <button type="button" className={styles.deleteItemButton} onClick={() => removeItem(item.id)}>
                      ลบ
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <footer className={styles.cartModalFooter}>
              <span>ยอดชำระ</span>
              <strong>{money(cartTotal)}</strong>
              <button type="button" onClick={() => setCartOpen(false)}>เลือกเมนูต่อ</button>
            </footer>
          </section>
        </div>
      ) : null}

      {submitting ? (
        <div className={styles.processing} role="status" aria-live="polite">
          <div>
            <span className={styles.spinner} />
            <strong>กำลังส่งรายการเข้าระบบ POS</strong>
            <p>กรุณาอย่าปิดหน้านี้</p>
          </div>
        </div>
      ) : null}
      {serviceSubmitting ? (
        <div className={styles.processing} role="status" aria-live="polite">
          <div>
            <span className={styles.spinner} />
            <strong>{serviceSubmitting === "call_staff" ? "กำลังเรียกพนักงาน" : "กำลังแจ้งต้องการชำระบิล"}</strong>
            <p>กรุณารอสักครู่</p>
          </div>
        </div>
      ) : null}
    </main>
  );
}
