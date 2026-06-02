"use client";

import { useEffect, useMemo, useState } from "react";

type Lang = "th" | "en";

type UsersPayload = {
  data?: {
    items: Array<{
      user_id: string;
      role: "owner" | "manager" | "staff" | "accountant";
      full_name: string | null;
      email: string | null;
      is_active: boolean;
      device_scope: { scope_mode: "all_devices" | "single_device"; device_id: string | null };
    }>;
    devices: Array<{ id: string; device_code: string; device_name: string; status: string }>;
    metadata: { role: string; manager_scope_staff_only: boolean };
  } | null;
  error?: { code?: string; message?: string } | null;
};

function roleLabel(role: string, lang: Lang) {
  if (lang === "en") {
    if (role === "owner") return "Owner";
    if (role === "manager") return "Manager";
    if (role === "accountant") return "Accountant";
    return "Staff";
  }
  if (role === "owner") return "เจ้าของร้าน";
  if (role === "manager") return "ผู้จัดการ";
  if (role === "accountant") return "บัญชี";
  return "พนักงาน";
}

export function PosUsersModule({ lang }: { lang: Lang }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState<NonNullable<UsersPayload["data"]>["items"]>([]);
  const [devices, setDevices] = useState<NonNullable<UsersPayload["data"]>["devices"]>([]);
  const [scopeByUser, setScopeByUser] = useState<Record<string, { scope_mode: "all_devices" | "single_device"; device_id: string | null }>>({});
  const [actingUserId, setActingUserId] = useState<string | null>(null);
  const [pinByUser, setPinByUser] = useState<Record<string, string>>({});
  const [metaRole, setMetaRole] = useState<string>("staff");

  const copy = useMemo(
    () =>
      lang === "th"
        ? {
            title: "ผู้ใช้งาน POS",
            desc: "ตั้งค่าสิทธิ์พนักงานในสาขา, เปิด/ปิดผู้ใช้งาน, รีเซ็ตรหัส PIN และผูกเครื่องที่ใช้งานได้",
            reload: "รีเฟรช",
            noData: "ไม่พบผู้ใช้งานในสาขานี้",
            fullName: "ชื่อ",
            role: "บทบาท",
            active: "ใช้งาน",
            deviceScope: "ขอบเขตเครื่อง",
            allowedDevice: "เครื่องที่อนุญาต",
            pin: "PIN ใหม่",
            setPin: "บันทึก PIN",
            saveScope: "บันทึกขอบเขต",
            allDevices: "ทุกเครื่องในสาขา",
            singleDevice: "เครื่องเดียว",
            statusOn: "เปิด",
            statusOff: "ปิด",
            busy: "กำลังบันทึก...",
            invalidPin: "PIN ต้องเป็นตัวเลข 4-12 หลัก"
          }
        : {
            title: "POS Users",
            desc: "Manage branch staff access, active state, PIN reset, and allowed cashier device scope.",
            reload: "Reload",
            noData: "No users found in this branch.",
            fullName: "Name",
            role: "Role",
            active: "Active",
            deviceScope: "Device scope",
            allowedDevice: "Allowed device",
            pin: "New PIN",
            setPin: "Save PIN",
            saveScope: "Save scope",
            allDevices: "All devices in branch",
            singleDevice: "Single device",
            statusOn: "On",
            statusOff: "Off",
            busy: "Saving...",
            invalidPin: "PIN must be 4-12 digits."
          },
    [lang]
  );

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/pos/users", { cache: "no-store" });
      const body = (await response.json().catch(() => null)) as UsersPayload | null;
      if (!response.ok || !body?.data) {
        throw new Error(body?.error?.message ?? "Cannot load POS users.");
      }
      setItems(body.data.items);
      setDevices(body.data.devices.filter((item) => item.status === "active"));
      setScopeByUser(
        body.data.items.reduce<Record<string, { scope_mode: "all_devices" | "single_device"; device_id: string | null }>>((acc, item) => {
          acc[item.user_id] = {
            scope_mode: item.device_scope.scope_mode ?? "all_devices",
            device_id: item.device_scope.device_id ?? null
          };
          return acc;
        }, {})
      );
      setMetaRole(body.data.metadata.role);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unknown error.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function patch(body: Record<string, unknown>) {
    const response = await fetch("/api/pos/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = (await response.json().catch(() => null)) as { error?: { message?: string } | null } | null;
    if (!response.ok) {
      throw new Error(payload?.error?.message ?? "Update failed.");
    }
  }

  async function savePin(userId: string) {
    const pin = String(pinByUser[userId] ?? "").trim();
    if (!/^\d{4,12}$/.test(pin)) {
      setError(copy.invalidPin);
      return;
    }
    setActingUserId(userId);
    setError("");
    try {
      await patch({ action: "set_pin", user_id: userId, pin });
      setPinByUser((prev) => ({ ...prev, [userId]: "" }));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Update failed.");
    } finally {
      setActingUserId(null);
    }
  }

  async function toggleActive(userId: string, nextActive: boolean) {
    setActingUserId(userId);
    setError("");
    try {
      await patch({ action: "set_active", user_id: userId, is_active: nextActive });
      setItems((prev) => prev.map((item) => (item.user_id === userId ? { ...item, is_active: nextActive } : item)));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Update failed.");
    } finally {
      setActingUserId(null);
    }
  }

  async function saveScope(userId: string, scopeMode: "all_devices" | "single_device", deviceId: string | null) {
    setActingUserId(userId);
    setError("");
    try {
      await patch({
        action: "set_device_scope",
        user_id: userId,
        scope_mode: scopeMode,
        device_id: scopeMode === "single_device" ? deviceId : null
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Update failed.");
    } finally {
      setActingUserId(null);
    }
  }

  return (
    <section className="surface" style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>{copy.title}</h2>
          <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>{copy.desc}</p>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 12 }}>Role: {roleLabel(metaRole, lang)}</p>
        </div>
        <button type="button" onClick={() => void load()} style={{ minHeight: 38 }}>
          {copy.reload}
        </button>
      </div>

      {loading ? <p style={{ margin: 0 }}>{copy.busy}</p> : null}
      {error ? (
        <p role="alert" style={{ margin: 0, color: "#b91c1c", fontWeight: 700 }}>
          {error}
        </p>
      ) : null}

      {!loading && items.length === 0 ? <p style={{ margin: 0, color: "var(--muted)" }}>{copy.noData}</p> : null}

      {!loading && items.length > 0 ? (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid var(--border)", padding: 8 }}>{copy.fullName}</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid var(--border)", padding: 8 }}>{copy.role}</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid var(--border)", padding: 8 }}>{copy.active}</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid var(--border)", padding: 8 }}>{copy.deviceScope}</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid var(--border)", padding: 8 }}>{copy.allowedDevice}</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid var(--border)", padding: 8 }}>{copy.pin}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const busy = actingUserId === item.user_id;
                const scope = scopeByUser[item.user_id] ?? {
                  scope_mode: item.device_scope.scope_mode ?? "all_devices",
                  device_id: item.device_scope.device_id ?? null
                };
                const scopeMode = scope.scope_mode;
                const deviceId = scope.device_id ?? "";

                return (
                  <tr key={item.user_id}>
                    <td style={{ padding: 8, borderBottom: "1px solid var(--border)" }}>
                      <div>{item.full_name ?? item.email ?? item.user_id}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{item.email ?? "-"}</div>
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid var(--border)" }}>{roleLabel(item.role, lang)}</td>
                    <td style={{ padding: 8, borderBottom: "1px solid var(--border)" }}>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <input type="checkbox" checked={item.is_active} disabled={busy} onChange={(event) => void toggleActive(item.user_id, event.target.checked)} />
                        <span>{item.is_active ? copy.statusOn : copy.statusOff}</span>
                      </label>
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid var(--border)" }}>
                      <select
                        value={scopeMode}
                        disabled={busy}
                        onChange={(event) =>
                          setScopeByUser((prev) => ({
                            ...prev,
                            [item.user_id]: {
                              scope_mode: event.target.value as "all_devices" | "single_device",
                              device_id: event.target.value === "single_device" ? prev[item.user_id]?.device_id ?? null : null
                            }
                          }))
                        }
                        style={{ minHeight: 36 }}
                      >
                        <option value="all_devices">{copy.allDevices}</option>
                        <option value="single_device">{copy.singleDevice}</option>
                      </select>
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <select
                          value={deviceId}
                          disabled={busy || scopeMode === "all_devices"}
                          onChange={(event) =>
                            setScopeByUser((prev) => ({
                              ...prev,
                              [item.user_id]: {
                                scope_mode: scopeMode,
                                device_id: event.target.value || null
                              }
                            }))
                          }
                          style={{ minHeight: 36 }}
                        >
                          <option value="">-</option>
                          {devices.map((device) => (
                            <option key={device.id} value={device.id}>
                              {device.device_code} - {device.device_name}
                            </option>
                          ))}
                        </select>
                        <button type="button" disabled={busy} onClick={() => void saveScope(item.user_id, scopeMode, deviceId || null)} style={{ minHeight: 36 }}>
                          {copy.saveScope}
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          value={pinByUser[item.user_id] ?? ""}
                          onChange={(event) => setPinByUser((prev) => ({ ...prev, [item.user_id]: event.target.value.replace(/\D/g, "").slice(0, 12) }))}
                          placeholder="1234"
                          inputMode="numeric"
                          disabled={busy}
                          style={{ minHeight: 36, padding: "0 10px" }}
                        />
                        <button type="button" disabled={busy} onClick={() => void savePin(item.user_id)} style={{ minHeight: 36 }}>
                          {copy.setPin}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
