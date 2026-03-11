-- =========================================================
-- 006_public_referral_rpc.sql
-- Secure public referral flow via SECURITY DEFINER RPCs
-- =========================================================

-- Remove broad public policies if they were created before.
drop policy if exists referrers_public_lookup_active on public.referrers;
drop policy if exists advisors_public_lookup_active on public.advisors;
drop policy if exists referrals_public_insert_from_link on public.referrals;

-- Public context lookup (minimal fields only)
create or replace function public.get_public_referral_context(p_code text)
returns table (
  advisor_id uuid,
  advisor_name text,
  advisor_slug text,
  referrer_id uuid,
  referrer_first_name text,
  referrer_last_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    a.id as advisor_id,
    a.name as advisor_name,
    a.slug as advisor_slug,
    r.id as referrer_id,
    r.first_name as referrer_first_name,
    r.last_name as referrer_last_name
  from public.referrers r
  join public.advisors a on a.id = r.advisor_id
  where r.is_active = true
    and a.is_active = true
    and (
      r.referral_code = p_code
      or r.referral_slug = p_code
    )
  limit 1;
end;
$$;

-- Public insert with strict server-side checks
create or replace function public.submit_public_referral(
  p_code text,
  p_contact_name text default null,
  p_contact_email text default null,
  p_contact_phone text default null,
  p_contact_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer_id uuid;
  v_advisor_id uuid;
  v_referral_id uuid;
  v_contact_name text;
  v_contact_email text;
  v_contact_phone text;
  v_contact_note text;
begin
  v_contact_name := nullif(trim(coalesce(p_contact_name, '')), '');
  v_contact_email := nullif(trim(lower(coalesce(p_contact_email, ''))), '');
  v_contact_phone := nullif(trim(coalesce(p_contact_phone, '')), '');
  v_contact_note := nullif(trim(coalesce(p_contact_note, '')), '');

  if v_contact_name is null and v_contact_email is null and v_contact_phone is null then
    raise exception 'At least one contact field (name/email/phone) is required.'
      using errcode = 'P0001';
  end if;

  select r.id, r.advisor_id
    into v_referrer_id, v_advisor_id
  from public.referrers r
  join public.advisors a on a.id = r.advisor_id
  where r.is_active = true
    and a.is_active = true
    and (
      r.referral_code = p_code
      or r.referral_slug = p_code
    )
  limit 1;

  if v_referrer_id is null or v_advisor_id is null then
    raise exception 'Referral link is invalid or inactive.'
      using errcode = 'P0001';
  end if;

  insert into public.referrals (
    advisor_id,
    referrer_id,
    status,
    source_referral_code,
    contact_name,
    contact_email,
    contact_phone,
    contact_note,
    message
  )
  values (
    v_advisor_id,
    v_referrer_id,
    'neu',
    p_code,
    v_contact_name,
    v_contact_email,
    v_contact_phone,
    v_contact_note,
    v_contact_note
  )
  returning id into v_referral_id;

  return v_referral_id;
end;
$$;

revoke all on function public.get_public_referral_context(text) from public;
revoke all on function public.submit_public_referral(text, text, text, text, text) from public;

grant execute on function public.get_public_referral_context(text) to anon, authenticated;
grant execute on function public.submit_public_referral(text, text, text, text, text) to anon, authenticated;

