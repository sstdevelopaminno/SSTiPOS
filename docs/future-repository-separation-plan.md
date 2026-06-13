# Future Repository Separation Plan

Status: planning only
Decision date: 2026-06-13

## Current Decision

- Keep the existing GitHub repository and monorepo.
- Do not move files or create a second repository yet.
- Do not merge repository-split work until ownership, release, and migration rules are approved.
- Run POS and SSTiPOS Support as separate runtime/deployment profiles from `apps/backoffice-web`.
- Keep one existing Supabase database for both profiles.

## Current Separation Boundary

| Concern | POS | SSTiPOS Support |
| --- | --- | --- |
| Local command | `pnpm dev` or `pnpm dev:pos` | `pnpm dev:it-support` |
| Local port | `3000` | `30000` |
| Vercel project | Existing POS project (`sstipos`) | `sstipos-support` |
| `APP_SURFACE` | `pos` or unset/default | `it_admin` |
| Supabase | Existing shared database | Same existing shared database |
| Source app | `apps/backoffice-web` | `apps/backoffice-web` |

`APP_SURFACE` is an operational marker, not a security control. Route access must continue to use authenticated server-side role and scope guards.

## Canonical Shared Assets

These remain single-source and must not be copied into independently evolving versions:

- `packages/shared-types`
- `packages/pos-domain`
- `packages/ui`
- `supabase/migrations`
- `supabase/seeds`
- authentication, tenant/branch scope, feature-gate, and audit contracts

All database migrations must remain in one ordered history. POS and IT Support must never maintain separate migration directories against the shared database.

## Preconditions For A Future GitHub Split

1. Define ownership and release cadence for each application.
2. Extract stable shared packages into a versioned workspace/package source or a dedicated shared repository.
3. Design one canonical migration pipeline with one owner and one deployment lock.
4. Add contract tests that run against both applications before shared package releases.
5. Document compatible version ranges for shared API, auth, and database contracts.
6. Prove independent preview deployments without duplicating secrets or production database mutation workflows.
7. Prepare rollback procedures for application and shared package releases.

## Safe Split Sequence

1. First create explicit app boundaries inside this monorepo while preserving behavior.
2. Move only surface-owned routes and components after dependency mapping and tests exist.
3. Keep shared packages and migrations canonical.
4. Validate both Vercel previews against the same non-destructive test scope.
5. Propose repository creation and history strategy for review.
6. Create or split repositories only after explicit approval.

## Stop Conditions

Do not proceed with a repository split if it would:

- duplicate or fork Supabase migrations
- copy secrets into tracked files
- make shared package versions ambiguous
- let either application deploy incompatible database assumptions
- bypass existing tenant, branch, role, feature-gate, or audit protections
