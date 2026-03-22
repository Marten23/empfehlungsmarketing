-- 031_billing_checkout_referral_foundation.sql
-- Internal billing/referral foundation before final Stripe live wiring.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'advisor_pricing_tier') then
    create type public.advisor_pricing_tier as enum ('founder', 'early', 'standard');
  end if;

  if not exists (select 1 from pg_type where typname = 'advisor_account_classification') then
    create type public.advisor_account_classification as enum ('live', 'test', 'internal', 'demo');
  end if;

  if not exists (select 1 from pg_type where typname = 'advisor_billing_mode') then
    create type public.advisor_billing_mode as enum ('live', 'test');
  end if;

  if not exists (select 1 from pg_type where typname = 'advisor_account_status') then
    create type public.advisor_account_status as enum (
      'registered',
      'checkout_reserved',
      'setup_pending',
      'setup_paid',
      'active_paid',
      'canceled',
      'delinquent',
      'test_only'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'advisor_billing_interval') then
    create type public.advisor_billing_interval as enum ('monthly', 'annual');
  end if;

  if not exists (select 1 from pg_type where typname = 'advisor_lifetime_discount_state') then
    create type public.advisor_lifetime_discount_state as enum ('inactive', 'pending_next_cycle', 'active');
  end if;

  if not exists (select 1 from pg_type where typname = 'advisor_referral_qualification_status') then
    create type public.advisor_referral_qualification_status as enum (
      'pending',
      'invited',
      'setup_paid',
      'active',
      'qualified',
      'rewarded',
      'rejected',
      'invalid'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'advisor_billing_credit_source') then
    create type public.advisor_billing_credit_source as enum ('referral', 'ordely_promo', 'manual_adjustment', 'system');
  end if;
end $$;

-- Preflight for legacy DB states:
-- ensure all advisor billing columns exist before functions reference them.
alter table public.advisors
  add column if not exists pricing_tier public.advisor_pricing_tier not null default 'founder',
  add column if not exists setup_fee_cents integer not null default 49900,
  add column if not exists monthly_fee_cents integer not null default 4999,
  add column if not exists setup_fee_discount_cents integer not null default 0,
  add column if not exists referred_by_advisor_id uuid references public.advisors(id) on delete set null,
  add column if not exists referral_reward_free_months integer not null default 0,
  add column if not exists referral_reward_lifetime_discount_percent integer not null default 0,
  add column if not exists platform_branding_opt_in boolean not null default false,
  add column if not exists platform_branding_reward_months integer not null default 0,
  add column if not exists account_classification public.advisor_account_classification not null default 'live',
  add column if not exists billing_mode public.advisor_billing_mode not null default 'live',
  add column if not exists account_status public.advisor_account_status not null default 'registered',
  add column if not exists setup_paid_at timestamptz,
  add column if not exists active_paid_at timestamptz,
  add column if not exists billing_interval_current public.advisor_billing_interval,
  add column if not exists billing_current_period_start timestamptz,
  add column if not exists billing_current_period_end timestamptz,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists lifetime_discount_state public.advisor_lifetime_discount_state not null default 'inactive',
  add column if not exists lifetime_discount_percent integer not null default 0,
  add column if not exists lifetime_discount_activated_at timestamptz,
  add column if not exists lifetime_discount_effective_from timestamptz;

-- Pre-create core billing tables so function signatures compile in all DB states.
create table if not exists public.advisor_pricing_reservations (
  id uuid primary key default gen_random_uuid(),
  advisor_id uuid not null references public.advisors(id) on delete cascade,
  owner_user_id uuid references auth.users(id) on delete set null,
  mode public.advisor_billing_mode not null default 'live',
  tier_snapshot public.advisor_pricing_tier not null,
  setup_price_snapshot_cents integer not null check (setup_price_snapshot_cents >= 0),
  monthly_price_snapshot_cents integer not null check (monthly_price_snapshot_cents >= 0),
  annual_price_snapshot_cents integer not null check (annual_price_snapshot_cents >= 0),
  billing_interval_snapshot public.advisor_billing_interval not null,
  referral_discount_snapshot_cents integer not null default 0 check (referral_discount_snapshot_cents >= 0),
  annual_setup_discount_snapshot_cents integer not null default 0 check (annual_setup_discount_snapshot_cents >= 0),
  lifetime_discount_state_snapshot public.advisor_lifetime_discount_state not null default 'inactive',
  lifetime_discount_percent_snapshot integer not null default 0 check (lifetime_discount_percent_snapshot >= 0 and lifetime_discount_percent_snapshot <= 100),
  final_setup_price_snapshot_cents integer not null check (final_setup_price_snapshot_cents >= 0),
  final_recurring_price_snapshot_cents integer not null check (final_recurring_price_snapshot_cents >= 0),
  reserved_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  is_finalized boolean not null default false,
  finalized_at timestamptz,
  checkout_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.advisor_referral_qualifications (
  id uuid primary key default gen_random_uuid(),
  inviter_advisor_id uuid not null references public.advisors(id) on delete cascade,
  referred_advisor_id uuid not null references public.advisors(id) on delete cascade,
  status public.advisor_referral_qualification_status not null default 'pending',
  mode public.advisor_billing_mode not null default 'live',
  first_setup_paid_at timestamptz,
  active_paid_since timestamptz,
  qualified_at timestamptz,
  reward_granted_at timestamptz,
  reward_months_granted integer not null default 0 check (reward_months_granted >= 0 and reward_months_granted <= 1),
  qualification_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (referred_advisor_id),
  unique (inviter_advisor_id, referred_advisor_id)
);

create table if not exists public.advisor_billing_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  advisor_id uuid not null references public.advisors(id) on delete cascade,
  source public.advisor_billing_credit_source not null,
  source_referral_qualification_id uuid references public.advisor_referral_qualifications(id) on delete set null,
  months_delta integer not null check (months_delta <> 0),
  available_from timestamptz not null default timezone('utc', now()),
  consumed_at timestamptz,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.is_qualifying_live_advisor_row(
  p_account_classification public.advisor_account_classification,
  p_billing_mode public.advisor_billing_mode,
  p_account_status public.advisor_account_status,
  p_is_active boolean,
  p_setup_paid_at timestamptz
)
returns boolean
language sql
stable
set search_path = public
as $$
  select (
    p_account_classification = 'live'
    and p_billing_mode = 'live'
    and p_is_active = true
    and p_setup_paid_at is not null
    and p_account_status in ('setup_paid', 'active_paid')
  );
$$;

create or replace function public.get_qualifying_live_advisor_count()
returns integer
language sql
stable
set search_path = public
as $$
  select count(*)::integer
  from public.advisors a
  where public.is_qualifying_live_advisor_row(
    a.account_classification,
    a.billing_mode,
    a.account_status,
    a.is_active,
    a.setup_paid_at
  );
$$;

create or replace function public.resolve_advisor_pricing_tier_by_position(p_position integer)
returns public.advisor_pricing_tier
language sql
immutable
set search_path = public
as $$
  select case
    when p_position <= 10 then 'founder'::public.advisor_pricing_tier
    when p_position <= 50 then 'early'::public.advisor_pricing_tier
    else 'standard'::public.advisor_pricing_tier
  end;
$$;

create or replace function public.resolve_setup_fee_cents_for_tier(p_tier public.advisor_pricing_tier)
returns integer
language sql
immutable
set search_path = public
as $$
  select case
    when p_tier = 'founder' then 49900
    when p_tier = 'early' then 59900
    else 79900
  end;
$$;

create or replace function public.resolve_monthly_fee_cents_for_tier(p_tier public.advisor_pricing_tier)
returns integer
language sql
immutable
set search_path = public
as $$
  select case
    when p_tier = 'founder' then 4999
    when p_tier = 'early' then 5999
    else 7999
  end;
$$;

create or replace function public.refresh_advisor_pricing_defaults(p_advisor_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_current public.advisor_pricing_tier;
  v_target_tier public.advisor_pricing_tier;
  v_qualifying_count integer;
  v_position integer;
begin
  if p_advisor_id is null then
    return;
  end if;

  select pricing_tier
    into v_current
  from public.advisors
  where id = p_advisor_id
  limit 1;

  if v_current is null then
    return;
  end if;

  select public.get_qualifying_live_advisor_count()
    into v_qualifying_count;

  select case
    when public.is_qualifying_live_advisor_row(
      a.account_classification,
      a.billing_mode,
      a.account_status,
      a.is_active,
      a.setup_paid_at
    ) then v_qualifying_count
    else v_qualifying_count + 1
  end
    into v_position
  from public.advisors a
  where a.id = p_advisor_id
  limit 1;

  v_target_tier := public.resolve_advisor_pricing_tier_by_position(v_position);

  update public.advisors a
  set pricing_tier = v_target_tier,
      setup_fee_cents = public.resolve_setup_fee_cents_for_tier(v_target_tier),
      monthly_fee_cents = public.resolve_monthly_fee_cents_for_tier(v_target_tier),
      setup_fee_discount_cents = least(
        coalesce(a.setup_fee_discount_cents, 0),
        public.resolve_setup_fee_cents_for_tier(v_target_tier)
      ),
      updated_at = timezone('utc', now())
  where a.id = p_advisor_id;
end;
$$;

create or replace function public.create_or_refresh_pricing_reservation(
  p_advisor_id uuid,
  p_billing_interval public.advisor_billing_interval default 'monthly',
  p_checkout_reference text default null,
  p_ttl_minutes integer default 30
)
returns public.advisor_pricing_reservations
language plpgsql
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_expires_at timestamptz := timezone('utc', now()) + make_interval(mins => greatest(coalesce(p_ttl_minutes, 30), 1));
  v_advisor public.advisors%rowtype;
  v_qualifying_count integer;
  v_position integer;
  v_tier public.advisor_pricing_tier;
  v_setup integer;
  v_monthly integer;
  v_annual integer;
  v_referral_discount integer;
  v_annual_setup_discount integer;
  v_lifetime_percent integer;
  v_lifetime_state public.advisor_lifetime_discount_state;
  v_final_setup integer;
  v_final_recurring integer;
  v_existing_id uuid;
  v_row public.advisor_pricing_reservations%rowtype;
begin
  if p_advisor_id is null then
    raise exception 'advisor_id is required';
  end if;

  perform pg_advisory_xact_lock(hashtext('advisor_pricing_reservation:' || p_advisor_id::text));

  select *
    into v_advisor
  from public.advisors
  where id = p_advisor_id
  limit 1;

  if v_advisor.id is null then
    raise exception 'Advisor not found';
  end if;

  if p_checkout_reference is not null then
    select id
      into v_existing_id
    from public.advisor_pricing_reservations
    where checkout_reference = p_checkout_reference
      and advisor_id = p_advisor_id
      and is_finalized = false
    order by reserved_at desc
    limit 1;
  end if;

  select public.get_qualifying_live_advisor_count()
    into v_qualifying_count;

  if public.is_qualifying_live_advisor_row(
    v_advisor.account_classification,
    v_advisor.billing_mode,
    v_advisor.account_status,
    v_advisor.is_active,
    v_advisor.setup_paid_at
  ) then
    v_position := greatest(v_qualifying_count, 1);
  elsif v_advisor.account_classification = 'live' and v_advisor.billing_mode = 'live' then
    v_position := v_qualifying_count + 1;
  else
    v_position := greatest(v_qualifying_count, 1);
  end if;

  v_tier := public.resolve_advisor_pricing_tier_by_position(v_position);
  v_setup := public.resolve_setup_fee_cents_for_tier(v_tier);
  v_monthly := public.resolve_monthly_fee_cents_for_tier(v_tier);
  v_annual := v_monthly * 12;
  v_referral_discount := case when v_advisor.referred_by_advisor_id is null then 0 else 10000 end;
  v_annual_setup_discount := case when p_billing_interval = 'annual' then 20000 else 0 end;

  v_lifetime_state := coalesce(v_advisor.lifetime_discount_state, 'inactive');
  v_lifetime_percent := case
    when v_lifetime_state = 'active' then greatest(coalesce(v_advisor.lifetime_discount_percent, 0), 50)
    else 0
  end;

  v_final_setup := greatest(0, v_setup - v_referral_discount - v_annual_setup_discount);
  v_final_recurring := case
    when p_billing_interval = 'annual' then v_annual
    else v_monthly
  end;

  if v_lifetime_percent > 0 then
    v_final_recurring := floor(v_final_recurring * ((100 - v_lifetime_percent)::numeric / 100::numeric));
  end if;

  if v_existing_id is null then
    insert into public.advisor_pricing_reservations (
      advisor_id,
      owner_user_id,
      mode,
      tier_snapshot,
      setup_price_snapshot_cents,
      monthly_price_snapshot_cents,
      annual_price_snapshot_cents,
      billing_interval_snapshot,
      referral_discount_snapshot_cents,
      annual_setup_discount_snapshot_cents,
      lifetime_discount_state_snapshot,
      lifetime_discount_percent_snapshot,
      final_setup_price_snapshot_cents,
      final_recurring_price_snapshot_cents,
      reserved_at,
      expires_at,
      checkout_reference
    )
    values (
      p_advisor_id,
      v_advisor.owner_user_id,
      v_advisor.billing_mode,
      v_tier,
      v_setup,
      v_monthly,
      v_annual,
      p_billing_interval,
      v_referral_discount,
      v_annual_setup_discount,
      v_lifetime_state,
      v_lifetime_percent,
      v_final_setup,
      v_final_recurring,
      v_now,
      v_expires_at,
      p_checkout_reference
    )
    returning * into v_row;
  else
    update public.advisor_pricing_reservations
    set mode = v_advisor.billing_mode,
        tier_snapshot = v_tier,
        setup_price_snapshot_cents = v_setup,
        monthly_price_snapshot_cents = v_monthly,
        annual_price_snapshot_cents = v_annual,
        billing_interval_snapshot = p_billing_interval,
        referral_discount_snapshot_cents = v_referral_discount,
        annual_setup_discount_snapshot_cents = v_annual_setup_discount,
        lifetime_discount_state_snapshot = v_lifetime_state,
        lifetime_discount_percent_snapshot = v_lifetime_percent,
        final_setup_price_snapshot_cents = v_final_setup,
        final_recurring_price_snapshot_cents = v_final_recurring,
        reserved_at = v_now,
        expires_at = v_expires_at,
        updated_at = timezone('utc', now())
    where id = v_existing_id
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

create or replace function public.finalize_pricing_reservation(
  p_reservation_id uuid
)
returns public.advisor_pricing_reservations
language plpgsql
set search_path = public
as $$
declare
  v_row public.advisor_pricing_reservations%rowtype;
begin
  update public.advisor_pricing_reservations
  set is_finalized = true,
      finalized_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  where id = p_reservation_id
    and is_finalized = false
    and expires_at >= timezone('utc', now())
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Reservation not found, expired, or already finalized';
  end if;

  return v_row;
end;
$$;

create or replace function public.compute_referral_free_months_available(
  p_advisor_id uuid
)
returns integer
language sql
stable
set search_path = public
as $$
  with totals as (
    select
      coalesce(sum(case when months_delta > 0 then months_delta else 0 end), 0)::integer as earned,
      coalesce(sum(case when months_delta < 0 then -months_delta else 0 end), 0)::integer as spent
    from public.advisor_billing_credit_ledger
    where advisor_id = p_advisor_id
      and available_from <= timezone('utc', now())
  )
  select greatest(0, least(11, earned) - spent)
  from totals;
$$;

create or replace function public.refresh_inviter_reward_state(
  p_inviter_advisor_id uuid
)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_qualified_count integer := 0;
  v_referral_months_earned integer := 0;
  v_should_activate boolean := false;
  v_current_state public.advisor_lifetime_discount_state;
  v_current_period_end timestamptz;
begin
  if p_inviter_advisor_id is null then
    return;
  end if;

  select count(*)::integer
    into v_qualified_count
  from public.advisor_referral_qualifications q
  where q.inviter_advisor_id = p_inviter_advisor_id
    and q.status in ('qualified', 'rewarded');

  select coalesce(sum(greatest(months_delta, 0)), 0)::integer
    into v_referral_months_earned
  from public.advisor_billing_credit_ledger l
  where l.advisor_id = p_inviter_advisor_id
    and l.source = 'referral';

  v_referral_months_earned := least(v_referral_months_earned, 9);

  select lifetime_discount_state, billing_current_period_end
    into v_current_state, v_current_period_end
  from public.advisors
  where id = p_inviter_advisor_id
  limit 1;

  update public.advisors
  set referral_reward_free_months = v_referral_months_earned,
      referral_reward_lifetime_discount_percent = case when v_qualified_count >= 10 then 50 else referral_reward_lifetime_discount_percent end,
      updated_at = timezone('utc', now())
  where id = p_inviter_advisor_id;

  if v_qualified_count >= 10 then
    if v_current_state = 'active' then
      return;
    end if;

    v_should_activate := not exists (
      select 1
      from public.advisors a
      where a.id = p_inviter_advisor_id
        and a.billing_interval_current = 'annual'
        and a.billing_current_period_end is not null
        and a.billing_current_period_end > timezone('utc', now())
    );

    if v_should_activate then
      update public.advisors
      set lifetime_discount_state = 'active',
          lifetime_discount_percent = greatest(lifetime_discount_percent, 50),
          lifetime_discount_activated_at = coalesce(lifetime_discount_activated_at, timezone('utc', now())),
          lifetime_discount_effective_from = coalesce(lifetime_discount_effective_from, timezone('utc', now())),
          referral_reward_lifetime_discount_percent = 50,
          updated_at = timezone('utc', now())
      where id = p_inviter_advisor_id;
    else
      update public.advisors
      set lifetime_discount_state = 'pending_next_cycle',
          lifetime_discount_percent = greatest(lifetime_discount_percent, 50),
          lifetime_discount_activated_at = coalesce(lifetime_discount_activated_at, timezone('utc', now())),
          lifetime_discount_effective_from = coalesce(v_current_period_end, lifetime_discount_effective_from, timezone('utc', now())),
          referral_reward_lifetime_discount_percent = 50,
          updated_at = timezone('utc', now())
      where id = p_inviter_advisor_id;
    end if;
  elsif v_current_state = 'pending_next_cycle' and coalesce(v_current_period_end, timezone('utc', now())) <= timezone('utc', now()) then
    update public.advisors
    set lifetime_discount_state = 'active',
        lifetime_discount_percent = greatest(lifetime_discount_percent, 50),
        lifetime_discount_effective_from = coalesce(lifetime_discount_effective_from, timezone('utc', now())),
        updated_at = timezone('utc', now())
    where id = p_inviter_advisor_id;
  end if;
end;
$$;

create or replace function public.evaluate_referred_advisor_qualification(
  p_referred_advisor_id uuid
)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_referred public.advisors%rowtype;
  v_q public.advisor_referral_qualifications%rowtype;
  v_should_qualify boolean := false;
  v_now timestamptz := timezone('utc', now());
  v_reward_months_granted integer := 0;
  v_existing_referral_months integer := 0;
  v_available_from timestamptz := timezone('utc', now());
begin
  if p_referred_advisor_id is null then
    return;
  end if;

  select *
    into v_referred
  from public.advisors
  where id = p_referred_advisor_id
  limit 1;

  if v_referred.id is null or v_referred.referred_by_advisor_id is null then
    return;
  end if;

  insert into public.advisor_referral_qualifications (
    inviter_advisor_id,
    referred_advisor_id,
    status,
    mode
  )
  values (
    v_referred.referred_by_advisor_id,
    v_referred.id,
    'pending',
    coalesce(v_referred.billing_mode, 'live')
  )
  on conflict (referred_advisor_id) do nothing;

  select *
    into v_q
  from public.advisor_referral_qualifications
  where referred_advisor_id = v_referred.id
  limit 1;

  if v_q.id is null then
    return;
  end if;

  if v_referred.account_classification <> 'live' or v_referred.billing_mode <> 'live' then
    update public.advisor_referral_qualifications
    set status = 'invalid',
        mode = coalesce(v_referred.billing_mode, 'test'),
        qualification_reason = 'non_live_or_test_account',
        updated_at = timezone('utc', now())
    where id = v_q.id;

    perform public.refresh_inviter_reward_state(v_q.inviter_advisor_id);
    return;
  end if;

  if v_referred.setup_paid_at is null then
    update public.advisor_referral_qualifications
    set status = 'invited',
        mode = v_referred.billing_mode,
        qualification_reason = 'waiting_for_setup_payment',
        updated_at = timezone('utc', now())
    where id = v_q.id;

    perform public.refresh_inviter_reward_state(v_q.inviter_advisor_id);
    return;
  end if;

  if v_referred.active_paid_at is null then
    update public.advisor_referral_qualifications
    set status = 'setup_paid',
        mode = v_referred.billing_mode,
        first_setup_paid_at = coalesce(first_setup_paid_at, v_referred.setup_paid_at),
        qualification_reason = 'waiting_for_active_paid_state',
        updated_at = timezone('utc', now())
    where id = v_q.id;

    perform public.refresh_inviter_reward_state(v_q.inviter_advisor_id);
    return;
  end if;

  v_should_qualify := (
    v_referred.account_status = 'active_paid'
    and v_referred.active_paid_at <= (v_now - interval '2 months')
  );

  update public.advisor_referral_qualifications
  set status = case when v_should_qualify then status else 'active' end,
      mode = v_referred.billing_mode,
      first_setup_paid_at = coalesce(first_setup_paid_at, v_referred.setup_paid_at),
      active_paid_since = coalesce(active_paid_since, v_referred.active_paid_at),
      qualification_reason = case
        when v_should_qualify then qualification_reason
        else 'waiting_two_month_paid_retention'
      end,
      updated_at = timezone('utc', now())
  where id = v_q.id;

  if not v_should_qualify then
    perform public.refresh_inviter_reward_state(v_q.inviter_advisor_id);
    return;
  end if;

  update public.advisor_referral_qualifications
  set status = case when reward_granted_at is null then 'qualified' else 'rewarded' end,
      qualified_at = coalesce(qualified_at, v_now),
      qualification_reason = 'qualified_two_month_paid_retention',
      updated_at = timezone('utc', now())
  where id = v_q.id;

  select coalesce(sum(greatest(months_delta, 0)), 0)::integer
    into v_existing_referral_months
  from public.advisor_billing_credit_ledger l
  where l.advisor_id = v_q.inviter_advisor_id
    and l.source = 'referral';

  v_existing_referral_months := least(v_existing_referral_months, 9);
  v_reward_months_granted := case when v_existing_referral_months < 9 then 1 else 0 end;

  if v_reward_months_granted > 0 and v_q.reward_granted_at is null then
    select case
      when a.billing_interval_current = 'annual'
        and a.billing_current_period_end is not null
        and a.billing_current_period_end > timezone('utc', now())
      then a.billing_current_period_end
      else timezone('utc', now())
    end
      into v_available_from
    from public.advisors a
    where a.id = v_q.inviter_advisor_id
    limit 1;

    insert into public.advisor_billing_credit_ledger (
      advisor_id,
      source,
      source_referral_qualification_id,
      months_delta,
      available_from,
      note,
      metadata
    )
    values (
      v_q.inviter_advisor_id,
      'referral',
      v_q.id,
      v_reward_months_granted,
      v_available_from,
      'Referral reward after 2 months paid retention',
      jsonb_build_object(
        'referred_advisor_id', v_q.referred_advisor_id,
        'qualified_at', v_now
      )
    )
    on conflict (source_referral_qualification_id, source) do nothing;

    update public.advisor_referral_qualifications
    set reward_months_granted = v_reward_months_granted,
        reward_granted_at = coalesce(reward_granted_at, v_now),
        status = 'rewarded',
        updated_at = timezone('utc', now())
    where id = v_q.id;
  end if;

  perform public.refresh_inviter_reward_state(v_q.inviter_advisor_id);
end;
$$;

create or replace function public.sync_referred_advisor_qualification_trigger()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform public.evaluate_referred_advisor_qualification(new.id);
  return new;
end;
$$;

drop trigger if exists trg_advisors_referral_qualification_sync on public.advisors;
create trigger trg_advisors_referral_qualification_sync
after insert or update of referred_by_advisor_id, account_status, setup_paid_at, active_paid_at, is_active, billing_mode, account_classification, billing_current_period_end
on public.advisors
for each row
execute function public.sync_referred_advisor_qualification_trigger();

create or replace function public.set_advisor_account_status(
  p_advisor_id uuid,
  p_new_status public.advisor_account_status,
  p_billing_interval public.advisor_billing_interval default null,
  p_period_start timestamptz default null,
  p_period_end timestamptz default null,
  p_mode public.advisor_billing_mode default null
)
returns public.advisors
language plpgsql
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_row public.advisors%rowtype;
begin
  update public.advisors
  set account_status = p_new_status,
      billing_interval_current = coalesce(p_billing_interval, billing_interval_current),
      billing_current_period_start = coalesce(p_period_start, billing_current_period_start),
      billing_current_period_end = coalesce(p_period_end, billing_current_period_end),
      billing_mode = coalesce(p_mode, billing_mode),
      setup_paid_at = case
        when p_new_status in ('setup_paid', 'active_paid') then coalesce(setup_paid_at, v_now)
        else setup_paid_at
      end,
      active_paid_at = case
        when p_new_status = 'active_paid' then coalesce(active_paid_at, v_now)
        else active_paid_at
      end,
      account_activated_at = case
        when p_new_status = 'active_paid' then coalesce(account_activated_at, v_now)
        else account_activated_at
      end,
      is_active = case
        when p_new_status in ('active_paid', 'setup_paid', 'setup_pending', 'checkout_reserved', 'registered') then true
        when p_new_status in ('canceled', 'delinquent', 'test_only') then false
        else is_active
      end,
      updated_at = timezone('utc', now())
  where id = p_advisor_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Advisor not found';
  end if;

  perform public.refresh_advisor_pricing_defaults(v_row.id);
  perform public.evaluate_referred_advisor_qualification(v_row.id);
  perform public.refresh_inviter_reward_state(v_row.id);

  return v_row;
end;
$$;

alter table public.advisor_pricing_reservations enable row level security;
alter table public.advisor_referral_qualifications enable row level security;
alter table public.advisor_billing_credit_ledger enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'advisor_pricing_reservations' and policyname = 'advisor_pricing_reservations_select_member'
  ) then
    create policy advisor_pricing_reservations_select_member
      on public.advisor_pricing_reservations
      for select using (public.is_advisor_member(advisor_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'advisor_pricing_reservations' and policyname = 'advisor_pricing_reservations_manage_admin'
  ) then
    create policy advisor_pricing_reservations_manage_admin
      on public.advisor_pricing_reservations
      for all using (public.is_advisor_admin(advisor_id))
      with check (public.is_advisor_admin(advisor_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'advisor_referral_qualifications' and policyname = 'advisor_referral_qualifications_select_member'
  ) then
    create policy advisor_referral_qualifications_select_member
      on public.advisor_referral_qualifications
      for select using (public.is_advisor_member(inviter_advisor_id) or public.is_advisor_member(referred_advisor_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'advisor_referral_qualifications' and policyname = 'advisor_referral_qualifications_manage_admin'
  ) then
    create policy advisor_referral_qualifications_manage_admin
      on public.advisor_referral_qualifications
      for all using (public.is_advisor_admin(inviter_advisor_id))
      with check (public.is_advisor_admin(inviter_advisor_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'advisor_billing_credit_ledger' and policyname = 'advisor_billing_credit_ledger_select_member'
  ) then
    create policy advisor_billing_credit_ledger_select_member
      on public.advisor_billing_credit_ledger
      for select using (public.is_advisor_member(advisor_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'advisor_billing_credit_ledger' and policyname = 'advisor_billing_credit_ledger_manage_admin'
  ) then
    create policy advisor_billing_credit_ledger_manage_admin
      on public.advisor_billing_credit_ledger
      for all using (public.is_advisor_admin(advisor_id))
      with check (public.is_advisor_admin(advisor_id));
  end if;
end $$;

grant execute on function public.get_qualifying_live_advisor_count() to authenticated;
grant execute on function public.create_or_refresh_pricing_reservation(uuid, public.advisor_billing_interval, text, integer) to authenticated;
grant execute on function public.finalize_pricing_reservation(uuid) to authenticated;
grant execute on function public.compute_referral_free_months_available(uuid) to authenticated;
grant execute on function public.set_advisor_account_status(uuid, public.advisor_account_status, public.advisor_billing_interval, timestamptz, timestamptz, public.advisor_billing_mode) to authenticated;

-- Keep legacy trigger aligned with new pricing and discounts.
create or replace function public.apply_advisor_pricing_defaults()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_qualifying_count integer;
  v_position integer;
  v_tier public.advisor_pricing_tier;
begin
  select public.get_qualifying_live_advisor_count() into v_qualifying_count;

  if public.is_qualifying_live_advisor_row(
    coalesce(new.account_classification, 'live'),
    coalesce(new.billing_mode, 'live'),
    coalesce(new.account_status, 'registered'),
    coalesce(new.is_active, true),
    new.setup_paid_at
  ) then
    v_position := greatest(v_qualifying_count, 1);
  elsif coalesce(new.account_classification, 'live') = 'live'
    and coalesce(new.billing_mode, 'live') = 'live' then
    v_position := v_qualifying_count + 1;
  else
    v_position := greatest(v_qualifying_count, 1);
  end if;

  v_tier := public.resolve_advisor_pricing_tier_by_position(v_position);
  new.pricing_tier := v_tier;
  new.setup_fee_cents := public.resolve_setup_fee_cents_for_tier(v_tier);
  new.monthly_fee_cents := public.resolve_monthly_fee_cents_for_tier(v_tier);

  if new.referred_by_advisor_id is not null then
    new.setup_fee_discount_cents := greatest(coalesce(new.setup_fee_discount_cents, 0), 10000);
  end if;

  new.setup_fee_discount_cents := least(
    coalesce(new.setup_fee_discount_cents, 0),
    new.setup_fee_cents
  );

  if coalesce(new.platform_branding_opt_in, false) = true then
    new.platform_branding_reward_months := least(
      2,
      greatest(coalesce(new.platform_branding_reward_months, 0), 2)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_advisors_apply_pricing_defaults on public.advisors;
create trigger trg_advisors_apply_pricing_defaults
before insert or update of pricing_tier, referred_by_advisor_id, platform_branding_opt_in, account_status, account_classification, billing_mode, setup_paid_at, is_active
on public.advisors
for each row
execute function public.apply_advisor_pricing_defaults();

alter table public.advisors
  add column if not exists account_classification public.advisor_account_classification not null default 'live',
  add column if not exists billing_mode public.advisor_billing_mode not null default 'live',
  add column if not exists account_status public.advisor_account_status not null default 'registered',
  add column if not exists setup_paid_at timestamptz,
  add column if not exists active_paid_at timestamptz,
  add column if not exists billing_interval_current public.advisor_billing_interval,
  add column if not exists billing_current_period_start timestamptz,
  add column if not exists billing_current_period_end timestamptz,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists lifetime_discount_state public.advisor_lifetime_discount_state not null default 'inactive',
  add column if not exists lifetime_discount_percent integer not null default 0,
  add column if not exists lifetime_discount_activated_at timestamptz,
  add column if not exists lifetime_discount_effective_from timestamptz;

alter table public.advisors
  alter column monthly_fee_cents set default 4999,
  alter column setup_fee_cents set default 49900;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'advisors_lifetime_discount_percent_bounds') then
    alter table public.advisors
      add constraint advisors_lifetime_discount_percent_bounds
      check (lifetime_discount_percent >= 0 and lifetime_discount_percent <= 100);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'advisors_billing_period_bounds') then
    alter table public.advisors
      add constraint advisors_billing_period_bounds
      check (
        billing_current_period_end is null
        or billing_current_period_start is null
        or billing_current_period_end > billing_current_period_start
      );
  end if;
end $$;

create unique index if not exists uq_advisors_stripe_customer_id
  on public.advisors(stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists uq_advisors_stripe_subscription_id
  on public.advisors(stripe_subscription_id)
  where stripe_subscription_id is not null;

create index if not exists idx_advisors_account_classification_status
  on public.advisors(account_classification, billing_mode, account_status);

create table if not exists public.advisor_pricing_reservations (
  id uuid primary key default gen_random_uuid(),
  advisor_id uuid not null references public.advisors(id) on delete cascade,
  owner_user_id uuid references auth.users(id) on delete set null,
  mode public.advisor_billing_mode not null default 'live',
  tier_snapshot public.advisor_pricing_tier not null,
  setup_price_snapshot_cents integer not null check (setup_price_snapshot_cents >= 0),
  monthly_price_snapshot_cents integer not null check (monthly_price_snapshot_cents >= 0),
  annual_price_snapshot_cents integer not null check (annual_price_snapshot_cents >= 0),
  billing_interval_snapshot public.advisor_billing_interval not null,
  referral_discount_snapshot_cents integer not null default 0 check (referral_discount_snapshot_cents >= 0),
  annual_setup_discount_snapshot_cents integer not null default 0 check (annual_setup_discount_snapshot_cents >= 0),
  lifetime_discount_state_snapshot public.advisor_lifetime_discount_state not null default 'inactive',
  lifetime_discount_percent_snapshot integer not null default 0 check (lifetime_discount_percent_snapshot >= 0 and lifetime_discount_percent_snapshot <= 100),
  final_setup_price_snapshot_cents integer not null check (final_setup_price_snapshot_cents >= 0),
  final_recurring_price_snapshot_cents integer not null check (final_recurring_price_snapshot_cents >= 0),
  reserved_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  is_finalized boolean not null default false,
  finalized_at timestamptz,
  checkout_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists uq_advisor_pricing_reservations_checkout_reference
  on public.advisor_pricing_reservations(checkout_reference)
  where checkout_reference is not null;

create index if not exists idx_advisor_pricing_reservations_advisor
  on public.advisor_pricing_reservations(advisor_id, reserved_at desc);

create index if not exists idx_advisor_pricing_reservations_open_expiry
  on public.advisor_pricing_reservations(expires_at)
  where is_finalized = false;

create table if not exists public.advisor_referral_qualifications (
  id uuid primary key default gen_random_uuid(),
  inviter_advisor_id uuid not null references public.advisors(id) on delete cascade,
  referred_advisor_id uuid not null references public.advisors(id) on delete cascade,
  status public.advisor_referral_qualification_status not null default 'pending',
  mode public.advisor_billing_mode not null default 'live',
  first_setup_paid_at timestamptz,
  active_paid_since timestamptz,
  qualified_at timestamptz,
  reward_granted_at timestamptz,
  reward_months_granted integer not null default 0 check (reward_months_granted >= 0 and reward_months_granted <= 1),
  qualification_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (referred_advisor_id),
  unique (inviter_advisor_id, referred_advisor_id)
);

create index if not exists idx_advisor_referral_qualifications_inviter
  on public.advisor_referral_qualifications(inviter_advisor_id, status, qualified_at desc);

create table if not exists public.advisor_billing_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  advisor_id uuid not null references public.advisors(id) on delete cascade,
  source public.advisor_billing_credit_source not null,
  source_referral_qualification_id uuid references public.advisor_referral_qualifications(id) on delete set null,
  months_delta integer not null check (months_delta <> 0),
  available_from timestamptz not null default timezone('utc', now()),
  consumed_at timestamptz,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists uq_advisor_billing_credit_ledger_referral_source
  on public.advisor_billing_credit_ledger(source_referral_qualification_id, source)
  where source_referral_qualification_id is not null and source = 'referral';

create index if not exists idx_advisor_billing_credit_ledger_advisor
  on public.advisor_billing_credit_ledger(advisor_id, available_from, created_at desc);

do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at') then
    drop trigger if exists trg_advisor_pricing_reservations_updated_at on public.advisor_pricing_reservations;
    create trigger trg_advisor_pricing_reservations_updated_at
      before update on public.advisor_pricing_reservations
      for each row execute function public.set_updated_at();

    drop trigger if exists trg_advisor_referral_qualifications_updated_at on public.advisor_referral_qualifications;
    create trigger trg_advisor_referral_qualifications_updated_at
      before update on public.advisor_referral_qualifications
      for each row execute function public.set_updated_at();

    drop trigger if exists trg_advisor_billing_credit_ledger_updated_at on public.advisor_billing_credit_ledger;
    create trigger trg_advisor_billing_credit_ledger_updated_at
      before update on public.advisor_billing_credit_ledger
      for each row execute function public.set_updated_at();
  end if;
end $$;
