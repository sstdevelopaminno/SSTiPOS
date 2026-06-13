import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const expectedUsers = [
  {
    role: "it_admin",
    fullName: "SSTiPOS IT Admin",
    emailEnv: "SST_IT_ADMIN_EMAIL",
    passwordEnv: "SST_IT_ADMIN_PASSWORD",
    expectedEmail: "itadmin@sstipos.local"
  },
  {
    role: "it_support",
    fullName: "SSTiPOS IT Support",
    emailEnv: "SST_IT_SUPPORT_EMAIL",
    passwordEnv: "SST_IT_SUPPORT_PASSWORD",
    expectedEmail: "itsupport@sstipos.local"
  }
];

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(appRoot, "../..");

function parseEnv(content) {
  const out = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

async function loadFileEnv() {
  const candidates = [
    path.join(appRoot, ".env.local"),
    path.join(repoRoot, ".env.local"),
    path.join(appRoot, ".env")
  ];

  const merged = {};
  const sources = [];
  for (const file of candidates) {
    try {
      Object.assign(merged, parseEnv(await fs.readFile(file, "utf8")));
      sources.push(file);
    } catch {
      // Optional local env files are allowed to be absent.
    }
  }

  return { values: merged, sources };
}

function readEnv(fileEnv, name) {
  const value = process.env[name] ?? fileEnv[name];
  return typeof value === "string" ? value.trim() : "";
}

function readFirstEnv(fileEnv, names) {
  for (const name of names) {
    const value = readEnv(fileEnv, name);
    if (value) return { name, value };
  }
  return null;
}

function requireEnv(fileEnv, name) {
  const value = readEnv(fileEnv, name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function assertDevOnly() {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    throw new Error("Refusing to create local/dev IT users while NODE_ENV or VERCEL_ENV is production.");
  }
}

function assertExpectedLocalEmail(envName, email, expectedEmail) {
  if (email.toLowerCase() !== expectedEmail) {
    throw new Error(`${envName} must be ${expectedEmail} for this local/dev user script.`);
  }
}

function validateUserEnv(fileEnv) {
  const missing = [];
  for (const userConfig of expectedUsers) {
    if (!readEnv(fileEnv, userConfig.emailEnv)) missing.push(userConfig.emailEnv);
    if (!readEnv(fileEnv, userConfig.passwordEnv)) missing.push(userConfig.passwordEnv);
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  for (const userConfig of expectedUsers) {
    assertExpectedLocalEmail(
      userConfig.emailEnv,
      readEnv(fileEnv, userConfig.emailEnv).toLowerCase(),
      userConfig.expectedEmail
    );
  }
}

async function loadConfig() {
  assertDevOnly();

  const { values, sources } = await loadFileEnv();
  const url = readFirstEnv(values, ["SUPABASE_PRIMARY_URL", "NEXT_PUBLIC_SUPABASE_URL"]);
  const serviceRole = readFirstEnv(values, ["SUPABASE_PRIMARY_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"]);

  if (!url) throw new Error("Missing SUPABASE_PRIMARY_URL or NEXT_PUBLIC_SUPABASE_URL.");
  if (!serviceRole) throw new Error("Missing SUPABASE_PRIMARY_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY.");

  return {
    fileEnv: values,
    supabaseUrl: url.value.replace(/\/+$/, ""),
    supabaseUrlEnv: url.name,
    serviceRoleKey: serviceRole.value,
    serviceRoleEnv: serviceRole.name,
    envSources: sources
  };
}

async function findUserByEmail(supabase, email) {
  const normalized = email.toLowerCase();
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Unable to list Supabase Auth users: ${error.message}`);

    const found = data.users.find((user) => user.email?.toLowerCase() === normalized);
    if (found) return found;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function createOrUpdateAuthUser(supabase, fileEnv, userConfig) {
  const email = requireEnv(fileEnv, userConfig.emailEnv).toLowerCase();
  const password = requireEnv(fileEnv, userConfig.passwordEnv);
  assertExpectedLocalEmail(userConfig.emailEnv, email, userConfig.expectedEmail);

  const existing = await findUserByEmail(supabase, email);
  const appMetadata = {
    ...(existing?.app_metadata ?? {}),
    platform_role: userConfig.role
  };
  const userMetadata = {
    ...(existing?.user_metadata ?? {}),
    full_name: userConfig.fullName
  };

  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      email,
      password,
      email_confirm: true,
      app_metadata: appMetadata,
      user_metadata: userMetadata
    });
    if (error || !data.user) throw new Error(`Unable to update ${email}: ${error?.message ?? "missing user"}`);
    return { user: data.user, email, action: "updated" };
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: appMetadata,
    user_metadata: userMetadata
  });
  if (error || !data.user) throw new Error(`Unable to create ${email}: ${error?.message ?? "missing user"}`);
  return { user: data.user, email, action: "created" };
}

async function upsertProfile(supabase, authUser, userConfig, email) {
  const { error } = await supabase.from("users_profiles").upsert(
    {
      id: authUser.id,
      email,
      full_name: userConfig.fullName,
      platform_role: userConfig.role,
      is_active: true
    },
    { onConflict: "id" }
  );

  if (error) {
    const enumHint =
      userConfig.role === "it_support"
        ? " Ensure migration 20260612132854_add_it_support_platform_role.sql has been applied."
        : "";
    throw new Error(`Unable to upsert users_profiles for ${email}: ${error.message}.${enumHint}`);
  }
}

async function verifyProfile(supabase, authUser, userConfig, email) {
  const { data, error } = await supabase
    .from("users_profiles")
    .select("id,email,platform_role,is_active")
    .eq("id", authUser.id)
    .maybeSingle();

  if (error) throw new Error(`Unable to verify users_profiles for ${email}: ${error.message}`);
  if (!data) throw new Error(`Missing users_profiles row after upsert for ${email}.`);
  if (data.platform_role !== userConfig.role || data.is_active !== true) {
    throw new Error(`Profile verification failed for ${email}.`);
  }
}

async function main() {
  const config = await loadConfig();
  validateUserEnv(config.fileEnv);

  const supabase = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const results = [];
  for (const userConfig of expectedUsers) {
    const result = await createOrUpdateAuthUser(supabase, config.fileEnv, userConfig);
    await upsertProfile(supabase, result.user, userConfig, result.email);
    await verifyProfile(supabase, result.user, userConfig, result.email);
    results.push({ email: result.email, role: userConfig.role, action: result.action });
  }

  console.log("IT platform users created/updated.");
  console.log(`Supabase URL env: ${config.supabaseUrlEnv}`);
  console.log(`Service role env: ${config.serviceRoleEnv}`);
  console.log(
    `Env files checked: ${
      config.envSources.length ? config.envSources.map((source) => path.relative(process.cwd(), source)).join(", ") : "none"
    }`
  );
  for (const result of results) {
    console.log(`${result.action}: ${result.email} -> ${result.role}`);
  }
  console.log("Password and secret values were not printed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
