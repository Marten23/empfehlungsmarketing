-- =========================================================
-- 025_advisor_referral_page_presentation.sql
-- Presentation settings for public referral link page
-- =========================================================

alter table public.advisor_settings
  add column if not exists welcome_text text,
  add column if not exists welcome_video_url text,
  add column if not exists show_welcome_video_on_referral_page boolean not null default false;

