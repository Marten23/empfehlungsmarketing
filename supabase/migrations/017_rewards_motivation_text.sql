-- =========================================================
-- 017_rewards_motivation_text.sql
-- Add optional advisor motivation text per reward
-- =========================================================

alter table public.rewards
  add column if not exists motivation_text text;
