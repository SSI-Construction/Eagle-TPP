-- Allows a trade to adjust the dates of their own bookings (e.g. finishing a
-- job early/late), in addition to internal staff who already had full access.

create policy "trades can update their own booking dates"
  on public.bookings for update to authenticated
  using (trade_id = public.current_trade_id())
  with check (trade_id = public.current_trade_id());
