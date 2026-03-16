-- =========================================================
-- 021_fix_german_umlauts_in_points_descriptions.sql
-- Korrigiert Umlaute in Buchungsbeschreibungen und in der
-- Redemption-RPC fuer zukuenftige Eintraege.
-- =========================================================

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
    coalesce(rw.title, rw.name, 'Prämie')
  into v_reward_cost, v_reward_title
  from public.rewards rw
  where rw.id = p_reward_id
    and rw.advisor_id = v_advisor_id
    and rw.is_active = true
  limit 1;

  if v_reward_cost is null then
    raise exception 'Prämie nicht gefunden oder nicht aktiv';
  end if;

  select coalesce(sum(pt.points), 0)
    into v_balance
  from public.points_transactions pt
  where pt.advisor_id = v_advisor_id
    and pt.referrer_id = v_referrer_id;

  if v_balance < v_reward_cost then
    raise exception 'Nicht genug Punkte. Verfügbar: %, benötigt: %', v_balance, v_reward_cost;
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
    'Einlösung durch Empfehler-Dashboard'
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
    'Punkteabbuchung für Prämie: ' || v_reward_title
  )
  on conflict do nothing;

  return v_redemption_id;
end;
$$;

revoke all on function public.redeem_reward_atomic(uuid) from public;
grant execute on function public.redeem_reward_atomic(uuid) to authenticated;

-- Bestehende Buchungen mit alter Schreibweise korrigieren.
update public.points_transactions
set description = replace(description, 'fuer', 'für')
where description like '%fuer%';

update public.points_transactions
set description = replace(description, 'Praemie', 'Prämie')
where description like '%Praemie%';

