create table if not exists public.mobile_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  member_token text,
  points_balance integer not null default 0,
  stamp_balance integer not null default 0,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, branch_id, phone)
);

alter table if exists public.mobile_members
  add column if not exists email text,
  add column if not exists member_token text,
  add column if not exists deleted_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists status text not null default 'active',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists mobile_members_member_token_key
  on public.mobile_members(member_token)
  where member_token is not null;

create index if not exists mobile_members_active_lookup_idx
  on public.mobile_members(tenant_id, branch_id, phone)
  where deleted_at is null;

alter table public.mobile_members enable row level security;
