-- =========================================================
-- 015_advisor_level_thresholds.sql
-- Per-advisor level thresholds for referrer gamification
-- =========================================================

alter table public.advisor_settings
  add column if not exists level_bronze_points integer not null default 100,
  add column if not exists level_silver_points integer not null default 200,
  add column if not exists level_gold_points integer not null default 500,
  add column if not exists level_platinum_points integer not null default 1000;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'advisor_settings_level_thresholds_chk'
      and conrelid = 'public.advisor_settings'::regclass
  ) then
    alter table public.advisor_settings
      drop constraint advisor_settings_level_thresholds_chk;
  end if;

  alter table public.advisor_settings
    add constraint advisor_settings_level_thresholds_chk
    check (
      level_bronze_points > 0
      and level_silver_points > level_bronze_points
      and level_gold_points > level_silver_points
      and level_platinum_points > level_gold_points
    );
end
$$;
