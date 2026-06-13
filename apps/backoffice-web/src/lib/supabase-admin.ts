import { getPrimarySupabaseServiceClient } from "@/lib/server/db/primary";

export function getSupabaseServiceClient() {
  return getPrimarySupabaseServiceClient();
}

