create or replace function public.deduct_order_recipe_stock(
  p_tenant_id uuid,
  p_branch_id uuid,
  p_order_id uuid,
  p_order_type text,
  p_created_by uuid default null,
  p_reason text default 'Auto deduction from POS sale',
  p_request_id text default null
)
returns table(ingredient_id uuid, quantity_delta numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allow_negative_stock boolean := false;
  v_stock_request_id text;
  rec record;
begin
  select coalesce(s.allow_negative_stock, false)
    into v_allow_negative_stock
  from public.branch_inventory_settings s
  where s.tenant_id = p_tenant_id
    and s.branch_id = p_branch_id
  limit 1;

  for rec in
    with recipe_requirements as (
      select
        r.ingredient_id,
        sum(round((oi.quantity * r.quantity_per_item)::numeric, 0))::numeric as required_qty_grams
      from public.order_items oi
      join public.products p
        on p.id = oi.product_id
       and p.tenant_id = p_tenant_id
       and p.branch_id = p_branch_id
      join public.recipes r
        on r.product_id = oi.product_id
       and r.tenant_id = p_tenant_id
       and r.branch_id = p_branch_id
      where oi.order_id = p_order_id
        and oi.tenant_id = p_tenant_id
        and oi.branch_id = p_branch_id
        and coalesce(p.stock_deduction_mode, 'unit_only') = 'recipe_deduction'
        and (
          coalesce(r.applies_when_takeaway_only, false) = false
          or (coalesce(r.applies_when_takeaway_only, false) = true and p_order_type in ('takeaway', 'delivery_manual'))
        )
      group by r.ingredient_id
    )
    select rr.ingredient_id, rr.required_qty_grams
    from recipe_requirements rr
    where rr.required_qty_grams > 0
  loop
    v_stock_request_id := case
      when p_request_id is null then null
      else p_request_id || ':' || rec.ingredient_id::text
    end;

    update public.ingredients i
    set quantity_on_hand = round(i.quantity_on_hand - rec.required_qty_grams, 0)
    where i.id = rec.ingredient_id
      and i.tenant_id = p_tenant_id
      and i.branch_id = p_branch_id
      and (v_allow_negative_stock or i.quantity_on_hand >= rec.required_qty_grams);

    if not found then
      if exists (
        select 1
        from public.ingredients i
        where i.id = rec.ingredient_id
          and i.tenant_id = p_tenant_id
          and i.branch_id = p_branch_id
      ) then
        raise exception 'INSUFFICIENT_STOCK:%', rec.ingredient_id;
      end if;

      raise exception 'INGREDIENT_NOT_FOUND:%', rec.ingredient_id;
    end if;

    insert into public.stock_movements (
      tenant_id,
      branch_id,
      ingredient_id,
      movement_type,
      quantity_delta,
      reason,
      ref_table,
      ref_id,
      created_by,
      request_id
    )
    values (
      p_tenant_id,
      p_branch_id,
      rec.ingredient_id,
      'sale_deduction',
      -rec.required_qty_grams,
      p_reason,
      'orders',
      p_order_id,
      p_created_by,
      v_stock_request_id
    );

    ingredient_id := rec.ingredient_id;
    quantity_delta := -rec.required_qty_grams;
    return next;
  end loop;
end;
$$;

comment on function public.deduct_order_recipe_stock(uuid, uuid, uuid, text, uuid, text, text) is
  'Deducts recipe ingredient stock for an order and writes stock movements with per-ingredient request_id suffixes to avoid duplicate request_id conflicts.';

revoke all on function public.deduct_order_recipe_stock(uuid, uuid, uuid, text, uuid, text, text) from public;
grant execute on function public.deduct_order_recipe_stock(uuid, uuid, uuid, text, uuid, text, text) to authenticated, service_role;
