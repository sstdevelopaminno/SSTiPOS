"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type BranchRole = "owner" | "manager" | "staff" | "accountant";
type Lang = "th" | "en";

type Device = {
  id: string;
  device_code: string;
  device_name: string;
  status: string;
};

type PosUser = {
  user_id: string;
  role: BranchRole;
  full_name: string;
  email: string;
  is_active: boolean;
  device_scope: {
    scope_mode: "all_devices" | "single_device";
    device_id: string | null;
  };
};

type UsersResponse = {
  items: PosUser[];
  devices: Device[];
  metadata: {
    role: BranchRole;
    manager_scope_staff_only: boolean;
  };
};

type FormState = {
  user_id: string | null;
  full_name: string;
  email: string;
  role: BranchRole;
  is_active: boolean;
  scope_mode: "all_devices" | "single_device";
  device_id: string;
  pin: string;
};

const emptyForm: FormState = {
  user_id: null,
  full_name: "",
  email: "",
  role: "staff",
  is_active: true,
  scope_mode: "all_devices",
  device_id: "",
  pin: "",
};

const copy = {
  th: {
    title: "ผู้ใช้งาน POS",
    subtitle: "จัดการผู้ใช้งาน สิทธิ์สาขา PIN และขอบเขตเครื่องที่ใช้งานได้",
    refresh: "รีเฟรช",
    add: "เพิ่มผู้ใช้งาน",
    search: "ค้นหาชื่อหรืออีเมล",
    allRoles: "ทุกบทบาท",
    allStatus: "ทุกสถานะ",
    activeOnly: "เปิดใช้งาน",
    inactiveOnly: "ปิดใช้งาน",
    total: "ผู้ใช้งานทั้งหมด",
    active: "เปิดใช้งาน",
    manager: "ผู้จัดการ",
    staff: "พนักงาน",
    name: "ชื่อ",
    role: "บทบาท",
    status: "สถานะ",
    deviceScope: "ขอบเขตเครื่อง",
    actions: "จัดการ",
    edit: "แก้ไข",
    delete: "ลบ",
    save: "บันทึก",
    cancel: "ยกเลิก",
    close: "ปิด",
    pin: "PIN ใหม่",
    pinHint: "กรอกเมื่อต้องการตั้งหรือเปลี่ยน PIN",
    email: "อีเมล",
    fullName: "ชื่อผู้ใช้งาน",
    allDevices: "ทุกเครื่องในสาขา",
    specificDevice: "ระบุเครื่อง",
    chooseDevice: "เลือกเครื่อง",
    empty: "ยังไม่พบผู้ใช้งานตามเงื่อนไข",
    ownerNote: "เจ้าของร้านสามารถเพิ่ม แก้ไข และลบผู้ใช้งานได้",
    managerNote: "ผู้จัดการสามารถแก้ไขข้อมูลพนักงานได้ แต่ไม่สามารถเพิ่มหรือลบผู้ใช้งาน",
    confirmDelete: "ยืนยันลบผู้ใช้งานนี้ออกจากสาขา?",
    addTitle: "เพิ่มผู้ใช้งาน",
    editTitle: "แก้ไขผู้ใช้งาน",
    saved: "บันทึกข้อมูลเรียบร้อย",
    deleted: "ลบผู้ใช้งานเรียบร้อย",
    loadError: "โหลดข้อมูลผู้ใช้งานไม่สำเร็จ",
    saveError: "บันทึกข้อมูลไม่สำเร็จ",
    deleteError: "ลบผู้ใช้งานไม่สำเร็จ",
  },
  en: {
    title: "POS users",
    subtitle: "Manage branch users, roles, PINs, and device access.",
    refresh: "Refresh",
    add: "Add user",
    search: "Search name or email",
    allRoles: "All roles",
    allStatus: "All status",
    activeOnly: "Active",
    inactiveOnly: "Inactive",
    total: "Total users",
    active: "Active",
    manager: "Managers",
    staff: "Staff",
    name: "Name",
    role: "Role",
    status: "Status",
    deviceScope: "Device scope",
    actions: "Actions",
    edit: "Edit",
    delete: "Delete",
    save: "Save",
    cancel: "Cancel",
    close: "Close",
    pin: "New PIN",
    pinHint: "Fill only when setting or changing PIN.",
    email: "Email",
    fullName: "Full name",
    allDevices: "All branch devices",
    specificDevice: "Specific device",
    chooseDevice: "Choose device",
    empty: "No users match the current filters.",
    ownerNote: "Owners can add, edit, and delete users.",
    managerNote: "Managers can edit staff users, but cannot add or delete users.",
    confirmDelete: "Remove this user from the branch?",
    addTitle: "Add user",
    editTitle: "Edit user",
    saved: "User saved.",
    deleted: "User removed.",
    loadError: "Could not load users.",
    saveError: "Could not save user.",
    deleteError: "Could not delete user.",
  },
} satisfies Record<Lang, Record<string, string>>;

const roleLabels: Record<Lang, Record<BranchRole, string>> = {
  th: {
    owner: "เจ้าของร้าน",
    manager: "ผู้จัดการ",
    staff: "พนักงาน",
    accountant: "บัญชี",
  },
  en: {
    owner: "Owner",
    manager: "Manager",
    staff: "Staff",
    accountant: "Accountant",
  },
};

const roleTone: Record<BranchRole, string> = {
  owner: "border-blue-200 bg-blue-50 text-blue-700",
  manager: "border-emerald-200 bg-emerald-50 text-emerald-700",
  staff: "border-slate-200 bg-slate-50 text-slate-700",
  accountant: "border-violet-200 bg-violet-50 text-violet-700",
};

export function PosUsersModule({ lang }: { lang: Lang }) {
  const t = copy[lang];
  const [items, setItems] = useState<PosUser[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [metadata, setMetadata] = useState<UsersResponse["metadata"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | BranchRole>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [form, setForm] = useState<FormState | null>(null);

  const currentRole = metadata?.role ?? "staff";
  const canAddDelete = currentRole === "owner";
  const canEdit = currentRole === "owner" || currentRole === "manager";
  const canEditUser = useCallback(
    (item: PosUser) => canEdit && (currentRole === "owner" || item.role !== "owner"),
    [canEdit, currentRole]
  );

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/pos/users", { cache: "no-store" });
      const data = (await response.json()) as UsersResponse & { error?: string };
      if (!response.ok) {
        throw new Error(data.error || t.loadError);
      }
      setItems(data.items ?? []);
      setDevices(data.devices ?? []);
      setMetadata(data.metadata ?? null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t.loadError);
    } finally {
      setLoading(false);
    }
  }, [t.loadError]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const stats = useMemo(() => {
    return {
      total: items.length,
      active: items.filter((item) => item.is_active).length,
      managers: items.filter((item) => item.role === "manager").length,
      staff: items.filter((item) => item.role === "staff").length,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesQuery =
        !normalized ||
        item.full_name.toLowerCase().includes(normalized) ||
        item.email.toLowerCase().includes(normalized);
      const matchesRole = roleFilter === "all" || item.role === roleFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && item.is_active) ||
        (statusFilter === "inactive" && !item.is_active);
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [items, query, roleFilter, statusFilter]);

  function openAdd() {
    setForm(emptyForm);
    setNotice("");
    setError("");
  }

  function openEdit(item: PosUser) {
    setForm({
      user_id: item.user_id,
      full_name: item.full_name,
      email: item.email,
      role: item.role,
      is_active: item.is_active,
      scope_mode: item.device_scope.scope_mode,
      device_id: item.device_scope.device_id ?? "",
      pin: "",
    });
    setNotice("");
    setError("");
  }

  async function requestJson(url: string, init: RequestInit) {
    const response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      throw new Error(data.error || t.saveError);
    }
    return data;
  }

  async function saveForm() {
    if (!form) {
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      if (!form.user_id) {
        await requestJson("/api/pos/users", {
          method: "POST",
          body: JSON.stringify({
            full_name: form.full_name,
            email: form.email,
            role: form.role,
            pin: form.pin,
            is_active: form.is_active,
            scope_mode: form.scope_mode,
            device_id: form.scope_mode === "single_device" ? form.device_id : null,
          }),
        });
      } else {
        await requestJson("/api/pos/users", {
          method: "PATCH",
          body: JSON.stringify({
            action: "update_profile",
            user_id: form.user_id,
            full_name: form.full_name,
            email: form.email,
            role: form.role,
          }),
        });
        await requestJson("/api/pos/users", {
          method: "PATCH",
          body: JSON.stringify({
            action: "set_active",
            user_id: form.user_id,
            is_active: form.is_active,
          }),
        });
        await requestJson("/api/pos/users", {
          method: "PATCH",
          body: JSON.stringify({
            action: "set_device_scope",
            user_id: form.user_id,
            scope_mode: form.scope_mode,
            device_id: form.scope_mode === "single_device" ? form.device_id : null,
          }),
        });
        if (form.pin.trim()) {
          await requestJson("/api/pos/users", {
            method: "PATCH",
            body: JSON.stringify({
              action: "set_pin",
              user_id: form.user_id,
              pin: form.pin,
            }),
          });
        }
      }
      setNotice(t.saved);
      setForm(null);
      await loadUsers();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t.saveError);
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser(item: PosUser) {
    if (!window.confirm(t.confirmDelete)) {
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/pos/users?user_id=${encodeURIComponent(item.user_id)}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || t.deleteError);
      }
      setNotice(t.deleted);
      await loadUsers();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t.deleteError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="min-h-screen bg-slate-50 px-5 py-6 text-slate-950 lg:px-8">
      <div className="mx-auto max-w-[1440px] space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">SST iPOS</p>
            <h1 className="mt-1 text-2xl font-bold tracking-normal text-slate-950">{t.title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">{t.subtitle}</p>
            <p className="mt-3 inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {canAddDelete ? t.ownerNote : t.managerNote}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadUsers()}
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-blue-200 hover:text-blue-700 disabled:opacity-60"
              disabled={loading}
            >
              {t.refresh}
            </button>
            {canAddDelete ? (
              <button
                type="button"
                onClick={openAdd}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                + {t.add}
              </button>
            ) : null}
          </div>
        </header>

        <div className="grid gap-3 md:grid-cols-4">
          <StatCard label={t.total} value={stats.total} />
          <StatCard label={t.active} value={stats.active} />
          <StatCard label={t.manager} value={stats.managers} />
          <StatCard label={t.staff} value={stats.staff} />
        </div>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-3 border-b border-slate-200 p-4 lg:grid-cols-[1fr_180px_180px]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.search}
              className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as "all" | BranchRole)}
              className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">{t.allRoles}</option>
              {(["owner", "manager", "staff", "accountant"] as BranchRole[]).map((role) => (
                <option key={role} value={role}>
                  {roleLabels[lang][role]}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "inactive")}
              className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">{t.allStatus}</option>
              <option value="active">{t.activeOnly}</option>
              <option value="inactive">{t.inactiveOnly}</option>
            </select>
          </div>

          {error ? (
            <div className="mx-4 mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : null}
          {notice ? (
            <div className="mx-4 mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              {notice}
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">{t.name}</th>
                  <th className="px-4 py-3">{t.role}</th>
                  <th className="px-4 py-3">{t.status}</th>
                  <th className="px-4 py-3">{t.deviceScope}</th>
                  <th className="px-4 py-3 text-right">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-slate-500" colSpan={5}>
                      Loading...
                    </td>
                  </tr>
                ) : filteredItems.length ? (
                  filteredItems.map((item) => (
                    <tr key={item.user_id} className="bg-white hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 place-items-center rounded-md bg-slate-900 text-sm font-bold text-white">
                            {getInitials(item.full_name)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-950">{item.full_name}</div>
                            <div className="text-xs text-slate-500">{item.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${roleTone[item.role]}`}>
                          {roleLabels[lang][item.role]}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                            item.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {item.is_active ? t.activeOnly : t.inactiveOnly}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-700">
                        {item.device_scope.scope_mode === "all_devices"
                          ? t.allDevices
                          : devices.find((device) => device.id === item.device_scope.device_id)?.device_name ?? "-"}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          {canEditUser(item) ? (
                            <button
                              type="button"
                              onClick={() => openEdit(item)}
                              className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
                            >
                              {t.edit}
                            </button>
                          ) : null}
                          {canAddDelete ? (
                            <button
                              type="button"
                              onClick={() => void deleteUser(item)}
                              disabled={saving}
                              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-60"
                            >
                              {t.delete}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-12 text-center text-slate-500" colSpan={5}>
                      {t.empty}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {form ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-950">{form.user_id ? t.editTitle : t.addTitle}</h2>
                <p className="mt-1 text-sm text-slate-500">{canAddDelete ? t.ownerNote : t.managerNote}</p>
              </div>
              <button
                type="button"
                onClick={() => setForm(null)}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t.close}
              </button>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              <Field label={t.fullName}>
                <input
                  value={form.full_name}
                  onChange={(event) => setForm({ ...form, full_name: event.target.value })}
                  className="h-11 w-full rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </Field>
              <Field label={t.email}>
                <input
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  className="h-11 w-full rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </Field>
              <Field label={t.role}>
                <select
                  value={form.role}
                  onChange={(event) => setForm({ ...form, role: event.target.value as BranchRole })}
                  disabled={!canAddDelete}
                  className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                >
                  {(["owner", "manager", "staff", "accountant"] as BranchRole[]).map((role) => (
                    <option key={role} value={role}>
                      {roleLabels[lang][role]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t.status}>
                <label className="flex h-11 items-center gap-3 rounded-md border border-slate-200 px-3 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
                    className="h-4 w-4"
                  />
                  {form.is_active ? t.activeOnly : t.inactiveOnly}
                </label>
              </Field>
              <Field label={t.deviceScope}>
                <select
                  value={form.scope_mode}
                  onChange={(event) => setForm({ ...form, scope_mode: event.target.value as "all_devices" | "single_device" })}
                  className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="all_devices">{t.allDevices}</option>
                  <option value="single_device">{t.specificDevice}</option>
                </select>
              </Field>
              <Field label={t.chooseDevice}>
                <select
                  value={form.device_id}
                  onChange={(event) => setForm({ ...form, device_id: event.target.value })}
                  disabled={form.scope_mode !== "single_device"}
                  className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                >
                  <option value="">-</option>
                  {devices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.device_name || device.device_code}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t.pin}>
                <input
                  value={form.pin}
                  onChange={(event) => setForm({ ...form, pin: event.target.value })}
                  placeholder={t.pinHint}
                  className="h-11 w-full rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={() => setForm(null)}
                className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => void saveForm()}
                disabled={saving}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : t.save}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-950">{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");
  return initials.join("") || "U";
}
