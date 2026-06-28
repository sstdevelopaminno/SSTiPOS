import type { PosFeatureCode } from "@pos/shared-types";

export type PosPermissionKey =
  | "sales:view"
  | "sales:list:view"
  | "reports:view"
  | "receipts:view"
  | "inventory:view"
  | "tables:view"
  | "tables:manage"
  | "users:view"
  | "users:manage"
  | "customer_display:view"
  | "customer_display:manage"
  | "monitor:view"
  | "settings:view"
  | "system:notice:view"
  | "shift:open"
  | "shift:join"
  | "shift:close"
  | "sales:enter"
  | "sales:create"
  | "sale:create"
  | "attendance:view_self"
  | "attendance:view_all_branch"
  | "attendance:manage"
  | "attendance:override"
  | "attendance:export";

export const POS_ROUTE_FEATURES = {
  "/preview/pos": "core_pos_sales",
  "/preview/pos/sales-list": "advanced_sales_reports",
  "/preview/pos/stock": "core_pos_sales",
  "/preview/pos/sales-summary": "advanced_sales_reports",
  "/preview/pos/receipts": "receipt_reprint_history",
  "/preview/pos/tables": "table_management",
  "/preview/pos/customer-display": "customer_facing_display",
  "/preview/pos/users": "user_management",
  "/preview/pos/shift": "core_pos_sales",
  "/preview/pos/settings": "core_pos_sales"
} as const satisfies Record<string, PosFeatureCode>;

export const POS_PERMISSION_FEATURES = {
  "sale:create": "core_pos_sales",
  "sales:create": "core_pos_sales",
  "sales:list:view": "advanced_sales_reports",
  "inventory:view": "core_pos_sales",
  "reports:view": "advanced_sales_reports",
  "receipts:view": "receipt_reprint_history",
  "tables:view": "table_management",
  "tables:manage": "table_management",
  "customer_display:view": "customer_facing_display",
  "customer_display:manage": "customer_facing_display",
  "users:view": "user_management",
  "users:manage": "user_management",
  "shift:join": "core_pos_sales",
  "settings:view": "core_pos_sales"
} as const satisfies Partial<Record<PosPermissionKey, PosFeatureCode>>;

export const POS_MENU_LOCK_TITLE_TH = String.fromCharCode(
  0x0e1f, 0x0e35, 0x0e40, 0x0e08, 0x0e2d, 0x0e23, 0x0e4c, 0x0e19, 0x0e35, 0x0e49, 0x0e22, 0x0e31, 0x0e07,
  0x0e44, 0x0e21, 0x0e48, 0x0e40, 0x0e1b, 0x0e34, 0x0e14, 0x0e43, 0x0e0a, 0x0e49, 0x0e07, 0x0e32, 0x0e19,
  0x0e43, 0x0e19, 0x0e41, 0x0e1e, 0x0e47, 0x0e01, 0x0e40, 0x0e01, 0x0e08, 0x0e02, 0x0e2d, 0x0e07, 0x0e04,
  0x0e38, 0x0e13
);
export const POS_MENU_LOCK_BODY_TH = String.fromCharCode(
  0x0e41, 0x0e1e, 0x0e47, 0x0e01, 0x0e40, 0x0e01, 0x0e08, 0x0e1b, 0x0e31, 0x0e08, 0x0e08, 0x0e38, 0x0e1a,
  0x0e31, 0x0e19, 0x0e44, 0x0e21, 0x0e48, 0x0e23, 0x0e2d, 0x0e07, 0x0e23, 0x0e31, 0x0e1a, 0x0e1f, 0x0e35,
  0x0e40, 0x0e08, 0x0e2d, 0x0e23, 0x0e4c, 0x0e19, 0x0e35, 0x0e49, 0x20, 0x0e01, 0x0e23, 0x0e38, 0x0e13,
  0x0e32, 0x0e2d, 0x0e31, 0x0e1b, 0x0e40, 0x0e01, 0x0e23, 0x0e14, 0x0e41, 0x0e1e, 0x0e47, 0x0e01, 0x0e40,
  0x0e01, 0x0e08, 0x0e2b, 0x0e23, 0x0e37, 0x0e2d, 0x0e15, 0x0e34, 0x0e14, 0x0e15, 0x0e48, 0x0e2d, 0x0e1c,
  0x0e39, 0x0e49, 0x0e14, 0x0e39, 0x0e41, 0x0e25, 0x0e23, 0x0e30, 0x0e1a, 0x0e1a, 0x20, 0x49, 0x54
);
export const POS_MENU_LOCK_TITLE_EN = "This feature is not enabled in your package";
export const POS_MENU_LOCK_BODY_EN = "Your current package does not include this feature. Please upgrade the package or contact IT support.";

export function featureForPosPermission(permission: PosPermissionKey): PosFeatureCode | null {
  return (POS_PERMISSION_FEATURES as Partial<Record<PosPermissionKey, PosFeatureCode>>)[permission] ?? null;
}

export function featureForPosRoute(pathname: string): PosFeatureCode | null {
  const normalized = pathname.replace(/\/$/, "") || "/preview/pos";
  return POS_ROUTE_FEATURES[normalized as keyof typeof POS_ROUTE_FEATURES] ?? null;
}

export function allPosMenuFeatureCodes(): PosFeatureCode[] {
  return Array.from(new Set(Object.values(POS_ROUTE_FEATURES)));
}
