-- =========================================================
-- 014_points_mode_and_atomic_redemption.sql
-- Advisor points mode + atomic reward redemption
-- =========================================================

-- 1) Per-advisor mode: auto award points on referral close (default true)
alter table public.advisor_settings
  add column if not exists auto_award_points_on_referral_close boolean not null default true;

-- 2) Ensure a redemption spend is only booked once
create unique index if not exists uq_points_redemption_spend_once
  on public.points_transactions (reward_redemption_id, transaction_type)
  where reward_redemption_id is not null
    and transaction_type = 'spend_reward_redemption';

-- 3) Recreate trigger function to respect advisor setting
create or replace function public.award_points_on_referral_close()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_points integer;
  v_auto_award boolean;
begin
  if new.status = 'abschluss' and old.status is distinct from 'abschluss' then
    select
      coalesce(s.points_per_successful_referral, 100),
      coalesce(s.auto_award_points_on_referral_close, true)
    into v_points, v_auto_award
    from public.advisor_settings s
    where s.advisor_id = new.advisor_id;

    v_points := coalesce(v_points, 100);
    v_auto_award := coalesce(v_auto_award, true);

    if v_auto_award then
      insert into public.points_transactions (
        advisor_id,
        referrer_id,
        points,
        transaction_type,
        referral_id,
        created_by_user_id,
        description
      )
      values (
        new.advisor_id,
        new.referrer_id,
        v_points,
        'earn_referral_close',
        new.id,
        auth.uid(),
        'Automatische Punkte fuer erfolgreichen Abschluss'
      )
      on conflict do nothing;
    end if;
  end if;

  return new;
end;
$$;

-- 4) Atomic redeem RPC for referrers
create or replace function public.redeem_reward_atomic(
  p_reward_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_referrer_id uuid;
  v_advisor_id uuid;
  v_reward_cost integer;
  v_reward_title text;
  v_balance integer;
  v_redemption_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Nicht eingeloggt';
  end if;

  select
    r.id,
    r.advisor_id
  into v_referrer_id, v_advisor_id
  from public.referrers r
  where r.user_id = v_user_id
    and r.is_active = true
  limit 1;

  if v_referrer_id is null or v_advisor_id is null then
    raise exception 'Kein aktiver Empfehler-Kontext gefunden';
  end if;

  select
    rw.points_cost,
    coalesce(rw.title, rw.name, 'Praemie')
  into v_reward_cost, v_reward_title
  from public.rewards rw
  where rw.id = p_reward_id
    and rw.advisor_id = v_advisor_id
    and rw.is_active = true
  limit 1;

  if v_reward_cost is null then
    raise exception 'Praemie nicht gefunden oder nicht aktiv';
  end if;

  select coalesce(sum(pt.points), 0)
    into v_balance
  from public.points_transactions pt
  where pt.advisor_id = v_advisor_id
    and pt.referrer_id = v_referrer_id;

  if v_balance < v_reward_cost then
    raise exception 'Nicht genug Punkte. Verfuegbar: %, benoetigt: %', v_balance, v_reward_cost;
  end if;

  insert into public.reward_redemptions (
    advisor_id,
    referrer_id,
    reward_id,
    requested_points_cost,
    status,
    notes
  )
  values (
    v_advisor_id,
    v_referrer_id,
    p_reward_id,
    v_reward_cost,
    'offen',
    'Einloesung durch Empfehler-Dashboard'
  )
  returning id into v_redemption_id;

  insert into public.points_transactions (
    advisor_id,
    referrer_id,
    points,
    transaction_type,
    reward_redemption_id,
    created_by_user_id,
    description
  )
  values (
    v_advisor_id,
    v_referrer_id,
    -v_reward_cost,
    'spend_reward_redemption',
    v_redemption_id,
    v_user_id,
    'Punkteabbuchung fuer Praemie: ' || v_reward_title
  )
  on conflict do nothing;

  return v_redemption_id;
end;
$$;

revoke all on function public.redeem_reward_atomic(uuid) from public;
grant execute on function public.redeem_reward_atomic(uuid) to authenticated;
