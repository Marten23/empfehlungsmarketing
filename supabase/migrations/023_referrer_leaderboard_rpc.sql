-- Sichere Ranglisten-Abfrage für Empfehler- und Beraterkontext.
-- Liefert Gesamtpunkte (nur positive Punkte) je Empfehler innerhalb eines Beraters.

create or replace function public.get_referrer_leaderboard(p_advisor_id uuid)
returns table (
  referrer_id uuid,
  total_points bigint
)
language sql
security definer
set search_path = public
as $$
  with access as (
    select
      public.is_advisor_member(p_advisor_id) as is_member,
      exists (
        select 1
        from public.referrers r
        where r.advisor_id = p_advisor_id
          and r.user_id = auth.uid()
      ) as is_assigned_referrer
  )
  select
    pt.referrer_id,
    sum(greatest(pt.points, 0))::bigint as total_points
  from public.points_transactions pt
  cross join access a
  where pt.advisor_id = p_advisor_id
    and (a.is_member or a.is_assigned_referrer)
  group by pt.referrer_id;
$$;

revoke all on function public.get_referrer_leaderboard(uuid) from public;
grant execute on function public.get_referrer_leaderboard(uuid) to authenticated;
grant execute on function public.get_referrer_leaderboard(uuid) to service_role;

