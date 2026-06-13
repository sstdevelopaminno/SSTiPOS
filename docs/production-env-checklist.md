# Production Environment Checklist

## Public Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Server-only Environment Variables
- `SUPABASE_PRIMARY_URL` (server/runtime primary DB URL; optional until Singapore project exists)
- `SUPABASE_PRIMARY_ANON_KEY` (primary DB anon key)
- `SUPABASE_PRIMARY_SERVICE_ROLE_KEY` (primary DB service role key)
- `SUPABASE_ARCHIVE_URL` (Mumbai legacy archive DB URL)
- `SUPABASE_ARCHIVE_SERVICE_ROLE_KEY` (archive DB service role key; server only)
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
- Until Singapore project exists, POS-Preview/Mumbai remains the configured primary DB.
- After Singapore cutover, all active POS writes must use `SUPABASE_PRIMARY_*`.
- Keep legacy `SUPABASE_*` values mapped to the configured primary DB only during transition.
- Keep Mumbai POS-Preview as archive/rollback source after cutover; do not route new writes to it after that point.
- Archive reads stay disabled until explicitly tested with `ENABLE_ARCHIVE_READS=true`.

## Verification Before Go-live
1. Validate env vars in all Vercel projects.
2. Verify no secret appears in client bundle logs/network.
3. Confirm `SUPABASE_PRIMARY_SERVICE_ROLE_KEY`, `SUPABASE_ARCHIVE_SERVICE_ROLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are only used in server code.
4. Confirm cookie domain and app URLs match deployed domains.
5. For production, set `RATE_LIMIT_BACKEND=upstash` (or `redis`) and verify auth endpoints fail closed when backend is unavailable.
6. Verify login, branch selection, device validation, shift, order, payment, receipt, and recent sales history against the configured primary DB.
