-- Trade capacity scheduling app: initial schema, RLS policies, and seed data.
-- Run this in the Supabase SQL editor (or via `supabase db push`).

create extension if not exists "pgcrypto";

create type public.user_role as enum ('admin', 'pm', 'site_supervisor', 'trade');
create type public.booking_status as enum ('tentative', 'confirmed', 'cancelled');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.trade_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0
);

create table public.trades (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  phone text,
  email text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.trade_category_links (
  trade_id uuid not null references public.trades (id) on delete cascade,
  category_id uuid not null references public.trade_categories (id) on delete cascade,
  primary key (trade_id, category_id)
);

-- One row per authenticated user, created automatically on signup (see trigger below).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null,
  role public.user_role not null default 'pm',
  trade_id uuid references public.trades (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.crews (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades (id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  pm_id uuid references public.profiles (id),
  site_supervisor_id uuid references public.profiles (id),
  start_date date,
  end_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  trade_id uuid not null references public.trades (id) on delete cascade,
  crew_id uuid references public.crews (id) on delete set null,
  crew_count int not null default 1,
  start_date date not null,
  end_date date not null,
  status public.booking_status not null default 'confirmed',
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint bookings_date_range check (end_date >= start_date),
  constraint bookings_crew_count_positive check (crew_count > 0)
);

-- Work a trade has committed to outside this system (other GCs, time off, etc.)
-- that still consumes crew capacity and should be reflected in availability.
create table public.trade_external_commitments (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades (id) on delete cascade,
  crew_count int not null default 1,
  start_date date not null,
  end_date date not null,
  note text,
  created_at timestamptz not null default now(),
  constraint external_commitments_date_range check (end_date >= start_date)
);

create index bookings_trade_date_idx on public.bookings (trade_id, start_date, end_date);
create index external_commitments_trade_date_idx on public.trade_external_commitments (trade_id, start_date, end_date);
create index crews_trade_idx on public.crews (trade_id);

-- ---------------------------------------------------------------------------
-- Helper functions (security definer so they can read profiles under RLS)
-- ---------------------------------------------------------------------------

create or replace function public.current_role()
returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_trade_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select trade_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_internal_staff()
returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_role() in ('admin', 'pm', 'site_supervisor');
$$;

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.email,
    'pm'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.trade_categories enable row level security;
alter table public.trades enable row level security;
alter table public.trade_category_links enable row level security;
alter table public.crews enable row level security;
alter table public.projects enable row level security;
alter table public.bookings enable row level security;
alter table public.trade_external_commitments enable row level security;

-- profiles
create policy "profiles are readable by all authenticated users"
  on public.profiles for select to authenticated using (true);
create policy "users can update their own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid() or public.current_role() = 'admin');
create policy "admins can insert profiles"
  on public.profiles for insert to authenticated
  with check (public.current_role() = 'admin' or id = auth.uid());

-- trade_categories
create policy "trade categories are readable by all authenticated users"
  on public.trade_categories for select to authenticated using (true);
create policy "admins manage trade categories"
  on public.trade_categories for all to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- trades
create policy "trades are readable by all authenticated users"
  on public.trades for select to authenticated using (true);
create policy "admins manage trades"
  on public.trades for insert to authenticated
  with check (public.current_role() = 'admin');
create policy "admins or the trade itself can update trade info"
  on public.trades for update to authenticated
  using (public.current_role() = 'admin' or id = public.current_trade_id())
  with check (public.current_role() = 'admin' or id = public.current_trade_id());
create policy "admins can delete trades"
  on public.trades for delete to authenticated
  using (public.current_role() = 'admin');

-- trade_category_links
create policy "trade category links are readable by all authenticated users"
  on public.trade_category_links for select to authenticated using (true);
create policy "admins or the trade itself manage category links"
  on public.trade_category_links for all to authenticated
  using (public.current_role() = 'admin' or trade_id = public.current_trade_id())
  with check (public.current_role() = 'admin' or trade_id = public.current_trade_id());

-- crews
create policy "crews are readable by all authenticated users"
  on public.crews for select to authenticated using (true);
create policy "admins or the trade itself manage crews"
  on public.crews for all to authenticated
  using (public.current_role() = 'admin' or trade_id = public.current_trade_id())
  with check (public.current_role() = 'admin' or trade_id = public.current_trade_id());

-- projects
create policy "internal staff can read projects"
  on public.projects for select to authenticated
  using (
    public.is_internal_staff()
    or exists (
      select 1 from public.bookings b
      where b.project_id = projects.id and b.trade_id = public.current_trade_id()
    )
  );
create policy "internal staff manage projects"
  on public.projects for all to authenticated
  using (public.is_internal_staff())
  with check (public.is_internal_staff());

-- bookings
create policy "internal staff read all bookings, trades read their own"
  on public.bookings for select to authenticated
  using (public.is_internal_staff() or trade_id = public.current_trade_id());
create policy "internal staff manage bookings"
  on public.bookings for insert to authenticated
  with check (public.is_internal_staff());
create policy "internal staff update bookings"
  on public.bookings for update to authenticated
  using (public.is_internal_staff())
  with check (public.is_internal_staff());
create policy "internal staff delete bookings"
  on public.bookings for delete to authenticated
  using (public.is_internal_staff());

-- trade_external_commitments
create policy "internal staff and owning trade read external commitments"
  on public.trade_external_commitments for select to authenticated
  using (public.is_internal_staff() or trade_id = public.current_trade_id());
create policy "admins or the trade itself manage external commitments"
  on public.trade_external_commitments for all to authenticated
  using (public.current_role() = 'admin' or trade_id = public.current_trade_id())
  with check (public.current_role() = 'admin' or trade_id = public.current_trade_id());

-- ---------------------------------------------------------------------------
-- Seed data: common construction trade categories
-- ---------------------------------------------------------------------------

insert into public.trade_categories (name, sort_order) values
  ('Site Work / Excavation', 10),
  ('Foundation', 20),
  ('Slab Prep', 30),
  ('Slab Pour / Concrete', 40),
  ('Framing - Structural', 50),
  ('Roof Framing', 60),
  ('Roofing', 70),
  ('Plumbing', 80),
  ('Electrical', 90),
  ('HVAC', 100),
  ('Fire Suppression', 110),
  ('Insulation', 120),
  ('Drywall', 130),
  ('Painting', 140),
  ('Flooring', 150),
  ('Cabinetry / Millwork', 160),
  ('Masonry', 170),
  ('Landscaping', 180),
  ('Paving / Concrete Flatwork', 190)
on conflict (name) do nothing;
