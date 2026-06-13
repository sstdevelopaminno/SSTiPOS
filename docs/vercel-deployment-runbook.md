# Vercel Deployment Runbook

## Project-to-Domain Mapping
- POS:
  - Vercel project: existing POS project (currently `sstipos`).
  - Local runtime: `http://localhost:3000`.
- IT Support:
  - Vercel project: `sstipos-support`.
  - Local runtime: `http://localhost:30000`.
  - Required project env: `APP_SURFACE=it_admin`.
- Both deployments currently build `apps/backoffice-web`.
- A checkout's `.vercel/project.json` must point to the intended project before any env pull or deploy.
- `marketing-web` (if introduced later):
  - `www.<domain>`.

## Environment Separation
- POS and IT Support have separate Vercel environment-variable sets.
- Configure Development, Preview, and Production scopes independently in both Vercel projects.
- Both projects must point to the same existing Supabase database unless an explicit architecture decision changes this.
- Matching Supabase values must still be entered and maintained separately per Vercel project.
- Do not create a new Supabase project for IT Support.
- Keep service-role keys server-only and never expose them through `NEXT_PUBLIC_*`.
- `APP_SURFACE` is a deployment marker only. Authentication and authorization must continue to use server-side session/role guards.

## Required Security Environment Variables
- `SUPABASE_SERVICE_ROLE_KEY`
- `POS_SESSION_HANDOFF_SECRET`
- `POS_PUBLIC_RATE_LIMIT_WINDOW_SECONDS`
- `POS_STORE_RESOLVE_RATE_LIMIT_MAX`
- `POS_STORE_LOGIN_CONTEXT_RATE_LIMIT_MAX`
- `POS_LOGIN_RATE_LIMIT_IP_MAX`
- `POS_LOGIN_RATE_LIMIT_DEVICE_MAX`

## Vercel Linking Steps
1. Use separate worktrees/checkouts for POS and IT Support when operating both projects concurrently.
2. Link the POS checkout to the existing POS Vercel project.
3. Link the IT Support checkout to `sstipos-support`.
4. Confirm `.vercel/project.json` contains the expected `projectName` before `vercel env pull`, build, or deploy.
5. Set root directory in both projects:
   - `apps/backoffice-web`
6. Configure custom domains for the appropriate project.
7. Configure redirects/rewrites only in app-owned `vercel.json`.

Never re-link the POS checkout to `sstipos-support` merely to deploy IT Support; use its dedicated worktree instead.

## Local Commands

```bash
# POS default, APP_SURFACE defaults to pos, port 3000
pnpm dev

# Explicit POS profile, port 3000
pnpm dev:pos

# SSTiPOS Support, APP_SURFACE=it_admin, port 30000
pnpm dev:it-support
```

The local surface commands use separate Next.js cache directories, so POS and IT Support can run concurrently without sharing build output.

## Git Branch to Deploy Target
- `main` -> Production deployment.
- `develop` -> Preview/Staging deployment.
- `feature/*` -> Preview deployment.
- `hotfix/*` -> Preview first, then merge to `main` for Production.

## Deployment Verification
After each production deployment:
1. Check health route and homepage load.
2. Verify login context flow (`/login/store -> /login/branches|employee -> /login/devices`).
3. Verify POS session and shift gate endpoints.
4. Check logs for elevated 4xx/5xx.

## Rollback
- Use Vercel dashboard or CLI rollback to previous known-good deployment.
- Keep database schema compatibility in mind before rollback.
