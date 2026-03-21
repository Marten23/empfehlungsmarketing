-- 029_reward_survey_response_options.sql
-- Multi-select options for preset reward surveys.

create table if not exists public.reward_survey_response_options (
  response_id uuid not null references public.reward_survey_responses(id) on delete cascade,
  advisor_id uuid not null references public.advisors(id) on delete cascade,
  referrer_id uuid not null references public.referrers(id) on delete cascade,
  survey_id uuid not null references public.reward_surveys(id) on delete cascade,
  option_id uuid not null references public.reward_survey_options(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (response_id, option_id)
);

create index if not exists idx_reward_survey_response_options_response
  on public.reward_survey_response_options (response_id, created_at desc);

create index if not exists idx_reward_survey_response_options_survey
  on public.reward_survey_response_options (survey_id, created_at desc);

alter table public.reward_survey_response_options enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='reward_survey_response_options'
      and policyname='reward_survey_response_options_select_member_or_own'
  ) then
    create policy reward_survey_response_options_select_member_or_own
      on public.reward_survey_response_options
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

  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='reward_survey_response_options'
      and policyname='reward_survey_response_options_insert_own'
  ) then
    create policy reward_survey_response_options_insert_own
      on public.reward_survey_response_options
      for insert with check (
        exists (
          select 1
          from public.referrers r
          where r.id = referrer_id
            and r.advisor_id = advisor_id
            and r.user_id = auth.uid()
            and r.is_active = true
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='reward_survey_response_options'
      and policyname='reward_survey_response_options_delete_own_or_admin'
  ) then
    create policy reward_survey_response_options_delete_own_or_admin
      on public.reward_survey_response_options
      for delete using (
        public.is_advisor_admin(advisor_id)
        or exists (
          select 1
          from public.referrers r
          where r.id = referrer_id
            and r.user_id = auth.uid()
        )
      );
  end if;
end $$;

