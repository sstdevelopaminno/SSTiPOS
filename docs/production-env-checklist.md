# Production Environment Checklist

## Public Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Deployment Profile
- POS project: `APP_SURFACE=pos` (or leave unset while the application default remains `pos`)
- `sstipos-support`: `APP_SURFACE=it_admin`
- `APP_SURFACE` is not a secret and is not an authorization boundary.

## Server-only Environment Variables
- `SUPABASE_PRIMARY_URL` (server/runtime alias for the existing shared primary DB)
- `SUPABASE_PRIMARY_ANON_KEY` (existing shared primary DB anon key)
- `SUPABASE_PRIMARY_SERVICE_ROLE_KEY` (existing shared primary DB service role key)
- `SUPABASE_ARCHIVE_URL` (optional; leave unused while archive mode is disabled)
- `SUPABASE_ARCHIVE_SERVICE_ROLE_KEY` (optional server-only archive key; leave unused while archive mode is disabled)
- `HOT_DATA_RETENTION_MONTHS=12`
- `ENABLE_ARCHIVE_READS=false`
- `ENABLE_DUAL_DB_MODE=false`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SESSION_SECRET`
- `INTERNAL_API_SECRET` (if used)
- `POS_LOGIN_CONTEXT_TTL_MINUTES`
- `POS_PUBLIC_RATE_LIMIT_WINDOW_SECONDS`
- `POS_STORE_RESOLVE_RATE_LIMIT_MAX`
- `POS_STORE_LOGIN_CONTEXT_RATE_LIMIT_MAX`
- `POS_LOGIN_RATE_LIMIT_IP_MAX`
- `POS_LOGIN_RATE_LIMIT_DEVICE_MAX`
- `RATE_LIMIT_BACKEND` (`memory|upstash|redis`)
- `RATE_LIMIT_REDIS_PREFIX`
- `UPSTASH_REDIS_REST_URL` (required when backend is `upstash|redis`)
- `UPSTASH_REDIS_REST_TOKEN` (required when backend is `upstash|redis`)
- `APP_BASE_URL`
- `POS_APP_URL`
- `ID_APP_URL`
- `ADMIN_APP_URL`
- `MARKETING_APP_URL`
- `COOKIE_DOMAIN`

## Rules
- Service role keys must never use `NEXT_PUBLIC_` prefix.
- Never commit real secrets into the repository.
- Keep `.env.example` as placeholders only.
- Rotate secrets before production if any secret was previously shared.
- Separate values for Development / Preview / Production.
- Maintain separate env configuration in the existing POS Vercel project and `sstipos-support`.
- Both Vercel projects must use the same existing Supabase database.
- Duplicate the required Supabase values into each Vercel project's env settings; Vercel env is project-scoped.
- Set `APP_SURFACE=it_admin` in the `sstipos-support` Vercel project.
- Do not create a new Supabase project for IT Support.
- Keep legacy and `SUPABASE_PRIMARY_*` names mapped consistently to the same active database while both naming schemes remain in the app.
- Keep archive/dual-database reads disabled unless a future approved architecture decision explicitly enables them.

## Verification Before Go-live
1. Validate env vars separately in the existing POS Vercel project and `sstipos-support`.
2. Confirm the Supabase URL/project reference matches across both Vercel projects.
3. Confirm each checkout's `.vercel/project.json` points to the intended Vercel project before pulling env or deploying.
4. Verify no secret appears in client bundle logs/network.
5. Confirm `SUPABASE_PRIMARY_SERVICE_ROLE_KEY`, `SUPABASE_ARCHIVE_SERVICE_ROLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are only used in server code.
6. Confirm cookie domain and app URLs match deployed domains.
7. For production, set `RATE_LIMIT_BACKEND=upstash` (or `redis`) and verify auth endpoints fail closed when backend is unavailable.
8. Verify login, branch selection, device validation, shift, order, payment, receipt, and recent sales history against the configured primary DB.
