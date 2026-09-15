-- Lets either side of a confirmed booking (the trade, or the internal staff
-- who booked it) propose a reschedule or cancellation that the other party
-- must approve before it takes effect. Approving/rejecting is restricted to
-- whichever side did NOT create the request.

create type public.booking_request_type as enum ('reschedule', 'cancel');
create type public.booking_request_status as enum ('pending', 'approved', 'rejected');

create table if not exists public.booking_change_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  trade_id uuid not null references public.trades (id) on delete cascade,
  project_name text not null,
  trade_name text not null,
  request_type public.booking_request_type not null,
  status public.booking_request_status not null default 'pending',
  requested_by uuid references public.profiles (id) on delete set null,
  requested_by_name text not null,
  requested_by_role public.user_role not null,
  current_start_date date not null,
  current_end_date date not null,
  proposed_start_date date,
  proposed_end_date date,
  reason text,
  created_at timestamptz not null default now(),
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  resolution_note text,
  constraint reschedule_requires_proposed_dates check (
    request_type <> 'reschedule'
    or (
      proposed_start_date is not null
      and proposed_end_date is not null
      and proposed_end_date >= proposed_start_date
    )
  )
);

create index if not exists booking_change_requests_booking_idx
  on public.booking_change_requests (booking_id);
create index if not exists booking_change_requests_trade_status_idx
  on public.booking_change_requests (trade_id, status);

alter table public.booking_change_requests enable row level security;

drop policy if exists "internal staff and owning trade read change requests" on public.booking_change_requests;
create policy "internal staff and owning trade read change requests"
  on public.booking_change_requests for select to authenticated
  using (public.is_internal_staff() or trade_id = public.current_trade_id());

drop policy if exists "internal staff and owning trade create change requests" on public.booking_change_requests;
create policy "internal staff and owning trade create change requests"
  on public.booking_change_requests for insert to authenticated
  with check (
    status = 'pending'
    and requested_by = auth.uid()
    and requested_by_role = public.current_role()
    and (public.is_internal_staff() or trade_id = public.current_trade_id())
  );

drop policy if exists "internal staff and owning trade resolve change requests" on public.booking_change_requests;
create policy "internal staff and owning trade resolve change requests"
  on public.booking_change_requests for update to authenticated
  using (public.is_internal_staff() or trade_id = public.current_trade_id())
  with check (public.is_internal_staff() or trade_id = public.current_trade_id());

-- Only the side that did NOT create the request may approve/reject it, and
-- only while it's still pending; every other field is locked once created.
create or replace function public.resolve_booking_change_request()
returns trigger
language plpgsql
security definer set search_path = public as $$
begin
  if old.status <> 'pending' then
    raise exception 'This request has already been resolved.';
  end if;

  if new.booking_id is distinct from old.booking_id
     or new.trade_id is distinct from old.trade_id
     or new.request_type is distinct from old.request_type
     or new.requested_by is distinct from old.requested_by
     or new.requested_by_name is distinct from old.requested_by_name
     or new.requested_by_role is distinct from old.requested_by_role
     or new.current_start_date is distinct from old.current_start_date
     or new.current_end_date is distinct from old.current_end_date
     or new.proposed_start_date is distinct from old.proposed_start_date
     or new.proposed_end_date is distinct from old.proposed_end_date
     or new.reason is distinct from old.reason
     or new.created_at is distinct from old.created_at
  then
    raise exception 'Only the status and resolution note can be changed.';
  end if;

  if new.status not in ('approved', 'rejected') then
    raise exception 'Invalid status transition.';
  end if;

  if old.requested_by_role = 'trade' then
    if not public.is_internal_staff() then
      raise exception 'Only internal staff can respond to this request.';
    end if;
  else
    if public.current_role() <> 'trade' or public.current_trade_id() <> old.trade_id then
      raise exception 'Only the owning trade can respond to this request.';
    end if;
  end if;

  new.resolved_by := auth.uid();
  new.resolved_at := now();

  return new;
end;
$$;

drop trigger if exists booking_change_requests_resolve on public.booking_change_requests;
create trigger booking_change_requests_resolve
  before update on public.booking_change_requests
  for each row execute function public.resolve_booking_change_request();
