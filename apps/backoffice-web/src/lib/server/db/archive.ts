import "server-only";

import { createClient } from "@supabase/supabase-js";
import { readEnv } from "@/lib/env";

function archiveReadsEnabled() {
  return readEnv("ENABLE_ARCHIVE_READS") === "true";
}

function getArchiveEnv() {
  const url = readEnv("SUPABASE_ARCHIVE_URL");
  const serviceRoleKey = readEnv("SUPABASE_ARCHIVE_SERVICE_ROLE_KEY");
  return { url, serviceRoleKey };
}

function createArchiveReadClient() {
  const { url, serviceRoleKey } = getArchiveEnv();
  if (!url || !serviceRoleKey) {
    throw new Error("Missing archive Supabase environment variables.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

type ArchiveReadClient = ReturnType<typeof createArchiveReadClient>;

function getArchiveCache() {
  return globalThis as typeof globalThis & {
    __posArchiveSupabaseReadClient?: ArchiveReadClient;
  };
}

export function isArchiveReadsEnabled() {
  return archiveReadsEnabled();
}

export function isArchiveConfigured() {
  const { url, serviceRoleKey } = getArchiveEnv();
  return Boolean(url && serviceRoleKey);
}

export function getArchiveSupabaseReadClient() {
  if (typeof window !== "undefined") {
    throw new Error("Archive Supabase client can only be used on the server.");
  }
  if (!archiveReadsEnabled()) {
    throw new Error("Archive reads are disabled.");
  }

  const cache = getArchiveCache();
  if (!cache.__posArchiveSupabaseReadClient) {
    cache.__posArchiveSupabaseReadClient = createArchiveReadClient();
  }

  return cache.__posArchiveSupabaseReadClient;
}
