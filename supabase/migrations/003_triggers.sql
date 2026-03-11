-- =========================================================
-- 003_triggers.sql
-- Trigger functions and business automation
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_advisors_updated_at on public.advisors;
create trigger trg_advisors_updated_at before update on public.advisors
for each row execute function public.set_updated_at();

drop trigger if exists trg_advisor_users_updated_at on public.advisor_users;
create trigger trg_advisor_users_updated_at before update on public.advisor_users
for each row execute function public.set_updated_at();

drop trigger if exists trg_advisor_settings_updated_at on public.advisor_settings;
create trigger trg_advisor_settings_updated_at before update on public.advisor_settings
for each row execute function public.set_updated_at();

drop trigger if exists trg_referrers_updated_at on public.referrers;
create trigger trg_referrers_updated_at before update on public.referrers
for each row execute function public.set_updated_at();

drop trigger if exists trg_referrals_updated_at on public.referrals;
create trigger trg_referrals_updated_at before update on public.referrals
for each row execute function public.set_updated_at();

drop trigger if exists trg_rewards_updated_at on public.rewards;
create trigger trg_rewards_updated_at before update on public.rewards
for each row execute function public.set_updated_at();

drop trigger if exists trg_reward_redemptions_updated_at on public.reward_redemptions;
create trigger trg_reward_redemptions_updated_at before update on public.reward_redemptions
for each row execute function public.set_updated_at();

create or replace function public.log_referral_status_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.referral_status_history (
      referral_id, advisor_id, old_status, new_status, changed_by_user_id, changed_at
    )
    values (
      new.id, new.advisor_id, null, new.status, coalesce(new.created_by_user_id, auth.uid()), timezone('utc', now())
    );
    return new;
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.referral_status_history (
      referral_id, advisor_id, old_status, new_status, changed_by_user_id, changed_at
    )
    values (
      new.id, new.advisor_id, old.status, new.status, auth.uid(), timezone('utc', now())
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_referrals_status_history on public.referrals;
create trigger trg_referrals_status_history
after insert or update of status on public.referrals
for each row execute function public.log_referral_status_change();

create or replace function public.set_referral_closed_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'abschluss' and (old.status is distinct from 'abschluss') and new.closed_at is null then
    new.closed_at = timezone('utc', now());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_referrals_closed_at on public.referrals;
create trigger trg_referrals_closed_at
before update of status on public.referrals
for each row execute function public.set_referral_closed_at();

create or replace function public.award_points_on_referral_close()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_points integer;
begin
  if new.status = 'abschluss' and old.status is distinct from 'abschluss' then
    select coalesce(s.points_per_successful_referral, 100)
      into v_points
    from public.advisor_settings s
    where s.advisor_id = new.advisor_id;

    v_points := coalesce(v_points, 100);

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
      'Punkte fuer erfolgreichen Abschluss'
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_referrals_award_points on public.referrals;
create trigger trg_referrals_award_points
after update of status on public.referrals
for each row execute function public.award_points_on_referral_close();

create or replace function public.set_redemption_status_timestamps()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' and new.approved_at is null then
    new.approved_at = timezone('utc', now());
  end if;

  if new.status = 'fulfilled' and old.status is distinct from 'fulfilled' and new.fulfilled_at is null then
    new.fulfilled_at = timezone('utc', now());
  end if;

  if new.status = 'rejected' and old.status is distinct from 'rejected' and new.rejected_at is null then
    new.rejected_at = timezone('utc', now());
  end if;

  return new;
end;
$$;

drop trigger if exists trg_reward_redemptions_status_timestamps on public.reward_redemptions;
create trigger trg_reward_redemptions_status_timestamps
before update of status on public.reward_redemptions
for each row execute function public.set_redemption_status_timestamps();

create or replace function public.spend_points_on_redemption_approval()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_balance integer;
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    select coalesce(sum(pt.points), 0)
      into v_balance
    from public.points_transactions pt
    where pt.advisor_id = new.advisor_id
      and pt.referrer_id = new.referrer_id;

    if v_balance < new.requested_points_cost then
      raise exception 'Nicht genug Punkte fuer Einloesung. Verfuegbar: %, benoetigt: %',
        v_balance, new.requested_points_cost;
    end if;

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
      new.advisor_id,
      new.referrer_id,
      -new.requested_points_cost,
      'spend_reward_redemption',
      new.id,
      auth.uid(),
      'Punkteabbuchung fuer Praemien-Einloesung'
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_reward_redemptions_spend_points on public.reward_redemptions;
create trigger trg_reward_redemptions_spend_points
after update of status on public.reward_redemptions
for each row execute function public.spend_points_on_redemption_approval();

