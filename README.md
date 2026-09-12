# Trade Schedule

Shared trade-capacity scheduling app: trades manage their own crews/availability, and PMs & site
supervisors book them against projects while seeing real-time capacity so nobody double-books a
trade beyond what they can actually staff.

## Preview the UI (no Supabase needed yet)

This repo currently ships with `.env.local` set to `NEXT_PUBLIC_DEMO_MODE=true`, which renders
the whole app against realistic in-memory sample data instead of Supabase — no project, no
migrations, no login required. Good for reviewing the UI/UX with the team before committing to
the real backend.

```bash
npm install
npm run dev
```

Open http://localhost:3000 — you'll land straight on the capacity schedule. Use the **Preview as**
dropdown at the bottom of the sidebar to switch between Admin/PM/Site Supervisor/Trade views (a
trade partner, "Terry Volt", is preconfigured so you can see the restricted trade view and try
shortening/extending/push-forward on their bookings). Changes made in demo mode only live in
server memory and reset when you restart `npm run dev`.

When you're ready to connect the real backend, delete `.env.local` (or set
`NEXT_PUBLIC_DEMO_MODE=false`) and follow the steps below.

## Branding

- The Eagle Builders wordmark is stored at
  [`public/eagle-builders-logo.png`](public/eagle-builders-logo.png). Update that file in place to
  change the displayed company logo.
- Set `NEXT_PUBLIC_COMPANY_NAME` in `.env.local` to replace the "Trade Schedule" text in the
  sidebar and browser tab.
- Colors live in [`src/app/globals.css`](src/app/globals.css) as CSS variables (`--primary`,
  `--ring`, etc.) — change the blue hue there to match your brand.

## How booking works

1. **Admin** adds trade partners and invites them to create login credentials. The admin also
  invites internal users as project managers or site supervisors from the Team page.
2. **Trade partners** add their active crews and block crew capacity already committed to outside
  work, keeping the schedule aligned with their real availability.
3. **PM / site supervisor** creates a project with its name, number, address or map link, then
  selects an available trade slot and sends a booking request for that project.
4. The **trade** receives the project details and requester name, then confirms the request. The
  capacity board shows available capacity in green, requests in orange, confirmed bookings in
  red, and outside work in gray.
5. If a confirmed job runs short or long, the **trade** updates its end date. Admins can edit any
  booking when an override is required — see "Visibility & rescheduling" below.

## Stack

- Next.js (App Router, TypeScript, Tailwind v4)
- shadcn/ui (Base UI) for components
- Supabase (Postgres, Auth, Row Level Security) for the backend

## 1. Create a Supabase project

1. Go to https://supabase.com, create a new project.
2. In **Project Settings → API**, copy the **Project URL** and **anon public key**.
3. Copy `.env.local.example` to `.env.local` and fill in those two values (this replaces the
   demo-mode `.env.local` above).

## 2. Apply the database schema

1. Open the Supabase **SQL Editor**.
2. Run the migrations in [`supabase/migrations`](supabase/migrations) **in order** (`0001_init.sql`,
  `0002_trade_booking_updates.sql`, `0003_restrict_booking_date_changes.sql`,
  `0004_booking_request_workflow.sql`, then `0005_booking_confirmation_audit.sql`). These create
   all tables, RLS policies, the auto-profile trigger, seed a starter list of trade categories,
   and add a trigger that blocks PMs/site supervisors from changing booking dates at the database
   level (see "Permissions" below).

## 3. Configure email notifications (optional)

Whoever created a booking gets emailed when its dates change (shortened, extended, or pushed
forward to make room for another job). This uses [Resend](https://resend.com):

1. Create a free Resend account and API key.
2. Set `RESEND_API_KEY` and `EMAIL_FROM` in `.env.local` (see `.env.local.example`).

If `RESEND_API_KEY` is left unset, emails are just logged to the server console instead of sent —
useful for local dev.

## 4. Set up sign-in

**Internal staff (PMs / site supervisors) — Microsoft / Entra ID SSO:**

1. In Azure Portal, register an app (Entra ID → App registrations → New registration).
2. Add a redirect URI: `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback`.
3. In Supabase **Authentication → Providers → Azure**, enable it and paste the Application
   (client) ID, client secret, and your Azure tenant URL.

**Trade partners — email/password or magic link:**

No extra setup needed — this uses Supabase's built-in email auth, already enabled by default.
Invite trades by creating a Supabase Auth user for them (Authentication → Users → Add user), then
in the SQL editor set their role and link them to their trade record:

```sql
update public.profiles
set role = 'trade', trade_id = '<trade-uuid>'
where email = 'contact@thetradecompany.com';
```

## 5. Bootstrap an admin

The first person to sign in gets a `profiles` row with role `pm` by default (see the
`handle_new_user` trigger). Promote yourself to admin once you've signed in once:

```sql
update public.profiles set role = 'admin' where email = 'you@company.com';
```

Admins can add and invite trades, invite PMs and site supervisors, see everything, and have full
booking override access. PMs/site supervisors can manage projects and request available slots but
cannot modify an existing request or booking. The owning trade confirms its requests and can
shorten or extend confirmed work; date changes email whoever originally created an affected
booking. Trade users can only manage their own crews, availability, external commitments, and
booking confirmations.

## 6. Run locally

```bash
npm install
npm run dev
```

Visit http://localhost:3000 — you'll be redirected to `/login`.

## Data model notes

- **Capacity** = number of active `crews` a trade has, minus crew-days consumed by `bookings`
  and any `trade_external_commitments` (work a trade has committed to outside this system) that
  overlap a given date. See [`src/lib/capacity.ts`](src/lib/capacity.ts).
- A single booking can request more than one crew (`crew_count`) so a trade can be booked on
  multiple projects the same day as long as they have enough crews free.
- The `/schedule` capacity board is the main screen: pick a category, pick a trade, and click an
  open cell to request it. The server re-validates capacity before saving to avoid races between
  staff booking at the same time. Pending requests hold capacity until confirmed or cancelled.
- PMs, site supervisors, and admins see all active bookings in the selected schedule window.
  Clicking an occupied cell opens a detail table showing the project, dates, crews, status, who
  requested it, and who confirmed it. Both identities come from the authenticated user profiles.

## Visibility & rescheduling

- **Trades** only ever see their own row on `/schedule` (read-only capacity) plus a "My bookings"
  list — they can't see other trades' bookings, and can't create new bookings (only PMs/site
  supervisors/admins can, enforced by RLS on `bookings`).
- **PMs / site supervisors** see every trade's capacity and can book any available slot, but
  **cannot move a booking that's already been made** — no edit UI is shown to them, the server
  action rejects it, and a database trigger blocks it even if called directly. **Admins** can
  override dates if needed.
- From "My bookings", a trade can update a booking's end date:
  - **Finished early** (shortening) always succeeds immediately — the freed days become bookable
    by others right away.
  - **Running long** (extending) is re-checked against capacity. If it doesn't overlap anything
    else, it's applied directly. If it would overlap another one of that trade's own upcoming
    bookings, the trade is shown exactly which booking(s) would be affected and can choose to
    **push them forward** (same duration, shifted to start right after the extended job ends),
    cascading through any further bookings that would then also overlap. Extensions that run into
    a trade's external commitments (work outside this system) are blocked outright, since those
    can't be rescheduled from here.
  - Whenever a booking's dates actually change (shortened, extended, or pushed forward as a side
    effect), whoever originally created that booking gets an email with the old and new dates
    (see [`src/lib/email.ts`](src/lib/email.ts)).
