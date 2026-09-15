-- Master scheduler tool for trades: lets a trade assign its own crew members
-- to jobs booked outside this company (reusing trade_external_commitments as
-- the job record), and exposes a per-trade, token-authenticated .ics feed so
-- bookings/cancellations made in this app auto-sync to the trade's personal
-- calendar app via subscription.

create table if not exists public.trade_external_commitment_crew_members (
  external_commitment_id uuid not null references public.trade_external_commitments (id) on delete cascade,
  crew_member_id uuid not null references public.trade_crew_members (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (external_commitment_id, crew_member_id)
);

create index if not exists external_commitment_crew_members_member_idx
  on public.trade_external_commitment_crew_members (crew_member_id);

alter table public.trade_external_commitment_crew_members enable row level security;

drop policy if exists "trades manage their own external job assignments" on public.trade_external_commitment_crew_members;
create policy "trades manage their own external job assignments"
  on public.trade_external_commitment_crew_members for all to authenticated
  using (
    exists (
      select 1
      from public.trade_external_commitments commitment
      join public.trade_crew_members member on member.id = trade_external_commitment_crew_members.crew_member_id
      where commitment.id = trade_external_commitment_crew_members.external_commitment_id
        and commitment.trade_id = public.current_trade_id()
        and member.trade_id = public.current_trade_id()
    )
  )
  with check (
    exists (
      select 1
      from public.trade_external_commitments commitment
      join public.trade_crew_members member on member.id = trade_external_commitment_crew_members.crew_member_id
      where commitment.id = trade_external_commitment_crew_members.external_commitment_id
        and commitment.trade_id = public.current_trade_id()
        and member.trade_id = public.current_trade_id()
    )
  );

-- Kept in a separate table (not on `trades`) since `trades` is broadly
-- readable by every authenticated user — this token must stay secret.
create table if not exists public.trade_calendar_export_tokens (
  trade_id uuid primary key references public.trades (id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now()
);

alter table public.trade_calendar_export_tokens enable row level security;

drop policy if exists "trades and admins read their own export token" on public.trade_calendar_export_tokens;
create policy "trades and admins read their own export token"
  on public.trade_calendar_export_tokens for select to authenticated
  using (public.current_role() = 'admin' or trade_id = public.current_trade_id());

drop policy if exists "trades and admins create their own export token" on public.trade_calendar_export_tokens;
create policy "trades and admins create their own export token"
  on public.trade_calendar_export_tokens for insert to authenticated
  with check (public.current_role() = 'admin' or trade_id = public.current_trade_id());
