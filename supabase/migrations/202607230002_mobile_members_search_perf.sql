create extension if not exists pg_trgm with schema extensions;

create index if not exists mobile_members_branch_updated_idx
  on public.mobile_members(tenant_id, branch_id, updated_at desc)
  where deleted_at is null;

create index if not exists mobile_members_phone_prefix_idx
  on public.mobile_members(tenant_id, branch_id, phone text_pattern_ops)
  where deleted_at is null;

create index if not exists mobile_members_name_trgm_idx
  on public.mobile_members using gin (name gin_trgm_ops)
  where deleted_at is null;

create index if not exists mobile_members_email_trgm_idx
  on public.mobile_members using gin (email gin_trgm_ops)
  where deleted_at is null and email is not null;

create index if not exists mobile_members_token_trgm_idx
  on public.mobile_members using gin (member_token gin_trgm_ops)
  where deleted_at is null and member_token is not null;
