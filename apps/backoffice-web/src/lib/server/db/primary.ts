import "server-only";

import { createClient } from "@supabase/supabase-js";
import { readRequiredFirstEnv } from "@/lib/env";

const primaryUrlNames = ["SUPABASE_PRIMARY_URL", "NEXT_PUBLIC_SUPABASE_URL"] as const;
const primaryAnonKeyNames = ["SUPABASE_PRIMARY_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;
const primaryServiceRoleKeyNames = ["SUPABASE_PRIMARY_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"] as const;

export function getPrimarySupabaseUrl() {
  return readRequiredFirstEnv(primaryUrlNames, "Missing primary Supabase URL.");
}

export function getPrimarySupabaseAnonKey() {
  return readRequiredFirstEnv(primaryAnonKeyNames, "Missing primary Supabase anon key.");
}

export function getPrimarySupabaseServiceRoleKey() {
  return readRequiredFirstEnv(primaryServiceRoleKeyNames, "Missing primary Supabase service role key.");
}

function createPrimaryServiceRoleClient() {
  return createClient(getPrimarySupabaseUrl(), getPrimarySupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

type PrimaryServiceRoleClient = ReturnType<typeof createPrimaryServiceRoleClient>;

function getPrimaryCache() {
  return globalThis as typeof globalThis & {
    __posPrimarySupabaseServiceClient?: PrimaryServiceRoleClient;
  };
}

export function getPrimarySupabaseServiceClient() {
  if (typeof window !== "undefined") {
    throw new Error("Primary Supabase service client can only be used on the server.");
  }

  const cache = getPrimaryCache();
  if (!cache.__posPrimarySupabaseServiceClient) {
    cache.__posPrimarySupabaseServiceClient = createPrimaryServiceRoleClient();
  }

  return cache.__posPrimarySupabaseServiceClient;
}
