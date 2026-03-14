-- 020_rewards_image_focus.sql
-- Bildausschnitt pro Praemie steuerbar (0..100 Prozent fuer x/y Fokuspunkt)

alter table public.rewards
  add column if not exists image_focus_x integer not null default 50,
  add column if not exists image_focus_y integer not null default 50;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'rewards_image_focus_x_range'
  ) then
    alter table public.rewards
      add constraint rewards_image_focus_x_range
      check (image_focus_x between 0 and 100);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'rewards_image_focus_y_range'
  ) then
    alter table public.rewards
      add constraint rewards_image_focus_y_range
      check (image_focus_y between 0 and 100);
  end if;
end
$$;
