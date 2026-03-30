-- 035_pricing_functions_phase4_phase5.sql
-- Step 2: update functions after enum values have been committed.

create or replace function public.resolve_advisor_pricing_tier_by_position(p_position integer)
returns public.advisor_pricing_tier
language sql
immutable
set search_path = public
as $$
  select case
    when p_position <= 10 then 'founder'::public.advisor_pricing_tier
    when p_position <= 50 then 'early'::public.advisor_pricing_tier
    when p_position <= 150 then 'standard'::public.advisor_pricing_tier
    when p_position <= 500 then 'scale'::public.advisor_pricing_tier
    else 'market'::public.advisor_pricing_tier
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
    when p_tier = 'standard' then 79900
    when p_tier = 'scale' then 99900
    else 149900
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
    when p_tier = 'standard' then 7999
    when p_tier = 'scale' then 9999
    else 14999
  end;
$$;

create or replace function public.resolve_annual_fee_cents_for_tier(p_tier public.advisor_pricing_tier)
returns integer
language sql
immutable
set search_path = public
as $$
  select case
    when p_tier = 'founder' then 59988
    when p_tier = 'early' then 71988
    when p_tier = 'standard' then 95988
    when p_tier = 'scale' then 119988
    else 179988
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
  v_annual := public.resolve_annual_fee_cents_for_tier(v_tier);
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
