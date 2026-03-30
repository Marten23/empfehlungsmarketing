-- 032_ordely_cooperation_setting.sql
-- Adds advisor-side toggle fields for Ordely cooperation communication.

alter table public.advisor_settings
  add column if not exists ordely_cooperation_enabled boolean not null default false,
  add column if not exists ordely_cooperation_confirmed_at timestamptz,
  add column if not exists ordely_cooperation_lock_until timestamptz;

