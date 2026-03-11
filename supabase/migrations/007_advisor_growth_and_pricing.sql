-- =========================================================
-- 007_advisor_growth_and_pricing.sql
-- Extend existing advisor model for growth, discounts and pricing
-- =========================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'advisor_pricing_tier') then
    create type public.advisor_pricing_tier as enum ('founder', 'early', 'standard');
  end if;
end $$;

-- Prepare role field (if not already present) for app-level role checks
alter table public.profiles
  add column if not exists role text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_check
      check (role in ('advisor', 'referrer') or role is null);
  end if;
end $$;

-- Advisor growth + monetization extension
alter table public.advisors
  add column if not exists advisor_referral_slug text,
  add column if not exists advisor_promo_code text,
  add column if not exists referred_by_advisor_id uuid references public.advisors(id) on delete set null,
  add column if not exists referral_source text,
  add column if not exists account_activated_at timestamptz,
  add column if not exists pricing_tier public.advisor_pricing_tier not null default 'founder',
  add column if not exists setup_fee_cents integer not null default 49900,
  add column if not exists monthly_fee_cents integer not null default 2999,
  add column if not exists setup_fee_discount_cents integer not null default 0,
  add column if not exists referral_reward_free_months integer not null default 0,
  add column if not exists referral_reward_lifetime_discount_percent integer not null default 0,
  add column if not exists platform_branding_opt_in boolean not null default false,
  add column if not exists platform_branding_reward_months integer not null default 0,
  add column if not exists referrer_discount_first_year_percent integer not null default 50;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'advisors_setup_fee_cents_nonnegative'
  ) then
    alter table public.advisors
      add constraint advisors_setup_fee_cents_nonnegative
      check (setup_fee_cents >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'advisors_monthly_fee_cents_nonnegative'
  ) then
    alter table public.advisors
      add constraint advisors_monthly_fee_cents_nonnegative
      check (monthly_fee_cents >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'advisors_setup_fee_discount_bounds'
  ) then
    alter table public.advisors
      add constraint advisors_setup_fee_discount_bounds
      check (setup_fee_discount_cents >= 0 and setup_fee_discount_cents <= setup_fee_cents);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'advisors_referral_reward_free_months_nonnegative'
  ) then
    alter table public.advisors
      add constraint advisors_referral_reward_free_months_nonnegative
      check (referral_reward_free_months >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'advisors_referral_reward_lifetime_discount_bounds'
  ) then
    alter table public.advisors
      add constraint advisors_referral_reward_lifetime_discount_bounds
      check (
        referral_reward_lifetime_discount_percent >= 0
        and referral_reward_lifetime_discount_percent <= 100
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'advisors_referrer_discount_first_year_bounds'
  ) then
    alter table public.advisors
      add constraint advisors_referrer_discount_first_year_bounds
      check (
        referrer_discount_first_year_percent >= 0
        and referrer_discount_first_year_percent <= 100
      );
  end if;
end $$;

create unique index if not exists uq_advisors_referral_slug
  on public.advisors(advisor_referral_slug)
  where advisor_referral_slug is not null;

create unique index if not exists uq_advisors_promo_code
  on public.advisors(advisor_promo_code)
  where advisor_promo_code is not null;

create index if not exists idx_advisors_referred_by_advisor_id
  on public.advisors(referred_by_advisor_id);

create index if not exists idx_advisors_pricing_tier
  on public.advisors(pricing_tier);

-- Keep advisor_settings aligned for optional UI toggles
alter table public.advisor_settings
  add column if not exists show_platform_branding boolean not null default false;

-- Pricing defaults and referred-advisor setup discount
create or replace function public.apply_advisor_pricing_defaults()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.pricing_tier = 'founder' then
    new.setup_fee_cents := 49900;
    new.monthly_fee_cents := 2999;
  elsif new.pricing_tier = 'early' then
    new.setup_fee_cents := 59900;
    new.monthly_fee_cents := 3999;
  else
    new.setup_fee_cents := 99900;
    new.monthly_fee_cents := 7999;
  end if;

  -- New advisor bonus: if invited by another advisor, at least 100 EUR setup discount.
  if new.referred_by_advisor_id is not null then
    new.setup_fee_discount_cents := greatest(coalesce(new.setup_fee_discount_cents, 0), 10000);
  end if;

  -- Optional platform branding reward: 2 free months.
  if coalesce(new.platform_branding_opt_in, false) = true then
    new.platform_branding_reward_months := greatest(coalesce(new.platform_branding_reward_months, 0), 2);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_advisors_apply_pricing_defaults on public.advisors;
create trigger trg_advisors_apply_pricing_defaults
before insert or update of pricing_tier, referred_by_advisor_id, platform_branding_opt_in
on public.advisors
for each row
execute function public.apply_advisor_pricing_defaults();

-- Reward recalculation for inviter advisors:
-- 1-9 successful referrals => +1 free month each
-- >=10 successful referrals => 50% lifetime discount
create or replace function public.recalculate_advisor_referral_rewards(p_inviter_advisor_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_success_count integer;
  v_free_months integer;
  v_lifetime_discount integer;
begin
  if p_inviter_advisor_id is null then
    return;
  end if;

  select count(*)
    into v_success_count
  from public.advisors a
  where a.referred_by_advisor_id = p_inviter_advisor_id
    and a.is_active = true
    and a.account_activated_at is not null;

  v_free_months := least(v_success_count, 9);
  v_lifetime_discount := case when v_success_count >= 10 then 50 else 0 end;

  update public.advisors a
  set referral_reward_free_months = v_free_months,
      referral_reward_lifetime_discount_percent = v_lifetime_discount,
      updated_at = timezone('utc', now())
  where a.id = p_inviter_advisor_id;
end;
$$;

create or replace function public.sync_advisor_referral_rewards()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform public.recalculate_advisor_referral_rewards(new.referred_by_advisor_id);

  if tg_op = 'UPDATE' and old.referred_by_advisor_id is distinct from new.referred_by_advisor_id then
    perform public.recalculate_advisor_referral_rewards(old.referred_by_advisor_id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_advisors_sync_referral_rewards on public.advisors;
create trigger trg_advisors_sync_referral_rewards
after insert or update of referred_by_advisor_id, is_active, account_activated_at
on public.advisors
for each row
execute function public.sync_advisor_referral_rewards();

