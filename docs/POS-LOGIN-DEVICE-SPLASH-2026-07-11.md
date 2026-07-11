# POS Login Device Splash (2026-07-11)

## Scope

- Added a CpIPOS logo splash to the final device-selection step after the cashier clicks the open-cash button.
- The splash appears during device/session creation and remains briefly after a successful response before routing into the POS system.
- Increased the device-selection request timeout so slower POS session creation does not fail too early.
- Replaced the splash image with the symbol-only transparent PNG generated from the provided logo reference.
- Prewarmed the POS sales route from the device-selection step and removed the extra post-success delay before routing.
- Increased the POS entry session-load timeout and added one retry to reduce false timeout pages during first-load compilation or slow local startup.

## Files

- `apps/backoffice-web/src/app/login/devices/page.tsx`
- `apps/backoffice-web/src/app/api/auth/devices/select/route.ts`
- `apps/backoffice-web/src/components/pos/pos-entry-gate.tsx`
- `apps/backoffice-web/src/app/globals.css`
- `apps/backoffice-web/public/brand/cpipos-symbol-transparent.png`

## Notes

- Server-side device, session, permission, tenant, and branch checks are unchanged.
- Error behavior still uses the existing dialog and does not show the splash on failed device selection.
- The splash uses a transparent symbol-only asset, not the CpIPOS wordmark.
- A `GET /api/auth/devices` 401 still means the pre-entry employee/device context is missing or expired.
- In local development, the first `/preview/pos` load can still compile slowly, but the entry gate should retry instead of failing immediately.
