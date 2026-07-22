# AI POS Shift/Sidebar Checkpoint - 2026-07-22

Read this file before changing POS preview sidebar, POS shift history, or login code fields.

For product option/modifier work, also read `docs/POS-MENU-MODIFIERS-INGREDIENTS-PLAN-2026-07-22.md` before editing POS sales, stock, receipts, or product management.

## Current Confirmed Source State

- `apps/backoffice-web/scripts/dev-safe.mjs`
  - Do not re-enable `setupLocalNextCache`.
  - Do not set `NEXT_DIST_DIR=.next-local`.
  - Windows tools are intentionally resolved through System32 paths because this workstation can run with an incomplete PATH.

- `apps/backoffice-web/src/components/pos/pos-shift-history-module.tsx`
  - The shift history toolbar must include the `ดูยอด` / `View totals` button before print.
  - Summary cards are intentionally hidden from the main page and shown in the `summary` modal.
  - Main table should not show the high-width money columns as primary columns: cash, transfer, cash float, actual cash.
  - Detailed totals can still appear inside modals, receipts, and print views.
  - Status labels:
    - `เปิดอยู่` for open shifts.
    - `ลืมปิดกะ` in red for system/auto closed overdue shifts.
    - `ปิดกะแล้ว` in green for normal employee/manual closed shifts.

- `apps/backoffice-web/src/components/pos-preview/pos-shell-sidebar.tsx`
  - Sidebar menu must scroll internally when viewport height is short.
  - Scrollbar must be hidden visually.
  - Footer/language/logout controls must remain reachable.
  - Do not restore a hard `mt-auto` footer that pushes lower menu items off screen.

- `apps/backoffice-web/src/components/pos-preview/pos-staff-menu.tsx`
  - Avoid client-only mounted gates that render a different menu count between SSR and hydration.
  - When role/features are still loading, keep the owner-level menu visible rather than hiding advanced menus.

- `apps/backoffice-web/src/app/globals.css`
  - `.pos-shell-sidebar__menu-scroll` hides the visual scrollbar.
  - `.login-code-visibility-btn` must keep a fixed icon slot so the eye icon is visible in employee/store code inputs.

- `apps/backoffice-web/src/components/pwa/pwa-bootstrap.tsx` and `apps/backoffice-web/public/sw.js`
  - Development must unregister service workers and clear browser caches automatically.
  - Service workers must not serve stale `/_next/` chunks before trying the network.
  - If old UI returns after refresh, inspect service worker/cache behavior before changing React component structure.

- `apps/backoffice-web/src/lib/pre-entry-client-cache.ts`
  - Development must not prewarm routes with `router.prefetch()` or background `fetch()`.
  - Login/device pages should not compile unrelated next routes while the user is entering employee code or selecting a register.
  - Production may use `router.prefetch()`, but avoid background `fetch()` warmups that can duplicate navigation work.

## Do Not Repeat

- Do not add `PosShellSidebarClient`; it previously caused `Lazy element type is invalid`.
- Do not use `.next-local` as a shared external dev cache; stale bundles made UI changes appear to disappear.
- Do not make `/_next/` cache-first in the service worker; stale client chunks caused sidebar hydration mismatch against fresh server HTML.
- Do not reintroduce development route prewarming in login flow; it caused visible `Compiling...`, slower device loading, and unstable page transitions.
- Do not judge the current source only from an old browser tab. Verify source and dev log first.

## Local Verification Sequence

1. Stop old dev servers on port 3000.
2. Confirm `.next-local` does not exist.
3. Run `npm run dev` from `apps/backoffice-web`.
4. Hard refresh the browser tab.
5. Visit `/preview/pos/shift`.
6. Expected current UI:
   - Toolbar has `ดูยอด`, `พิมพ์รายงาน`, `รีเฟรช`.
   - Summary cards are not permanently visible on the main page.
   - Money totals appear through the `ดูยอด` popup.
   - Sidebar lower menu/footer remains reachable without a visible scrollbar.

If hydration mismatch still appears after these steps, open Chrome DevTools > Application > Service Workers and confirm localhost has no active service worker controller.

## Known Runtime Notes

- First request after clearing `.next` can be slow because it is a cold compile.
- A warm second request should be much faster.
- After disabling development prewarm, verified warm login routes: `/login/employee?flow=multi` returned in 221ms and `/login/devices?flow=multi` returned in 405ms after initial cold compiles completed.
- If the page stays on `Loading...`, check `/api/pos/shifts/history` and `/api/pos/session/current` logs before changing UI.
