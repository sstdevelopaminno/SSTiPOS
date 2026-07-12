create or replace function app.enforce_shift_close_rules() returns trigger language plpgsql as $$
declare
  unpaid_count integer;
  mismatch boolean;
  is_overdue_auto_close boolean;
begin
  if new.status = 'closed' and old.status <> 'closed' then
    select count(*) into unpaid_count
    from orders o
    where o.shift_id = new.id
      and o.order_type = 'dine_in'
      and o.status <> 'completed'
      and o.status <> 'cancelled';

    mismatch := coalesce(new.expected_cash, 0) <> coalesce(new.actual_cash, 0);
    is_overdue_auto_close :=
      coalesce(new.metadata ->> 'close_reason', '') = 'system_auto_close_overdue_shift'
      and coalesce((new.metadata ->> 'overdue_auto_close')::boolean, false) = true
      and coalesce((new.metadata ->> 'cash_count_required')::boolean, true) = false;

    if (unpaid_count > 0 or mismatch) and not is_overdue_auto_close then
      if new.close_override_approval_id is null then
        raise exception 'Manager/owner override is required to close shift.';
      end if;

      if not exists (
        select 1
        from manager_pin_approvals a
        where a.id = new.close_override_approval_id
          and a.action = 'shift_close_override'
          and a.target_table = 'shifts'
          and a.target_id = new.id
          and a.expires_at > now()
      ) then
        raise exception 'Shift close override approval is invalid or expired.';
      end if;
    end if;

    new.closed_at := now();
  end if;

  return new;
end;
$$;
