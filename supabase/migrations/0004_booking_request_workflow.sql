-- Adds project identifiers and locations, makes new bookings requests by
-- default, and restricts non-admin booking updates to the owning trade's
-- confirmation and end-date workflows.

alter table public.projects
  add column if not exists project_number text,
  add column if not exists map_link text;

update public.projects
set project_number = 'PROJECT-' || upper(substr(id::text, 1, 8))
where project_number is null;

alter table public.projects
  alter column project_number set not null;

create unique index if not exists projects_project_number_idx
  on public.projects (lower(project_number));

alter table public.bookings
  alter column status set default 'tentative';

drop policy if exists "internal staff update bookings" on public.bookings;
drop policy if exists "admins update bookings" on public.bookings;
create policy "admins update bookings"
  on public.bookings for update to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create or replace function public.prevent_unauthorized_booking_changes()
returns trigger
language plpgsql
security definer set search_path = public as $$
begin
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

drop trigger if exists bookings_prevent_unauthorized_date_changes on public.bookings;
drop trigger if exists bookings_prevent_unauthorized_changes on public.bookings;
drop function if exists public.prevent_unauthorized_date_changes();

create trigger bookings_prevent_unauthorized_changes
  before update on public.bookings
  for each row execute function public.prevent_unauthorized_booking_changes();
