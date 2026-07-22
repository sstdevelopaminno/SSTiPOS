alter table if exists public.mobile_members
  add column if not exists email text,
  add column if not exists member_token text,
  add column if not exists deleted_at timestamptz;

create unique index if not exists mobile_members_member_token_key
  on public.mobile_members(member_token)
  where member_token is not null;

create index if not exists mobile_members_active_lookup_idx
  on public.mobile_members(tenant_id, branch_id, phone)
  where deleted_at is null;
