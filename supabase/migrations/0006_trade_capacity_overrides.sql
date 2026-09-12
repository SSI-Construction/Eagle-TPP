-- Lets a trade temporarily replace its baseline active-crew capacity for a
-- bounded date range.

create extension if not exists "btree_gist";

create table if not exists public.trade_capacity_overrides (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  total_crews int not null,
  note text,
  created_at timestamptz not null default now(),
  constraint capacity_overrides_date_range check (end_date >= start_date),
  constraint capacity_overrides_total_positive check (total_crews > 0),
  constraint capacity_overrides_no_overlap exclude using gist (
    trade_id with =,
    daterange(start_date, end_date, '[]') with &&
  )
);

create index if not exists capacity_overrides_trade_date_idx
  on public.trade_capacity_overrides (trade_id, start_date, end_date);

alter table public.trade_capacity_overrides enable row level security;

drop policy if exists "capacity overrides are readable by authenticated users"
  on public.trade_capacity_overrides;
create policy "capacity overrides are readable by authenticated users"
  on public.trade_capacity_overrides for select to authenticated using (true);

drop policy if exists "admins or the trade itself manage capacity overrides"
  on public.trade_capacity_overrides;
create policy "admins or the trade itself manage capacity overrides"
  on public.trade_capacity_overrides for all to authenticated
  using (public.current_role() = 'admin' or trade_id = public.current_trade_id())
  with check (public.current_role() = 'admin' or trade_id = public.current_trade_id());