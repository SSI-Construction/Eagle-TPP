-- Private trade roster and per-booking personnel assignments.

create table if not exists public.trade_crew_members (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades (id) on delete cascade,
  name text not null,
  role text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint crew_members_name_present check (length(trim(name)) > 0),
  constraint crew_members_role_present check (length(trim(role)) > 0)
);

create table if not exists public.booking_crew_members (
  booking_id uuid not null references public.bookings (id) on delete cascade,
  crew_member_id uuid not null references public.trade_crew_members (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (booking_id, crew_member_id)
);

create index if not exists crew_members_trade_idx
  on public.trade_crew_members (trade_id, is_active);
create index if not exists booking_crew_members_member_idx
  on public.booking_crew_members (crew_member_id);

alter table public.trade_crew_members enable row level security;
alter table public.booking_crew_members enable row level security;

drop policy if exists "trades manage their own crew members" on public.trade_crew_members;
create policy "trades manage their own crew members"
  on public.trade_crew_members for all to authenticated
  using (trade_id = public.current_trade_id())
  with check (trade_id = public.current_trade_id());

drop policy if exists "trades manage their own booking assignments" on public.booking_crew_members;
create policy "trades manage their own booking assignments"
  on public.booking_crew_members for all to authenticated
  using (
    exists (
      select 1
      from public.bookings booking
      join public.trade_crew_members member on member.id = booking_crew_members.crew_member_id
      where booking.id = booking_crew_members.booking_id
        and booking.trade_id = public.current_trade_id()
        and member.trade_id = public.current_trade_id()
    )
  )
  with check (
    exists (
      select 1
      from public.bookings booking
      join public.trade_crew_members member on member.id = booking_crew_members.crew_member_id
      where booking.id = booking_crew_members.booking_id
        and booking.trade_id = public.current_trade_id()
        and member.trade_id = public.current_trade_id()
    )
  );