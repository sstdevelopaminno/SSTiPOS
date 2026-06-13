# Future Repository Separation Plan

Last updated: 2026-06-14

## Decision

POS/Sales and SSTiPOS Support should run as separate GitHub repositories and separate Vercel Projects, while continuing to use the same existing Supabase project/database.

- POS repository: `sstdevelopaminno/POS-Preview`
- POS Vercel project/domain: `sstipos-ten.vercel.app`
- IT repository: `sstdevelopaminno/SSTiPOSSupport`
- IT Vercel project/domain: `sstipos-support.vercel.app`
- Local POS runtime: `pnpm dev` or `pnpm dev:pos` on port `3000`
- Local IT runtime: `pnpm dev:it-support` on port `30000`

## Guardrails

- Do not create a new Supabase project or database for IT Support.
- Do not commit `.env`, `.env.local`, Vercel project IDs, service role keys, database passwords, or local test passwords.
- Keep `packages/*` and `supabase/migrations/*` synchronized between repositories until a shared package/migration release process exists.
- Treat Supabase migrations as one canonical history. If either repo adds a migration, the other repo must receive the same migration before deploy.
- POS Vercel env must use `APP_SURFACE=pos`.
- IT Vercel env must use `APP_SURFACE=it_admin`.
- Service role keys are server-side only and must never be exposed through `NEXT_PUBLIC_*`.

## Initial Split Process

1. Start from branch `fix/pos-sales-cart-checkout`, because it contains the latest POS checkout fixes and IT Support UI/role work.
2. Create sibling folder `E:\SSTiPOSSupport`.
3. Copy the monorepo source into that folder excluding `.git`, `.env*`, `.vercel`, `node_modules`, `.next*`, logs, build output, and local worktrees.
4. Initialize/link the IT folder to `https://github.com/sstdevelopaminno/SSTiPOSSupport.git`.
5. Commit the split documentation and current IT Support code on a non-main branch first.
6. Deploy preview from each Vercel project before promoting production.

## Development Workflow After Split

POS work should happen in `E:\POS Preview` and be pushed to `sstdevelopaminno/POS-Preview`.

IT Support work should happen in `E:\SSTiPOSSupport` and be pushed to `sstdevelopaminno/SSTiPOSSupport`.

When a change touches shared code or database schema:

1. Apply the same shared package or migration changes in both folders.
2. Run `pnpm --filter backoffice-web typecheck`.
3. Run `pnpm --filter backoffice-web lint`.
4. Verify POS `/preview/pos` still redirects or loads according to POS session state.
5. Verify IT `/it-admin/login` and `/it-admin` still load on port `30000`.

## Production Deployment Rule

Use preview deployments first. Only run `vercel --prod` or promote a preview after POS and IT smoke checks pass and the target project has the correct `APP_SURFACE` value.
