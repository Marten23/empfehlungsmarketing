-- =========================================================
-- 016_referrer_can_read_advisor_settings.sql
-- Allow active referrers to read advisor_settings of their advisor
-- =========================================================

drop policy if exists advisor_settings_select_member on public.advisor_settings;

create policy advisor_settings_select_member on public.advisor_settings
  for select
  using (
    public.is_advisor_member(advisor_id)
    or exists (
      select 1
      from public.referrers r
      where r.advisor_id = advisor_settings.advisor_id
        and r.user_id = auth.uid()
        and r.is_active = true
    )
  );
