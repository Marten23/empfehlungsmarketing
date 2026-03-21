-- 028_reward_surveys_and_referrer_notifications.sql
-- Reward survey + lightweight inbox for referrers.

create table if not exists public.reward_surveys (
  id uuid primary key default gen_random_uuid(),
  advisor_id uuid not null references public.advisors(id) on delete cascade,
  title text not null,
  description text,
  survey_type text not null check (survey_type in ('preset', 'open_budget')),
  budget_limit_eur integer check (budget_limit_eur is null or budget_limit_eur > 0),
  target_scope text not null default 'all_active_referrers' check (target_scope in ('all_active_referrers')),
  is_active boolean not null default true,
  starts_at timestamptz not null default timezone('utc', now()),
  ends_at timestamptz,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_reward_surveys_advisor_created_at
  on public.reward_surveys (advisor_id, created_at desc);

create table if not exists public.reward_survey_options (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.reward_surveys(id) on delete cascade,
  advisor_id uuid not null references public.advisors(id) on delete cascade,
  reward_id uuid references public.rewards(id) on delete set null,
  option_text text not null,
  sort_order integer not null default 100,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_reward_survey_options_survey
  on public.reward_survey_options (survey_id, sort_order, created_at);

create table if not exists public.reward_survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.reward_surveys(id) on delete cascade,
  advisor_id uuid not null references public.advisors(id) on delete cascade,
  referrer_id uuid not null references public.referrers(id) on delete cascade,
  selected_option_id uuid references public.reward_survey_options(id) on delete set null,
  free_suggestion text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (survey_id, referrer_id)
);

create index if not exists idx_reward_survey_responses_survey
  on public.reward_survey_responses (survey_id, created_at desc);

create table if not exists public.referrer_notifications (
  id uuid primary key default gen_random_uuid(),
  advisor_id uuid not null references public.advisors(id) on delete cascade,
  referrer_id uuid not null references public.referrers(id) on delete cascade,
  notification_type text not null check (notification_type in ('reward_survey', 'info')),
  title text not null,
  message text,
  reward_survey_id uuid references public.reward_surveys(id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_referrer_notifications_referrer_created
  on public.referrer_notifications (referrer_id, created_at desc);

do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at') then
    drop trigger if exists trg_reward_surveys_updated_at on public.reward_surveys;
    create trigger trg_reward_surveys_updated_at
      before update on public.reward_surveys
      for each row execute function public.set_updated_at();

    drop trigger if exists trg_reward_survey_responses_updated_at on public.reward_survey_responses;
    create trigger trg_reward_survey_responses_updated_at
      before update on public.reward_survey_responses
      for each row execute function public.set_updated_at();

    drop trigger if exists trg_referrer_notifications_updated_at on public.referrer_notifications;
    create trigger trg_referrer_notifications_updated_at
      before update on public.referrer_notifications
      for each row execute function public.set_updated_at();
  end if;
end $$;

alter table public.reward_surveys enable row level security;
alter table public.reward_survey_options enable row level security;
alter table public.reward_survey_responses enable row level security;
alter table public.referrer_notifications enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='reward_surveys' and policyname='reward_surveys_select_member_or_referrer') then
    create policy reward_surveys_select_member_or_referrer on public.reward_surveys
      for select using (
        public.is_advisor_member(advisor_id)
        or exists (
          select 1 from public.referrers r
          where r.advisor_id = reward_surveys.advisor_id
            and r.user_id = auth.uid()
            and r.is_active = true
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='reward_surveys' and policyname='reward_surveys_manage_admin') then
    create policy reward_surveys_manage_admin on public.reward_surveys
      for all using (public.is_advisor_admin(advisor_id))
      with check (public.is_advisor_admin(advisor_id));
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='reward_survey_options' and policyname='reward_survey_options_select_member_or_referrer') then
    create policy reward_survey_options_select_member_or_referrer on public.reward_survey_options
      for select using (
        public.is_advisor_member(advisor_id)
        or exists (
          select 1 from public.referrers r
          where r.advisor_id = reward_survey_options.advisor_id
            and r.user_id = auth.uid()
            and r.is_active = true
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='reward_survey_options' and policyname='reward_survey_options_manage_admin') then
    create policy reward_survey_options_manage_admin on public.reward_survey_options
      for all using (public.is_advisor_admin(advisor_id))
      with check (public.is_advisor_admin(advisor_id));
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='reward_survey_responses' and policyname='reward_survey_responses_select_member_or_own') then
    create policy reward_survey_responses_select_member_or_own on public.reward_survey_responses
      for select using (
        public.is_advisor_member(advisor_id)
        or exists (
          select 1 from public.referrers r
          where r.id = referrer_id and r.user_id = auth.uid()
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='reward_survey_responses' and policyname='reward_survey_responses_insert_own') then
    create policy reward_survey_responses_insert_own on public.reward_survey_responses
      for insert with check (
        exists (
          select 1 from public.referrers r
          where r.id = referrer_id
            and r.advisor_id = advisor_id
            and r.user_id = auth.uid()
            and r.is_active = true
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='reward_survey_responses' and policyname='reward_survey_responses_update_own') then
    create policy reward_survey_responses_update_own on public.reward_survey_responses
      for update using (
        exists (
          select 1 from public.referrers r
          where r.id = referrer_id
            and r.user_id = auth.uid()
        )
      ) with check (
        exists (
          select 1 from public.referrers r
          where r.id = referrer_id
            and r.user_id = auth.uid()
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='referrer_notifications' and policyname='referrer_notifications_select_member_or_own') then
    create policy referrer_notifications_select_member_or_own on public.referrer_notifications
      for select using (
        public.is_advisor_member(advisor_id)
        or exists (
          select 1 from public.referrers r
          where r.id = referrer_id and r.user_id = auth.uid()
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='referrer_notifications' and policyname='referrer_notifications_insert_admin') then
    create policy referrer_notifications_insert_admin on public.referrer_notifications
      for insert with check (public.is_advisor_admin(advisor_id));
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='referrer_notifications' and policyname='referrer_notifications_update_own_or_admin') then
    create policy referrer_notifications_update_own_or_admin on public.referrer_notifications
      for update using (
        public.is_advisor_admin(advisor_id)
        or exists (
          select 1 from public.referrers r
          where r.id = referrer_id and r.user_id = auth.uid()
        )
      ) with check (
        public.is_advisor_admin(advisor_id)
        or exists (
          select 1 from public.referrers r
          where r.id = referrer_id and r.user_id = auth.uid()
        )
      );
  end if;
end $$;
