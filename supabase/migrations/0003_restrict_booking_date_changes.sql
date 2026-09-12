-- Enforces at the database level that only an admin or the owning trade can
-- change a booking's dates — PMs/site supervisors can create bookings (insert)
-- but cannot reschedule ones that are already booked.

create or replace function public.prevent_unauthorized_date_changes()
returns trigger
language plpgsql
security definer set search_path = public as $$
begin
  if (new.start_date is distinct from old.start_date or new.end_date is distinct from old.end_date)
     and public.current_role() <> 'admin'
     and not (public.current_role() = 'trade' and public.current_trade_id() = old.trade_id)
  then
    raise exception 'Only the trade or an admin can change booking dates';
  end if;
  return new;
end;
$$;

create trigger bookings_prevent_unauthorized_date_changes
  before update on public.bookings
  for each row execute function public.prevent_unauthorized_date_changes();
