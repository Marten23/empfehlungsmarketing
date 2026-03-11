-- =========================================================
-- 004_requirements_adjustments.sql
-- Additional business requirements adjustments
-- =========================================================

-- 1) Referrals: contact data should be optional
-- Keep existing columns for backward compatibility, add normalized optional fields.
alter table public.referrals
  add column if not exists contact_name text,
  add column if not exists contact_note text;

-- Existing schema had required first/last name for contacts.
-- Relax to optional for MVP flexibility.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'referrals'
      and column_name = 'contact_first_name'
      and is_nullable = 'NO'
  ) then
    alter table public.referrals alter column contact_first_name drop not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'referrals'
      and column_name = 'contact_last_name'
      and is_nullable = 'NO'
  ) then
    alter table public.referrals alter column contact_last_name drop not null;
  end if;
end $$;

-- 2) Referrer link: support unique code OR slug per advisor
alter table public.referrers
  add column if not exists referral_slug text;

create unique index if not exists uq_referrers_advisor_slug
  on public.referrers (advisor_id, referral_slug)
  where referral_slug is not null;

-- Enforce that at least one link identifier exists.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'referrers_link_identifier_check'
  ) then
    alter table public.referrers
      add constraint referrers_link_identifier_check
      check (
        nullif(trim(coalesce(referral_code, '')), '') is not null
        or nullif(trim(coalesce(referral_slug, '')), '') is not null
      );
  end if;
end $$;

-- 3) Rewards: add missing business fields
alter table public.rewards
  add column if not exists title text,
  add column if not exists image_url text,
  add column if not exists external_product_url text;

-- Backfill title from existing name and keep title required afterward.
update public.rewards
set title = coalesce(title, name)
where title is null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'rewards'
      and column_name = 'title'
      and is_nullable = 'YES'
  ) then
    alter table public.rewards alter column title set not null;
  end if;
end $$;

-- 4) Reward redemption statuses: add values only.
-- IMPORTANT: PostgreSQL requires a commit before newly added enum values are used.
-- Do not set defaults/update rows/functions here. This is done in 005.
do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'redemption_status' and e.enumlabel = 'offen'
  ) then
    alter type public.redemption_status add value 'offen';
  end if;

  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'redemption_status' and e.enumlabel = 'bearbeitet'
  ) then
    alter type public.redemption_status add value 'bearbeitet';
  end if;

  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'redemption_status' and e.enumlabel = 'abgeschlossen'
  ) then
    alter type public.redemption_status add value 'abgeschlossen';
  end if;

  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'redemption_status' and e.enumlabel = 'abgelehnt'
  ) then
    alter type public.redemption_status add value 'abgelehnt';
  end if;
end $$;
