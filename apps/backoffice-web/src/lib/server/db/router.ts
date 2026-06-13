import "server-only";

import { readEnv } from "@/lib/env";
import { getArchiveSupabaseReadClient, isArchiveConfigured, isArchiveReadsEnabled } from "@/lib/server/db/archive";
import { getPrimarySupabaseServiceClient } from "@/lib/server/db/primary";

export type DatabaseReadTarget = "primary" | "archive" | "primary+archive";

export function getHotDataRetentionMonths() {
  const raw = readEnv("HOT_DATA_RETENTION_MONTHS");
  const parsed = raw ? Number.parseInt(raw, 10) : 12;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 12;
}

export function isDualDbModeEnabled() {
  return readEnv("ENABLE_DUAL_DB_MODE") === "true";
}

export function getHotDataCutoff(now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - getHotDataRetentionMonths());
  return cutoff;
}

export function resolveReadTarget(input: { from?: Date | null; to?: Date | null; now?: Date }): DatabaseReadTarget {
  if (!isArchiveReadsEnabled() || !isArchiveConfigured()) {
    return "primary";
  }

  const cutoff = getHotDataCutoff(input.now ?? new Date());
  const from = input.from ?? null;
  const to = input.to ?? null;

  if (to && to < cutoff) return "archive";
  if (from && from < cutoff) return "primary+archive";
  return "primary";
}

export function getWriteDatabaseClient() {
  return getPrimarySupabaseServiceClient();
}

export function getPrimaryReadDatabaseClient() {
  return getPrimarySupabaseServiceClient();
}

export function getArchiveReadDatabaseClient() {
  return getArchiveSupabaseReadClient();
}
