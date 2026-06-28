# POS Preview Solo Register Release - 2026-06-28

## Scope

This release prepares POS Preview for a single-register shop that does not expose branch selection to the cashier.

Included work:

- Fixed shift-close session handling so close-shift can complete even after the POS session status changes during close.
- Reduced repeated `/api/pos/session/current` calls from the shift-cycle guard.
- Added the `solo` / `Solo Register` package to the subscription catalog.
- Synced local migration history with the remote Supabase project so INET migrations are not pushed twice.
- Applied remote migration `20260628101753_solo_single_register_package`.
- Seeded the live demo store for solo login testing.

## Demo Login

- Store code: `SOLO-TH-001`
- Device: `SOLO-POS-01`
- Owner: `900001` / PIN `111111`
- Manager: `900002` / PIN `222222`
- Staff: `900003` / PIN `333333`

The demo store uses one internal branch (`MAIN`) and one active POS device. Browser requests to `/api/pos/session/current` will still return `401` until the user completes the POS login flow and receives a POS session cookie.

## Remote DB Verification

Verified on the linked Supabase project:

- Package `solo` exists as `Solo Register`.
- Package limits are 1 branch, 1 device, and 3 users.
- Enabled features are `core_pos_sales`, `pin_login`, `attendance_tracking`, `user_management`, and `device_management`.
- Demo tenant `SOLO-TH-001` exists with branch `MAIN` and device `SOLO-POS-01`.
- Employee codes `900001`, `900002`, and `900003` are bound to owner, manager, and staff roles.
- PIN hashes verified for `111111`, `222222`, and `333333`.
- No active POS session was left on the demo device after seeding.

## Notes

- Do not commit Supabase access tokens or database passwords. Use environment variables only.
- `scripts/apply-solo-demo-seed.sql` is idempotent and can be rerun if the demo store needs to be repaired.
- `supabase/seed.sql` was adjusted to match the current remote `branch_login_policies` schema.
