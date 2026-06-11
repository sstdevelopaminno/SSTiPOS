# Codex Token-Saving Workflow

Last updated: 2026-06-11

## Purpose

Use this workflow for SST iPOS stability work so fixes stay small, reviewable, and tied to real broken flows.

## Read First

1. `context.md`
2. `README.md`
3. `docs/final-implementation-audit.md`
4. `docs/pos-multi-owner-branch-architecture.md`
5. `docs/pos-login-context-handoff.md`
6. `docs/manual-qa-checklist.md`
7. `docs/production-readiness-checklist.md`
8. `docs/monitoring-alerting-runbook.md`
9. `docs/go-live-evidence-checklist.md`

## Working Rules

- Do not scan the whole repository blindly.
- Inspect only files tied to the failing flow.
- Do not refactor unrelated code.
- Do not rewrite architecture.
- Do not change database schema unless required and explained first.
- Keep service-role logic server-only.
- Never trust client-sent tenant, branch, device, store, owner, or role identifiers.
- Preserve login context validation, shift gate, audit logging, rate limiting, tenant isolation, and branch scope.

## Verification Order

1. Run `npm run typecheck`.
2. Run `npm run lint`.
3. If the local shell cannot run npm/node, record the environment blocker and run the closest available equivalent only if safe.
4. Fix only current broken-flow errors first.
5. Re-run the minimum affected checks.

## Completion Rule

Status is "Improved, but not yet 100% production complete" until typecheck, lint, login, branch selection, device selection, shift, order, payment, receipt, manual QA, deployment, and production environment checks all pass.
