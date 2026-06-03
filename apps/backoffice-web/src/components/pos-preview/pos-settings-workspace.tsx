"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type {
  BranchSettings,
  PaymentAccountSettings,
  PosSettingsSnapshot,
  StoreSettings
} from "@/lib/services/pos-settings-service";
import type { Language } from "@/lib/i18n";

type SettingsView = "menu" | "store" | "branches" | "payments";
type MenuIconName = "store" | "branch" | "payment" | "users" | "display" | "back" | "edit" | "trash" | "plus";

type StoreForm = {
  display_name: string;
  logo_url: string;
  company_address: string;
  contact_phone: string;
};

type BranchForm = {
  id: string;
  code: string;
  name: string;
  address: string;
  is_active: boolean;
};

type PaymentForm = {
  id: string;
  branch_id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  promptpay_phone: string;
  qr_image_url: string;
  is_active: boolean;
};

const emptyBranchForm: BranchForm = {
  id: "",
  code: "",
  name: "",
  address: "",
  is_active: true
};

const emptyPaymentForm: PaymentForm = {
  id: "",
  branch_id: "",
  bank_name: "",
  account_name: "",
  account_number: "",
  promptpay_phone: "",
  qr_image_url: "",
  is_active: true
};

const TEXT = {
  th: {
    title: "ตั้งค่า",
    subtitle: "จัดการข้อมูลร้าน สาขา บัญชีชำระเงิน ผู้ใช้งาน และจอลูกค้า",
    back: "ย้อนกลับ",
    store: "ข้อมูลร้านค้า/บริษัท",
    storeDesc: "รหัสร้าน ชื่อที่แสดง โลโก้ ที่อยู่ และเบอร์ติดต่อ",
    branches: "เพิ่มสาขา",
    branchesDesc: "รายการสาขาที่เปิดใช้งาน เพิ่ม แก้ไข และลบสาขา",
    payments: "ตั้งค่าชำระเงิน",
    paymentsDesc: "บัญชีธนาคาร พร้อมเพย์ QR และสถานะใช้งาน",
    users: "ผู้ใช้งาน",
    usersDesc: "จัดการพนักงาน สิทธิ์ และ PIN",
    display: "จอลูกค้า",
    displayDesc: "ตั้งค่าหน้าจอลูกค้าและการแสดงผล",
    edit: "แก้ไข",
    save: "บันทึก",
    cancel: "ยกเลิก",
    add: "เพิ่ม",
    delete: "ลบ",
    active: "ใช้งาน",
    inactive: "ปิดใช้งาน",
    storeCode: "รหัสร้าน",
    displayName: "การแสดงชื่อร้าน",
    logoUrl: "โลโก้ร้าน",
    address: "ที่อยู่",
    phone: "เบอร์ติดต่อ",
    branchCode: "รหัสสาขา",
    branchName: "ชื่อสาขา",
    bankName: "ชื่อธนาคาร",
    accountName: "ชื่อบัญชี",
    accountNo: "เลขบัญชี",
    promptpay: "เบอร์พร้อมเพย์",
    qrImage: "ภาพ QR",
    branch: "สาขา",
    qrPayload: "PromptPay payload",
    schemaMissing: "ยังไม่ได้รัน migration สำหรับบัญชีชำระเงิน",
    saved: "บันทึกเรียบร้อย",
    failed: "ทำรายการไม่สำเร็จ"
  },
  en: {
    title: "Settings",
    subtitle: "Manage store profile, branches, payment accounts, users, and customer display",
    back: "Back",
    store: "Store / Company",
    storeDesc: "Store code, display name, logo, address, and contact phone",
    branches: "Branches",
    branchesDesc: "Open branches, add, edit, and delete",
    payments: "Payment Settings",
    paymentsDesc: "Bank accounts, PromptPay, QR, and active status",
    users: "Users",
    usersDesc: "Manage staff, permissions, and PIN",
    display: "Customer Display",
    displayDesc: "Configure customer-facing display",
    edit: "Edit",
    save: "Save",
    cancel: "Cancel",
    add: "Add",
    delete: "Delete",
    active: "Active",
    inactive: "Inactive",
    storeCode: "Store code",
    displayName: "Display name",
    logoUrl: "Logo",
    address: "Address",
    phone: "Contact phone",
    branchCode: "Branch code",
    branchName: "Branch name",
    bankName: "Bank name",
    accountName: "Account name",
    accountNo: "Account number",
    promptpay: "PromptPay phone",
    qrImage: "QR image",
    branch: "Branch",
    qrPayload: "PromptPay payload",
    schemaMissing: "Payment account migration has not been applied yet",
    saved: "Saved",
    failed: "Request failed"
  }
} as const;

type Labels = Record<keyof typeof TEXT.th, string>;

function Icon({ name }: { name: MenuIconName }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
  };
  if (name === "back") {
    return (
      <svg {...common}>
        <path d="M19 12H5" />
        <path d="M12 19l-7-7 7-7" />
      </svg>
    );
  }
  if (name === "branch") {
    return (
      <svg {...common}>
        <path d="M6 21V9" />
        <path d="M18 21V9" />
        <path d="M3 21h18" />
        <path d="M4 9l8-6 8 6" />
        <path d="M9 21v-6h6v6" />
      </svg>
    );
  }
  if (name === "payment") {
    return (
      <svg {...common}>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 10h18" />
        <path d="M7 15h3" />
      </svg>
    );
  }
  if (name === "users") {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20c0-3.5 2.7-6 6-6" />
        <circle cx="17" cy="10" r="2.5" />
        <path d="M13 20c.5-2.8 2.6-4.5 5-4.5" />
      </svg>
    );
  }
  if (name === "display") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="12" rx="2" />
        <path d="M8 21h8" />
        <path d="M12 17v4" />
      </svg>
    );
  }
  if (name === "edit") {
    return (
      <svg {...common}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    );
  }
  if (name === "trash") {
    return (
      <svg {...common}>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M6 6l1 16h10l1-16" />
      </svg>
    );
  }
  if (name === "plus") {
    return (
      <svg {...common}>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6 10v10h12V10" />
      <path d="M10 20v-6h4v6" />
    </svg>
  );
}

function storeToForm(store: StoreSettings | null): StoreForm {
  return {
    display_name: store?.display_name ?? store?.name ?? "",
    logo_url: store?.logo_url ?? "",
    company_address: store?.company_address ?? "",
    contact_phone: store?.contact_phone ?? ""
  };
}

function branchToForm(branch: BranchSettings): BranchForm {
  return {
    id: branch.id,
    code: branch.code,
    name: branch.name,
    address: branch.address,
    is_active: branch.is_active
  };
}

function paymentToForm(account: PaymentAccountSettings): PaymentForm {
  return {
    id: account.id,
    branch_id: account.branch_id,
    bank_name: account.bank_name,
    account_name: account.account_name,
    account_number: account.account_number,
    promptpay_phone: account.promptpay_phone,
    qr_image_url: account.qr_image_url,
    is_active: account.is_active
  };
}

function buildPromptPayPayload(phone: string) {
  const digits = phone.replace(/[^\d]/g, "");
  return digits ? `promptpay://phone/${digits}` : "";
}

async function readApiData<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as { data?: T; error?: { message?: string } | null };
  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message ?? "Request failed.");
  }
  return payload.data as T;
}

function Field({
  label,
  value,
  onChange,
  disabled,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <label className="grid gap-1.5 text-[13px] font-semibold text-slate-700">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  disabled
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="grid gap-1.5 text-[13px] font-semibold text-slate-700">
      <span>{label}</span>
      <textarea
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="min-h-24 resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
      />
    </label>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  variant = "primary",
  type = "button"
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "plain" | "danger";
  type?: "button" | "submit";
}) {
  const className =
    variant === "danger"
      ? "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
      : variant === "plain"
        ? "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
        : "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60";
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  );
}

function StatusPill({ active, labels }: { active: boolean; labels: Labels }) {
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-bold ${
        active ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
      }`}
    >
      {active ? labels.active : labels.inactive}
    </span>
  );
}

function MenuButton({
  icon,
  title,
  desc,
  onClick
}: {
  icon: MenuIconName;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group grid min-h-[92px] grid-cols-[42px_1fr_24px] items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/50"
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 group-hover:bg-blue-100 group-hover:text-blue-700">
        <Icon name={icon} />
      </span>
      <span className="min-w-0">
        <span className="block text-base font-black text-slate-950">{title}</span>
        <span className="mt-1 block text-sm font-medium leading-5 text-slate-500">{desc}</span>
      </span>
      <span className="text-slate-400">›</span>
    </button>
  );
}

function MenuLink({ icon, title, desc, href }: { icon: MenuIconName; title: string; desc: string; href: string }) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="group grid min-h-[92px] grid-cols-[42px_1fr_24px] items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/50"
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 group-hover:bg-blue-100 group-hover:text-blue-700">
        <Icon name={icon} />
      </span>
      <span className="min-w-0">
        <span className="block text-base font-black text-slate-950">{title}</span>
        <span className="mt-1 block text-sm font-medium leading-5 text-slate-500">{desc}</span>
      </span>
      <span className="text-slate-400">›</span>
    </Link>
  );
}

function PanelHeader({
  title,
  onBack,
  labels
}: {
  title: string;
  onBack: () => void;
  labels: Labels;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
          title={labels.back}
          aria-label={labels.back}
        >
          <Icon name="back" />
        </button>
        <h2 className="text-xl font-black text-slate-950">{title}</h2>
      </div>
    </div>
  );
}

function StorePanel({
  labels,
  store,
  setStore,
  onBack,
  canManage,
  reportStatus
}: {
  labels: Labels;
  store: StoreSettings | null;
  setStore: (store: StoreSettings | null) => void;
  onBack: () => void;
  canManage: boolean;
  reportStatus: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<StoreForm>(() => storeToForm(store));
  const [isSaving, setIsSaving] = useState(false);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    void (async () => {
      try {
        const data = await readApiData<{ store: StoreSettings | null }>(
          await fetch("/api/pos/settings/store", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form)
          })
        );
        setStore(data.store);
        setForm(storeToForm(data.store));
        setEditing(false);
        reportStatus(labels.saved);
      } catch (error) {
        reportStatus(error instanceof Error ? error.message : labels.failed);
      } finally {
        setIsSaving(false);
      }
    })();
  }

  return (
    <section>
      <PanelHeader title={labels.store} onBack={onBack} labels={labels} />
      <form onSubmit={save} className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-500">{store?.name || form.display_name || "-"}</p>
            <p className="mt-1 text-sm font-medium text-slate-400">{store?.code || "-"}</p>
          </div>
          {canManage ? (
            editing ? (
              <div className="flex gap-2">
                <ActionButton variant="plain" onClick={() => { setEditing(false); setForm(storeToForm(store)); }}>
                  {labels.cancel}
                </ActionButton>
                <ActionButton type="submit" disabled={isSaving}>
                  {labels.save}
                </ActionButton>
              </div>
            ) : (
              <ActionButton onClick={() => setEditing(true)}>
                <Icon name="edit" />
                {labels.edit}
              </ActionButton>
            )
          ) : null}
        </div>
        <div className="grid gap-4 lg:grid-cols-[180px_1fr]">
          <div className="flex min-h-40 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
            {form.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.logo_url} alt="" className="max-h-32 max-w-[150px] object-contain" />
            ) : (
              <span className="text-sm font-bold text-slate-400">LOGO</span>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={labels.storeCode} value={store?.code ?? ""} disabled onChange={() => undefined} />
            <Field
              label={labels.displayName}
              value={form.display_name}
              disabled={!editing}
              onChange={(value) => setForm((current) => ({ ...current, display_name: value }))}
            />
            <Field
              label={labels.logoUrl}
              value={form.logo_url}
              disabled={!editing}
              onChange={(value) => setForm((current) => ({ ...current, logo_url: value }))}
            />
            <Field
              label={labels.phone}
              value={form.contact_phone}
              disabled={!editing}
              onChange={(value) => setForm((current) => ({ ...current, contact_phone: value }))}
            />
            <div className="md:col-span-2">
              <TextArea
                label={labels.address}
                value={form.company_address}
                disabled={!editing}
                onChange={(value) => setForm((current) => ({ ...current, company_address: value }))}
              />
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}

function BranchPanel({
  labels,
  branches,
  setBranches,
  onBack,
  canManage,
  activeBranchId,
  reportStatus
}: {
  labels: Labels;
  branches: BranchSettings[];
  setBranches: (branches: BranchSettings[]) => void;
  onBack: () => void;
  canManage: boolean;
  activeBranchId: string | null;
  reportStatus: (message: string) => void;
}) {
  const [form, setForm] = useState<BranchForm>(emptyBranchForm);
  const [isBusy, setIsBusy] = useState(false);
  const sortedBranches = useMemo(
    () => [...branches].sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.name.localeCompare(b.name)),
    [branches]
  );

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isBusy) return;
    const method = form.id ? "PATCH" : "POST";
    setIsBusy(true);
    void (async () => {
      try {
        const data = await readApiData<{ branch: BranchSettings }>(
          await fetch("/api/pos/settings/branches", {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form)
          })
        );
        setBranches(branches.some((branch) => branch.id === data.branch.id) ? branches.map((branch) => (branch.id === data.branch.id ? data.branch : branch)) : [...branches, data.branch]);
        setForm(emptyBranchForm);
        reportStatus(labels.saved);
      } catch (error) {
        reportStatus(error instanceof Error ? error.message : labels.failed);
      } finally {
        setIsBusy(false);
      }
    })();
  }

  function deleteBranch(branch: BranchSettings) {
    if (isBusy) return;
    setIsBusy(true);
    void (async () => {
      try {
        const data = await readApiData<{ branch: BranchSettings }>(
          await fetch(`/api/pos/settings/branches?branch_id=${encodeURIComponent(branch.id)}`, { method: "DELETE" })
        );
        setBranches(branches.map((item) => (item.id === data.branch.id ? data.branch : item)));
        reportStatus(labels.saved);
      } catch (error) {
        reportStatus(error instanceof Error ? error.message : labels.failed);
      } finally {
        setIsBusy(false);
      }
    })();
  }

  return (
    <section>
      <PanelHeader title={labels.branches} onBack={onBack} labels={labels} />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="grid grid-cols-[1fr_1fr_110px_120px] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-black text-slate-500">
            <span>{labels.branchName}</span>
            <span>{labels.branchCode}</span>
            <span>{labels.active}</span>
            <span />
          </div>
          {sortedBranches.map((branch) => (
            <div key={branch.id} className="grid grid-cols-[1fr_1fr_110px_120px] items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950">{branch.name}</p>
                <p className="truncate text-xs font-medium text-slate-500">{branch.address || "-"}</p>
              </div>
              <p className="truncate text-sm font-bold text-slate-700">{branch.code}</p>
              <StatusPill active={branch.is_active} labels={labels} />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setForm(branchToForm(branch))} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50" title={labels.edit}>
                  <Icon name="edit" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteBranch(branch)}
                  disabled={!canManage || isBusy || branch.id === activeBranchId}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                  title={labels.delete}
                >
                  <Icon name="trash" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={save} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-base font-black text-slate-950">
            <Icon name="plus" />
            {form.id ? labels.edit : labels.add}
          </div>
          <Field label={labels.branchCode} value={form.code} disabled={!canManage} onChange={(value) => setForm((current) => ({ ...current, code: value }))} />
          <Field label={labels.branchName} value={form.name} disabled={!canManage} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
          <TextArea label={labels.address} value={form.address} disabled={!canManage} onChange={(value) => setForm((current) => ({ ...current, address: value }))} />
          <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-700">
            <input type="checkbox" checked={form.is_active} disabled={!canManage} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} />
            {labels.active}
          </label>
          <div className="flex gap-2">
            <ActionButton type="submit" disabled={!canManage || isBusy}>
              {labels.save}
            </ActionButton>
            <ActionButton variant="plain" onClick={() => setForm(emptyBranchForm)}>
              {labels.cancel}
            </ActionButton>
          </div>
        </form>
      </div>
    </section>
  );
}

function PaymentPanel({
  labels,
  accounts,
  setAccounts,
  branches,
  onBack,
  canManage,
  paymentReady,
  activeBranchId,
  reportStatus
}: {
  labels: Labels;
  accounts: PaymentAccountSettings[];
  setAccounts: (accounts: PaymentAccountSettings[]) => void;
  branches: BranchSettings[];
  onBack: () => void;
  canManage: boolean;
  paymentReady: boolean;
  activeBranchId: string | null;
  reportStatus: (message: string) => void;
}) {
  const initialPaymentForm = { ...emptyPaymentForm, branch_id: activeBranchId ?? branches[0]?.id ?? "" };
  const [form, setForm] = useState<PaymentForm>(initialPaymentForm);
  const [isBusy, setIsBusy] = useState(false);
  const branchById = useMemo(() => new Map(branches.map((branch) => [branch.id, branch])), [branches]);
  const promptpayPayload = buildPromptPayPayload(form.promptpay_phone);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isBusy) return;
    const method = form.id ? "PATCH" : "POST";
    setIsBusy(true);
    void (async () => {
      try {
        const data = await readApiData<{ account: PaymentAccountSettings }>(
          await fetch("/api/pos/settings/payment-accounts", {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form)
          })
        );
        setAccounts(accounts.some((account) => account.id === data.account.id) ? accounts.map((account) => (account.id === data.account.id ? data.account : account)) : [...accounts, data.account]);
        setForm(initialPaymentForm);
        reportStatus(labels.saved);
      } catch (error) {
        reportStatus(error instanceof Error ? error.message : labels.failed);
      } finally {
        setIsBusy(false);
      }
    })();
  }

  function deleteAccount(account: PaymentAccountSettings) {
    if (isBusy) return;
    setIsBusy(true);
    void (async () => {
      try {
        await readApiData<{ id: string; deleted: boolean }>(
          await fetch(`/api/pos/settings/payment-accounts?account_id=${encodeURIComponent(account.id)}`, { method: "DELETE" })
        );
        setAccounts(accounts.filter((item) => item.id !== account.id));
        reportStatus(labels.saved);
      } catch (error) {
        reportStatus(error instanceof Error ? error.message : labels.failed);
      } finally {
        setIsBusy(false);
      }
    })();
  }

  function toggleAccount(account: PaymentAccountSettings) {
    if (isBusy) return;
    const next = { ...paymentToForm(account), is_active: !account.is_active };
    setIsBusy(true);
    void (async () => {
      try {
        const data = await readApiData<{ account: PaymentAccountSettings }>(
          await fetch("/api/pos/settings/payment-accounts", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(next)
          })
        );
        setAccounts(accounts.map((item) => (item.id === data.account.id ? data.account : item)));
      } catch (error) {
        reportStatus(error instanceof Error ? error.message : labels.failed);
      } finally {
        setIsBusy(false);
      }
    })();
  }

  return (
    <section>
      <PanelHeader title={labels.payments} onBack={onBack} labels={labels} />
      {!paymentReady ? <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">{labels.schemaMissing}</div> : null}
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="grid gap-3">
          {accounts.map((account) => (
            <div key={account.id} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[1fr_130px_120px] md:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-black text-slate-950">{account.bank_name}</p>
                  <StatusPill active={account.is_active} labels={labels} />
                </div>
                <p className="mt-1 text-sm font-bold text-slate-700">{account.account_name}</p>
                <p className="text-xs font-medium text-slate-500">
                  {account.account_number || "-"} · {branchById.get(account.branch_id)?.name ?? account.branch_id}
                </p>
                {account.promptpay_payload ? <p className="mt-2 break-all text-xs font-semibold text-blue-700">{account.promptpay_payload}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => toggleAccount(account)}
                disabled={!canManage || isBusy || !paymentReady}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                {account.is_active ? labels.inactive : labels.active}
              </button>
              <div className="flex gap-2 md:justify-end">
                <button type="button" onClick={() => setForm(paymentToForm(account))} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50" title={labels.edit}>
                  <Icon name="edit" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteAccount(account)}
                  disabled={!canManage || isBusy || !paymentReady}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40"
                  title={labels.delete}
                >
                  <Icon name="trash" />
                </button>
              </div>
            </div>
          ))}
          {accounts.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-bold text-slate-500">-</div> : null}
        </div>
        <form onSubmit={save} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-base font-black text-slate-950">
            <Icon name="payment" />
            {form.id ? labels.edit : labels.add}
          </div>
          <label className="grid gap-1.5 text-[13px] font-semibold text-slate-700">
            <span>{labels.branch}</span>
            <select
              value={form.branch_id}
              disabled={!canManage}
              onChange={(event) => setForm((current) => ({ ...current, branch_id: event.target.value }))}
              className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              {branches.filter((branch) => branch.is_active).map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
          <Field label={labels.bankName} value={form.bank_name} disabled={!canManage} onChange={(value) => setForm((current) => ({ ...current, bank_name: value }))} />
          <Field label={labels.accountName} value={form.account_name} disabled={!canManage} onChange={(value) => setForm((current) => ({ ...current, account_name: value }))} />
          <Field label={labels.accountNo} value={form.account_number} disabled={!canManage} onChange={(value) => setForm((current) => ({ ...current, account_number: value }))} />
          <Field label={labels.promptpay} value={form.promptpay_phone} disabled={!canManage} onChange={(value) => setForm((current) => ({ ...current, promptpay_phone: value }))} />
          <Field label={labels.qrImage} value={form.qr_image_url} disabled={!canManage} onChange={(value) => setForm((current) => ({ ...current, qr_image_url: value }))} />
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            {form.qr_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.qr_image_url} alt="" className="mx-auto h-36 w-36 rounded-lg object-contain" />
            ) : (
              <p className="break-all text-xs font-semibold text-slate-600">
                {labels.qrPayload}: {promptpayPayload || "-"}
              </p>
            )}
          </div>
          <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-700">
            <input type="checkbox" checked={form.is_active} disabled={!canManage} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} />
            {labels.active}
          </label>
          <div className="flex gap-2">
            <ActionButton type="submit" disabled={!canManage || isBusy || !paymentReady}>
              {labels.save}
            </ActionButton>
            <ActionButton variant="plain" onClick={() => setForm(initialPaymentForm)}>
              {labels.cancel}
            </ActionButton>
          </div>
        </form>
      </div>
    </section>
  );
}

export function PosSettingsWorkspace({ lang, initialData }: { lang: Language; initialData: PosSettingsSnapshot }) {
  const labels = lang === "en" ? TEXT.en : TEXT.th;
  const [view, setView] = useState<SettingsView>("menu");
  const [store, setStore] = useState(initialData.store);
  const [branches, setBranches] = useState(initialData.branches);
  const [accounts, setAccounts] = useState(initialData.payment_accounts);
  const [status, setStatus] = useState("");
  const canManage = initialData.metadata.can_manage;

  function reportStatus(message: string) {
    setStatus(message);
    window.setTimeout(() => setStatus(""), 2800);
  }

  return (
    <main className="min-h-full bg-slate-50 p-3 sm:p-5">
      <section className="min-h-[calc(100vh-40px)] rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-950">{labels.title}</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">{labels.subtitle}</p>
          </div>
          {status ? <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700">{status}</div> : null}
        </div>

        {view === "menu" ? (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <MenuButton icon="store" title={labels.store} desc={labels.storeDesc} onClick={() => setView("store")} />
            <MenuButton icon="branch" title={labels.branches} desc={labels.branchesDesc} onClick={() => setView("branches")} />
            <MenuButton icon="payment" title={labels.payments} desc={labels.paymentsDesc} onClick={() => setView("payments")} />
            <MenuLink icon="users" title={labels.users} desc={labels.usersDesc} href="/preview/pos/users" />
            <MenuLink icon="display" title={labels.display} desc={labels.displayDesc} href="/preview/pos/customer-display" />
          </div>
        ) : null}

        {view === "store" ? (
          <StorePanel labels={labels} store={store} setStore={setStore} onBack={() => setView("menu")} canManage={canManage} reportStatus={reportStatus} />
        ) : null}
        {view === "branches" ? (
          <BranchPanel
            labels={labels}
            branches={branches}
            setBranches={setBranches}
            onBack={() => setView("menu")}
            canManage={canManage}
            activeBranchId={initialData.metadata.branch_id}
            reportStatus={reportStatus}
          />
        ) : null}
        {view === "payments" ? (
          <PaymentPanel
            labels={labels}
            accounts={accounts}
            setAccounts={setAccounts}
            branches={branches}
            onBack={() => setView("menu")}
            canManage={canManage}
            paymentReady={initialData.metadata.payment_accounts_ready}
            activeBranchId={initialData.metadata.branch_id}
            reportStatus={reportStatus}
          />
        ) : null}
      </section>
    </main>
  );
}
