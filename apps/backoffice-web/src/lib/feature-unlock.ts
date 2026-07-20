export const FEATURE_UNLOCK_ENV = "NEXT_PUBLIC_POS_DEV_UNLOCK_ALL_FEATURES";

export function isFeatureUnlockEnabled() {
  const value = process.env.NEXT_PUBLIC_POS_DEV_UNLOCK_ALL_FEATURES ?? process.env.POS_DEV_UNLOCK_ALL_FEATURES;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return true;
}
