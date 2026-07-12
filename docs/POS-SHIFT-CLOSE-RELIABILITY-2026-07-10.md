# POS Shift Close Reliability Update (2026-07-10)

## Scope

- Fixed the shift-cycle reminder where `Continue shift` or `Close shift` could report a timeout while the server was still completing the shift mutation.
- Updated the POS sidebar brand area to show only the CpIPOS symbol mark.

## Root cause and fix

- The client aborted shift close/open requests after 12 seconds. Slow compilation, network, or database response could finish after that boundary and leave the UI uncertain.
- Shift close/open mutations now allow 30 seconds; logout allows 15 seconds.
- On a mutation error or timeout, the UI reloads the current POS session/shift state before enabling another action. This prevents a completed server mutation from being presented as permanently stuck.
- Server-side tenant, branch, POS session, permission, active-shift, and unique-open-shift enforcement remain unchanged.

## Verification

- Run TypeScript, ESLint, integration tests, and production build.
- Manually test both actions after the configured shift window: `Continue shift` must close the prior shift and open/reuse the next shift; `Close shift` must close the shift and return to branch selection.
- Test a delayed response and confirm the buttons recover with refreshed shift state instead of remaining disabled.

## 2026-07-11 follow-up

- Shift close/open popup requests now allow 60 seconds before the client reports a timeout.
- Morning and afternoon shifts now move from overdue to urgent after 30 minutes, and to overdue-lock after 45 minutes, matching the night-shift timing model.
- Historical note: the previous overdue-lock behavior required manager/owner PIN before continuing or closing the shift.
- As of the 2026-07-12 follow-up, overdue auto-close no longer requires manager/owner PIN. The API closes from recorded sales/payment totals, leaves manual cash-count fields empty when no closing cash is supplied, and writes `system_auto_close_overdue_shift` metadata for shift history/audit review.

## 2026-07-12 follow-up

- Overdue shifts can auto-close without manager/owner PIN so staff can open the next sales shift without waiting for a supervisor.
- Auto-close does not require `closing_cash`; `closing_cash` and `actual_cash` stay empty, while shift history computes expected cash from opening cash plus cash sales.
- Audit metadata records `overdue_auto_close`, `auto_close_uses_sales_total`, and `cash_count_required=false` so Settings/History can identify system-closed shifts.
- Migration `supabase/migrations/202607120001_allow_overdue_shift_auto_close.sql` updates `app.enforce_shift_close_rules()` so the database trigger accepts overdue auto-close metadata without requiring `shift_close_override`.
