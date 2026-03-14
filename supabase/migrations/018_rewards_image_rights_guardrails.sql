-- 018_rewards_image_rights_guardrails.sql
-- Zweck:
-- - Nachweisfelder fuer Bildrechte bei Praemien speichern
-- - Berater bestaetigt Bildnutzungsrechte in der App

alter table public.rewards
  add column if not exists image_source_note text,
  add column if not exists image_rights_confirmed boolean not null default false,
  add column if not exists image_rights_confirmed_at timestamptz,
  add column if not exists image_rights_confirmed_by_user_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'rewards_image_rights_confirmed_by_user_id_fkey'
  ) then
    alter table public.rewards
      add constraint rewards_image_rights_confirmed_by_user_id_fkey
      foreign key (image_rights_confirmed_by_user_id)
      references auth.users (id)
      on delete set null;
  end if;
end
$$;

create index if not exists idx_rewards_advisor_rights_confirmed
  on public.rewards (advisor_id, image_rights_confirmed);
