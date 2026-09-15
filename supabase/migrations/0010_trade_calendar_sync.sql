-- Lets a trade connect a read-only external calendar feed (Google Calendar,
-- Outlook, Apple Calendar "secret"/ICS URL) so busy time booked outside this
-- app automatically shows up as an external commitment that blocks capacity.
-- No new RLS policies are needed: trades can already update their own trade
-- row and manage their own trade_external_commitments rows.

alter table public.trades
  add column if not exists ics_feed_url text,
  add column if not exists ics_synced_at timestamptz;

alter table public.trade_external_commitments
  add column if not exists source text not null default 'manual',
  add column if not exists external_uid text;

alter table public.trade_external_commitments
  drop constraint if exists external_commitments_source_check;
alter table public.trade_external_commitments
  add constraint external_commitments_source_check
  check (source in ('manual', 'calendar_sync'));

-- Prevents duplicate imports of the same calendar event on repeated syncs.
create unique index if not exists external_commitments_calendar_sync_uid_idx
  on public.trade_external_commitments (trade_id, external_uid)
  where source = 'calendar_sync' and external_uid is not null;
