-- =========================================================
-- 002_rls.sql
-- RLS helper functions + policies
-- =========================================================

create or replace function public.is_advisor_member(p_advisor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.advisors a
    where a.id = p_advisor_id
      and a.owner_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.advisor_users au
    where au.advisor_id = p_advisor_id
      and au.user_id = auth.uid()
  );
$$;

create or replace function public.is_advisor_admin(p_advisor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.advisors a
    where a.id = p_advisor_id
      and a.owner_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.advisor_users au
    where au.advisor_id = p_advisor_id
      and au.user_id = auth.uid()
      and au.role = 'advisor_admin'
  );
$$;

grant execute on function public.is_advisor_member(uuid) to authenticated;
grant execute on function public.is_advisor_admin(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.advisors enable row level security;
alter table public.advisor_users enable row level security;
alter table public.advisor_settings enable row level security;
alter table public.referrers enable row level security;
alter table public.referrals enable row level security;
alter table public.referral_status_history enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_redemptions enable row level security;
alter table public.points_transactions enable row level security;

do $$
begin
  -- profiles
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_select_own') then
    create policy profiles_select_own on public.profiles
      for select using (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_upsert_own') then
    create policy profiles_upsert_own on public.profiles
      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;

  -- advisors
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='advisors' and policyname='advisors_select_member') then
    create policy advisors_select_member on public.advisors
      for select using (public.is_advisor_member(id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='advisors' and policyname='advisors_insert_owner') then
    create policy advisors_insert_owner on public.advisors
      for insert with check (owner_user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='advisors' and policyname='advisors_update_admin') then
    create policy advisors_update_admin on public.advisors
      for update using (public.is_advisor_admin(id)) with check (public.is_advisor_admin(id));
  end if;

  -- advisor_users
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='advisor_users' and policyname='advisor_users_select_member_or_self') then
    create policy advisor_users_select_member_or_self on public.advisor_users
      for select using (public.is_advisor_member(advisor_id) or user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='advisor_users' and policyname='advisor_users_manage_admin') then
    create policy advisor_users_manage_admin on public.advisor_users
      for all using (public.is_advisor_admin(advisor_id)) with check (public.is_advisor_admin(advisor_id));
  end if;

  -- advisor_settings
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='advisor_settings' and policyname='advisor_settings_select_member') then
    create policy advisor_settings_select_member on public.advisor_settings
      for select using (public.is_advisor_member(advisor_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='advisor_settings' and policyname='advisor_settings_manage_admin') then
    create policy advisor_settings_manage_admin on public.advisor_settings
      for all using (public.is_advisor_admin(advisor_id)) with check (public.is_advisor_admin(advisor_id));
  end if;

  -- referrers
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='referrers' and policyname='referrers_select_member_or_self') then
    create policy referrers_select_member_or_self on public.referrers
      for select using (public.is_advisor_member(advisor_id) or user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='referrers' and policyname='referrers_manage_admin') then
    create policy referrers_manage_admin on public.referrers
      for all using (public.is_advisor_admin(advisor_id)) with check (public.is_advisor_admin(advisor_id));
  end if;

  -- referrals
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='referrals' and policyname='referrals_select_member_or_own_referrer') then
    create policy referrals_select_member_or_own_referrer on public.referrals
      for select using (
        public.is_advisor_member(advisor_id)
        or exists (
          select 1
          from public.referrers r
          where r.id = referrer_id
            and r.user_id = auth.uid()
        )
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='referrals' and policyname='referrals_manage_admin') then
    create policy referrals_manage_admin on public.referrals
      for all using (public.is_advisor_admin(advisor_id)) with check (public.is_advisor_admin(advisor_id));
  end if;

  -- referral_status_history
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='referral_status_history' and policyname='referral_status_history_select_member') then
    create policy referral_status_history_select_member on public.referral_status_history
      for select using (public.is_advisor_member(advisor_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='referral_status_history' and policyname='referral_status_history_manage_admin') then
    create policy referral_status_history_manage_admin on public.referral_status_history
      for all using (public.is_advisor_admin(advisor_id)) with check (public.is_advisor_admin(advisor_id));
  end if;

  -- rewards
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='rewards' and policyname='rewards_select_member_or_referrer') then
    create policy rewards_select_member_or_referrer on public.rewards
      for select using (
        public.is_advisor_member(advisor_id)
        or exists (
          select 1 from public.referrers r
          where r.advisor_id = rewards.advisor_id
            and r.user_id = auth.uid()
            and r.is_active = true
        )
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='rewards' and policyname='rewards_manage_admin') then
    create policy rewards_manage_admin on public.rewards
      for all using (public.is_advisor_admin(advisor_id)) with check (public.is_advisor_admin(advisor_id));
  end if;

  -- reward_redemptions
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='reward_redemptions' and policyname='redemptions_select_member_or_own') then
    create policy redemptions_select_member_or_own on public.reward_redemptions
      for select using (
        public.is_advisor_member(advisor_id)
        or exists (
          select 1 from public.referrers r
          where r.id = referrer_id and r.user_id = auth.uid()
        )
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='reward_redemptions' and policyname='redemptions_insert_own_referrer') then
    create policy redemptions_insert_own_referrer on public.reward_redemptions
      for insert with check (
        exists (
          select 1 from public.referrers r
          where r.id = referrer_id
            and r.advisor_id = advisor_id
            and r.user_id = auth.uid()
        )
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='reward_redemptions' and policyname='redemptions_update_admin') then
    create policy redemptions_update_admin on public.reward_redemptions
      for update using (public.is_advisor_admin(advisor_id)) with check (public.is_advisor_admin(advisor_id));
  end if;

  -- points_transactions
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='points_transactions' and policyname='points_select_member_or_own') then
    create policy points_select_member_or_own on public.points_transactions
      for select using (
        public.is_advisor_member(advisor_id)
        or exists (
          select 1 from public.referrers r
          where r.id = referrer_id and r.user_id = auth.uid()
        )
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='points_transactions' and policyname='points_insert_admin') then
    create policy points_insert_admin on public.points_transactions
      for insert with check (public.is_advisor_admin(advisor_id));
  end if;
end $$;

