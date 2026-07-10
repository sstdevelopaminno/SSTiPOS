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
