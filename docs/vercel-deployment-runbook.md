# Vercel Deployment Runbook

## Project-to-Domain Mapping
- `backoffice-web` (POS + Admin surfaces in this repo):
  - `admin.<domain>` for admin/backoffice.
  - `pos.<domain>` if split deployment is enabled later.
- `qr-login-web`:
  - `id.<domain>`.
- `marketing-web` (if introduced later):
  - `www.<domain>`.

## Environment Separation
- Development:
  - Local machine + `.env.local`.
- Preview:
  - Auto-created from PR deployments.
  - Uses preview env vars and preview database/project where possible.
- Production:
  - `main` branch deployment.
  - Uses production env vars and production Supabase project.

## Required Security Environment Variables
- `SUPABASE_SERVICE_ROLE_KEY`
- `POS_SESSION_HANDOFF_SECRET`
- `POS_QR_APPROVAL_SECRET` (required: QR approval endpoint is fail-closed when missing)
- `POS_PUBLIC_RATE_LIMIT_WINDOW_SECONDS`
- `POS_QR_CREATE_RATE_LIMIT_MAX`
- `POS_STORE_RESOLVE_RATE_LIMIT_MAX`
- `POS_STORE_LOGIN_CONTEXT_RATE_LIMIT_MAX`
- `POS_LOGIN_RATE_LIMIT_IP_MAX`
- `POS_LOGIN_RATE_LIMIT_DEVICE_MAX`

## Vercel Linking Steps
1. Link each app directory to its Vercel project (`vercel link`).
2. Set root directory per project:
   - `apps/backoffice-web`
   - `apps/qr-login-web`
3. Configure custom domains:
   - `admin.<domain>` -> backoffice project
   - `id.<domain>` -> qr-login project
4. Configure redirects/rewrites only in app-owned `vercel.json`.

## Git Branch to Deploy Target
- `main` -> Production deployment.
- `develop` -> Preview/Staging deployment.
- `feature/*` -> Preview deployment.
- `hotfix/*` -> Preview first, then merge to `main` for Production.

## Deployment Verification
After each production deployment:
1. Check health route and homepage load.
2. Verify login context flow (`store -> ctx -> /scan`).
3. Verify POS session and shift gate endpoints.
4. Check logs for elevated 4xx/5xx.

## Rollback
- Use Vercel dashboard or CLI rollback to previous known-good deployment.
- Keep database schema compatibility in mind before rollback.
