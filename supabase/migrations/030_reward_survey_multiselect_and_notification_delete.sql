-- 030_reward_survey_multiselect_and_notification_delete.sql
-- Persist multiselect options directly on response row and allow referrers to delete own notifications.

alter table public.reward_survey_responses
  add column if not exists selected_option_ids uuid[] null;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'referrer_notifications'
      and policyname = 'referrer_notifications_delete_own_or_admin'
  ) then
    create policy referrer_notifications_delete_own_or_admin
      on public.referrer_notifications
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

