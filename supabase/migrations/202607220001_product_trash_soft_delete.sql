alter table public.products
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.users_profiles(id),
  add column if not exists delete_reason text,
  add column if not exists restore_until timestamptz;

create index if not exists idx_products_trash_scope
  on public.products(tenant_id, branch_id, deleted_at, restore_until);

comment on column public.products.deleted_at is
  'Soft delete timestamp. Trashed products stay available for historical orders, receipts, shift close, and accounting audit.';

comment on column public.products.restore_until is
  'Retention deadline for trash restore, controlled by package/backoffice policy.';
