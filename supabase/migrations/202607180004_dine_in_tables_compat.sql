-- Pair 1 shared schema consolidation: dine_in_tables -> dining_tables
-- Keep the legacy table in place. This release adds a read-only compatibility
-- shape for old consumers while new code continues to use dining_tables.

create or replace view public.dine_in_tables_compat
with (security_invoker = true)
as
select
  id,
  tenant_id,
  branch_id,
  table_code,
  capacity as seats,
  is_active,
  created_at
from public.dining_tables;

comment on view public.dine_in_tables_compat is
  'Compatibility view for deprecated public.dine_in_tables. Canonical table is public.dining_tables.';

grant select on public.dine_in_tables_compat to authenticated, service_role;

comment on table public.dine_in_tables is
  'Deprecated legacy table. Do not write new data here; use public.dining_tables. Keep until at least one release after all FK/API/component usage is gone.';
