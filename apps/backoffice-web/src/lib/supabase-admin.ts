import { createClient } from "@supabase/supabase-js";
import { readRequiredEnv } from "@/lib/env";

export function getSupabaseServiceClient() {
  if (typeof window !== "undefined") {
    throw new Error("Supabase service client can only be used on the server.");
  }

  const url = readRequiredEnv("NEXT_PUBLIC_SUPABASE_URL", "Missing Supabase service role environment variables.");
  const key = readRequiredEnv("SUPABASE_SERVICE_ROLE_KEY", "Missing Supabase service role environment variables.");

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

