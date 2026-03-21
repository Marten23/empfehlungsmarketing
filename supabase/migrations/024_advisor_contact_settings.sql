-- =========================================================
-- 024_advisor_contact_settings.sql
-- Contact/business data for advisor presentation in referrer dashboard
-- =========================================================

alter table public.advisor_settings
  add column if not exists contact_name text,
  add column if not exists contact_phone text,
  add column if not exists contact_email citext,
  add column if not exists contact_avatar_url text;

