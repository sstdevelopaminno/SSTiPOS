import "server-only";

import { redirect } from "next/navigation";
import { requirePermission, requirePosSession, type PosPermission, type PosSessionScope } from "@/lib/pos-session-guard";

export async function requirePosPagePermission(permission: PosPermission, fallbackPath = "/preview/pos"): Promise<PosSessionScope> {
  try {
    const scope = await requirePosSession();
    requirePermission(scope, permission);
    return scope;
  } catch {
    redirect(fallbackPath);
  }
}

