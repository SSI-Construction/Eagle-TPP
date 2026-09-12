-- Records the authenticated user who confirms a booking request. The trigger
-- owns these values so confirmation identity cannot be supplied or rewritten
-- by a client.

alter table public.bookings
  add column if not exists confirmed_by uuid references public.profiles (id) on delete set null,
  add column if not exists confirmed_at timestamptz;

create or replace function public.prevent_unauthorized_booking_changes()
returns trigger
language plpgsql
security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.status = 'confirmed' then
    new.confirmed_by := auth.uid();
    new.confirmed_at := now();
  elsif new.status is distinct from old.status and new.status = 'tentative' then
    new.confirmed_by := null;
    new.confirmed_at := null;
  end if;

  if public.current_role() = 'admin' then
    return new;
  end if;

  if public.current_role() <> 'trade' or public.current_trade_id() <> old.trade_id then
    raise exception 'Only the owning trade or an admin can update this booking';
  end if;

  if new.id is distinct from old.id
     or new.project_id is distinct from old.project_id
     or new.trade_id is distinct from old.trade_id
     or new.crew_id is distinct from old.crew_id
     or new.crew_count is distinct from old.crew_count
     or new.start_date is distinct from old.start_date
     or new.notes is distinct from old.notes
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at
     or (
       new.status is not distinct from old.status
       and (
         new.confirmed_by is distinct from old.confirmed_by
         or new.confirmed_at is distinct from old.confirmed_at
       )
     )
  then
    raise exception 'Trades can only confirm requests or update booking end dates';
  end if;

  if new.status is distinct from old.status
     and not (old.status = 'tentative' and new.status = 'confirmed')
  then
    raise exception 'Trades can only change a requested booking to confirmed';
  end if;

  if new.end_date is distinct from old.end_date and old.status <> 'confirmed' then
    raise exception 'Confirm the booking before changing its end date';
  end if;

  return new;
end;
$$;
