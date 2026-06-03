import "server-only";

import { appendAuditLog } from "@/lib/audit-log";
import type { AuthContext } from "@/lib/auth-context";
import { getSupabaseServiceClient } from "@/lib/supabase-admin";

export type StoreSettings = {
  id: string;
  code: string;
  name: string;
  display_name: string;
  logo_url: string;
  company_address: string;
  contact_phone: string;
};

export type BranchSettings = {
  id: string;
  code: string;
  name: string;
  address: string;
  is_active: boolean;
};

export type PaymentAccountSettings = {
  id: string;
  branch_id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  promptpay_phone: string;
  promptpay_payload: string;
  qr_image_url: string;
  is_active: boolean;
};

export type PosSettingsSnapshot = {
  store: StoreSettings | null;
  branches: BranchSettings[];
  payment_accounts: PaymentAccountSettings[];
  metadata: {
    tenant_id: string | null;
    branch_id: string | null;
    can_manage: boolean;
    payment_accounts_ready: boolean;
  };
};

type DbError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
};

type StoreRow = {
  id: string;
  code: string | null;
  name: string | null;
  display_name?: string | null;
  logo_url?: string | null;
  company_address?: string | null;
  contact_phone?: string | null;
  owner_phone?: string | null;
};

type BranchRow = {
  id: string;
  code: string | null;
  name: string | null;
  address: string | null;
  is_active: boolean | null;
};

type PaymentAccountRow = {
  id: string;
  branch_id: string;
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  promptpay_phone: string | null;
  promptpay_payload?: string | null;
  qr_image_url: string | null;
  is_active: boolean | null;
};

export type StoreSettingsInput = {
  display_name?: string;
  logo_url?: string;
  company_address?: string;
  contact_phone?: string;
};

export type BranchSettingsInput = {
  id?: string;
  code?: string;
  name?: string;
  address?: string;
  is_active?: boolean;
};

export type PaymentAccountInput = {
  id?: string;
  branch_id?: string;
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  promptpay_phone?: string;
  qr_image_url?: string;
  is_active?: boolean;
};

function trimText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeDigits(value: unknown) {
  return trimText(value).replace(/[^\d]/g, "");
}

function isMissingSchemaError(error: DbError | null | undefined, relationOrColumn?: string) {
  if (!error) return false;
  const code = String(error.code ?? "");
  const message = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  const target = relationOrColumn?.toLowerCase() ?? "";
  return (
    code === "42P01" ||
    code === "42703" ||
    code === "PGRST204" ||
    code === "PGRST205" ||
    message.includes("does not exist") ||
    message.includes("could not find") ||
    (target ? message.includes(target) : false)
  );
}

function canManageSettings(auth: AuthContext) {
  return auth.platformRole === "it_admin" || auth.branchRole === "owner";
}

export function assertCanManageSettings(auth: AuthContext) {
  if (!canManageSettings(auth)) {
    throw new Error("Only owner can manage POS settings.");
  }
}

function mapStore(row: StoreRow | null | undefined): StoreSettings | null {
  if (!row) return null;
  const name = trimText(row.name);
  return {
    id: row.id,
    code: trimText(row.code),
    name,
    display_name: trimText(row.display_name) || name,
    logo_url: trimText(row.logo_url),
    company_address: trimText(row.company_address),
    contact_phone: trimText(row.contact_phone) || trimText(row.owner_phone)
  };
}

function mapBranch(row: BranchRow): BranchSettings {
  return {
    id: row.id,
    code: trimText(row.code),
    name: trimText(row.name),
    address: trimText(row.address),
    is_active: row.is_active !== false
  };
}

export function buildPromptPayPayload(phone: unknown) {
  const digits = normalizeDigits(phone);
  return digits ? `promptpay://phone/${digits}` : "";
}

function mapPaymentAccount(row: PaymentAccountRow): PaymentAccountSettings {
  const promptpayPhone = trimText(row.promptpay_phone);
  return {
    id: row.id,
    branch_id: row.branch_id,
    bank_name: trimText(row.bank_name),
    account_name: trimText(row.account_name),
    account_number: trimText(row.account_number),
    promptpay_phone: promptpayPhone,
    promptpay_payload: trimText(row.promptpay_payload) || buildPromptPayPayload(promptpayPhone),
    qr_image_url: trimText(row.qr_image_url),
    is_active: row.is_active !== false
  };
}

async function loadStoreSettings(tenantId: string) {
  const supabase = getSupabaseServiceClient();
  const fullResult = await supabase
    .from("tenants")
    .select("id,code,name,display_name,logo_url,company_address,contact_phone,owner_phone")
    .eq("id", tenantId)
    .maybeSingle<StoreRow>();

  if (fullResult.error && isMissingSchemaError(fullResult.error)) {
    const legacyResult = await supabase.from("tenants").select("id,code,name,owner_phone").eq("id", tenantId).maybeSingle<StoreRow>();
    if (legacyResult.error) throw new Error(legacyResult.error.message);
    return mapStore(legacyResult.data);
  }
  if (fullResult.error) throw new Error(fullResult.error.message);
  return mapStore(fullResult.data);
}

export async function loadPosSettingsSnapshot(auth: AuthContext): Promise<PosSettingsSnapshot> {
  if (!auth.tenantId) {
    return {
      store: null,
      branches: [],
      payment_accounts: [],
      metadata: { tenant_id: null, branch_id: auth.branchId, can_manage: false, payment_accounts_ready: false }
    };
  }

  const supabase = getSupabaseServiceClient();
  const [store, branchesResult, paymentResult] = await Promise.all([
    loadStoreSettings(auth.tenantId),
    supabase.from("branches").select("id,code,name,address,is_active").eq("tenant_id", auth.tenantId).order("name", { ascending: true }),
    supabase
      .from("tenant_payment_accounts")
      .select("id,branch_id,bank_name,account_name,account_number,promptpay_phone,promptpay_payload,qr_image_url,is_active")
      .eq("tenant_id", auth.tenantId)
      .order("is_active", { ascending: false })
      .order("bank_name", { ascending: true })
  ]);

  if (branchesResult.error) throw new Error(branchesResult.error.message);

  const paymentAccountsReady = !paymentResult.error || !isMissingSchemaError(paymentResult.error, "tenant_payment_accounts");
  if (paymentResult.error && paymentAccountsReady) {
    throw new Error(paymentResult.error.message);
  }

  return {
    store,
    branches: ((branchesResult.data ?? []) as BranchRow[]).map(mapBranch),
    payment_accounts: paymentResult.error ? [] : ((paymentResult.data ?? []) as PaymentAccountRow[]).map(mapPaymentAccount),
    metadata: {
      tenant_id: auth.tenantId,
      branch_id: auth.branchId,
      can_manage: canManageSettings(auth),
      payment_accounts_ready: paymentAccountsReady
    }
  };
}

export async function updateStoreSettings(auth: AuthContext, input: StoreSettingsInput) {
  assertCanManageSettings(auth);
  if (!auth.tenantId) throw new Error("Missing tenant scope.");

  const displayName = trimText(input.display_name);
  const logoUrl = trimText(input.logo_url);
  const companyAddress = trimText(input.company_address);
  const contactPhone = trimText(input.contact_phone);
  if (!displayName) throw new Error("Store display name is required.");

  const supabase = getSupabaseServiceClient();
  const updateResult = await supabase
    .from("tenants")
    .update({
      name: displayName,
      display_name: displayName,
      logo_url: logoUrl || null,
      company_address: companyAddress || null,
      contact_phone: contactPhone || null,
      owner_phone: contactPhone || null
    })
    .eq("id", auth.tenantId)
    .select("id,code,name,display_name,logo_url,company_address,contact_phone,owner_phone")
    .maybeSingle<StoreRow>();

  if (updateResult.error && isMissingSchemaError(updateResult.error)) {
    const legacyResult = await supabase
      .from("tenants")
      .update({ name: displayName, owner_phone: contactPhone || null })
      .eq("id", auth.tenantId)
      .select("id,code,name,owner_phone")
      .maybeSingle<StoreRow>();
    if (legacyResult.error) throw new Error(legacyResult.error.message);
    return mapStore(legacyResult.data);
  }
  if (updateResult.error) throw new Error(updateResult.error.message);

  await appendAuditLog({
    tenantId: auth.tenantId,
    branchId: auth.branchId ?? undefined,
    actorUserId: auth.userId,
    actorRole: auth.branchRole ?? "owner",
    action: "pos_store_settings_updated",
    targetTable: "tenants",
    targetId: auth.tenantId,
    metadata: { display_name: displayName }
  });

  return mapStore(updateResult.data);
}

async function assertBranchInTenant(tenantId: string, branchId: string) {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.from("branches").select("id").eq("tenant_id", tenantId).eq("id", branchId).maybeSingle<{ id: string }>();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Branch was not found in this tenant.");
}

export async function saveBranchSettings(auth: AuthContext, input: BranchSettingsInput) {
  assertCanManageSettings(auth);
  if (!auth.tenantId) throw new Error("Missing tenant scope.");

  const code = trimText(input.code).toUpperCase();
  const name = trimText(input.name);
  const address = trimText(input.address);
  if (!code || !name) throw new Error("Branch code and branch name are required.");

  const supabase = getSupabaseServiceClient();
  const branchId = trimText(input.id);
  if (branchId) {
    await assertBranchInTenant(auth.tenantId, branchId);
    const { data, error } = await supabase
      .from("branches")
      .update({ code, name, address: address || null, is_active: input.is_active ?? true })
      .eq("tenant_id", auth.tenantId)
      .eq("id", branchId)
      .select("id,code,name,address,is_active")
      .maybeSingle<BranchRow>();
    if (error) throw new Error(error.message);
    return mapBranch(data!);
  }

  const { data, error } = await supabase
    .from("branches")
    .insert({ tenant_id: auth.tenantId, code, name, address: address || null, is_active: input.is_active ?? true })
    .select("id,code,name,address,is_active")
    .single<BranchRow>();
  if (error) throw new Error(error.message);

  const ownerRoleResult = await supabase.from("user_branch_roles").upsert(
    {
      user_id: auth.userId,
      tenant_id: auth.tenantId,
      branch_id: data.id,
      role: "owner",
      is_default: false
    },
    { onConflict: "user_id,tenant_id,branch_id" }
  );
  if (ownerRoleResult.error) throw new Error(ownerRoleResult.error.message);

  await appendAuditLog({
    tenantId: auth.tenantId,
    branchId: data.id,
    actorUserId: auth.userId,
    actorRole: auth.branchRole ?? "owner",
    action: "pos_branch_saved",
    targetTable: "branches",
    targetId: data.id,
    metadata: { code, name }
  });

  return mapBranch(data);
}

export async function deactivateBranchSettings(auth: AuthContext, branchId: string) {
  assertCanManageSettings(auth);
  if (!auth.tenantId) throw new Error("Missing tenant scope.");
  const normalizedBranchId = trimText(branchId);
  if (!normalizedBranchId) throw new Error("branch_id is required.");
  if (normalizedBranchId === auth.branchId) throw new Error("Current active branch cannot be deleted from this screen.");

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("branches")
    .update({ is_active: false })
    .eq("tenant_id", auth.tenantId)
    .eq("id", normalizedBranchId)
    .select("id,code,name,address,is_active")
    .maybeSingle<BranchRow>();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Branch was not found.");
  return mapBranch(data);
}

export async function savePaymentAccount(auth: AuthContext, input: PaymentAccountInput) {
  assertCanManageSettings(auth);
  if (!auth.tenantId) throw new Error("Missing tenant scope.");
  const branchId = trimText(input.branch_id) || trimText(auth.branchId);
  if (!branchId) throw new Error("Branch is required for payment account.");
  await assertBranchInTenant(auth.tenantId, branchId);

  const bankName = trimText(input.bank_name);
  const accountName = trimText(input.account_name);
  const accountNumber = trimText(input.account_number);
  const promptpayPhone = trimText(input.promptpay_phone);
  const qrImageUrl = trimText(input.qr_image_url);
  if (!bankName || !accountName) throw new Error("Bank name and account name are required.");

  const payload = {
    tenant_id: auth.tenantId,
    branch_id: branchId,
    bank_name: bankName,
    account_name: accountName,
    account_number: accountNumber,
    promptpay_phone: promptpayPhone || null,
    promptpay_payload: buildPromptPayPayload(promptpayPhone) || null,
    qr_image_url: qrImageUrl || null,
    is_active: input.is_active ?? true,
    created_by: auth.userId
  };

  const supabase = getSupabaseServiceClient();
  const accountId = trimText(input.id);
  const updatePayload = {
    branch_id: branchId,
    bank_name: bankName,
    account_name: accountName,
    account_number: accountNumber,
    promptpay_phone: promptpayPhone || null,
    promptpay_payload: buildPromptPayPayload(promptpayPhone) || null,
    qr_image_url: qrImageUrl || null,
    is_active: input.is_active ?? true
  };
  const result = accountId
    ? await supabase
        .from("tenant_payment_accounts")
        .update(updatePayload)
        .eq("tenant_id", auth.tenantId)
        .eq("id", accountId)
        .select("id,branch_id,bank_name,account_name,account_number,promptpay_phone,promptpay_payload,qr_image_url,is_active")
        .maybeSingle<PaymentAccountRow>()
    : await supabase
        .from("tenant_payment_accounts")
        .insert(payload)
        .select("id,branch_id,bank_name,account_name,account_number,promptpay_phone,promptpay_payload,qr_image_url,is_active")
        .single<PaymentAccountRow>();

  if (result.error) {
    if (isMissingSchemaError(result.error, "tenant_payment_accounts")) {
      throw new Error("Payment account table is missing. Please run the latest migration.");
    }
    throw new Error(result.error.message);
  }
  if (!result.data) throw new Error("Payment account was not found.");
  return mapPaymentAccount(result.data);
}

export async function deletePaymentAccount(auth: AuthContext, accountId: string) {
  assertCanManageSettings(auth);
  if (!auth.tenantId) throw new Error("Missing tenant scope.");
  const normalizedAccountId = trimText(accountId);
  if (!normalizedAccountId) throw new Error("account_id is required.");
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase.from("tenant_payment_accounts").delete().eq("tenant_id", auth.tenantId).eq("id", normalizedAccountId);
  if (error) {
    if (isMissingSchemaError(error, "tenant_payment_accounts")) {
      throw new Error("Payment account table is missing. Please run the latest migration.");
    }
    throw new Error(error.message);
  }
  return { id: normalizedAccountId, deleted: true };
}
