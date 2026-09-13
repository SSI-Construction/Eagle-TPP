-- Add Precast and Safety as new user roles (placeholder dashboards, no
-- dedicated RLS/permissions yet — behaves like read-only staff for now).

alter type public.user_role add value if not exists 'precast';
alter type public.user_role add value if not exists 'safety';
