-- 027_account_deletion_rpc.sql
-- Irreversible self-service account deletion for advisor/referrer users.

create or replace function public.delete_my_referrer_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_referrer_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select r.id
  into v_referrer_id
  from public.referrers r
  where r.user_id = v_user_id
  limit 1;

  if v_referrer_id is not null then
    delete from public.points_transactions where referrer_id = v_referrer_id;
    delete from public.reward_redemptions where referrer_id = v_referrer_id;
    delete from public.referrals where referrer_id = v_referrer_id;
    delete from public.referrers where id = v_referrer_id;
  end if;

  delete from public.profiles where user_id = v_user_id;
  delete from auth.users where id = v_user_id;
end;
$$;

revoke all on function public.delete_my_referrer_account() from public;
grant execute on function public.delete_my_referrer_account() to authenticated;

create or replace function public.delete_my_advisor_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Remove dependent records explicitly to avoid FK restrict conflicts.
  delete from public.points_transactions
  where advisor_id in (
    select id from public.advisors where owner_user_id = v_user_id
  );

  delete from public.reward_redemptions
  where advisor_id in (
    select id from public.advisors where owner_user_id = v_user_id
  );

  delete from public.referral_status_history
  where advisor_id in (
    select id from public.advisors where owner_user_id = v_user_id
  );

  delete from public.referrals
  where advisor_id in (
    select id from public.advisors where owner_user_id = v_user_id
  );

  delete from public.rewards
  where advisor_id in (
    select id from public.advisors where owner_user_id = v_user_id
  );

  delete from public.referrers
  where advisor_id in (
    select id from public.advisors where owner_user_id = v_user_id
  );

  delete from public.advisor_settings
  where advisor_id in (
    select id from public.advisors where owner_user_id = v_user_id
  );

  delete from public.advisor_users
  where advisor_id in (
    select id from public.advisors where owner_user_id = v_user_id
  );

  delete from public.advisors
  where owner_user_id = v_user_id;

  delete from public.profiles where user_id = v_user_id;
  delete from auth.users where id = v_user_id;
end;
$$;

revoke all on function public.delete_my_advisor_account() from public;
grant execute on function public.delete_my_advisor_account() to authenticated;
