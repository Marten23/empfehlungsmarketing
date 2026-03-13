-- =========================================================
-- 013_referrer_activation_after_email_verification.sql
-- Activate referrers only after verified email + advisor setting
-- =========================================================

create or replace function public.complete_referrer_signup_from_invite(
  p_code text,
  p_user_id uuid,
  p_email text,
  p_full_name text,
  p_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_advisor_id uuid;
  v_advisor_slug text;
  v_referrer_id uuid;
  v_referral_code text;
  v_full_name text;
  v_email text;
  v_first_name text;
  v_last_name text;
  v_auto_activate boolean := false;
  v_email_verified boolean := false;
  v_should_activate boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_user_id is null or p_user_id <> auth.uid() then
    raise exception 'Invalid user context';
  end if;

  v_full_name := btrim(coalesce(p_full_name, ''));
  v_email := lower(btrim(coalesce(p_email, '')));

  if v_full_name = '' then
    raise exception 'Name ist erforderlich';
  end if;

  if v_email = '' then
    raise exception 'E-Mail ist erforderlich';
  end if;

  select a.id, a.slug
    into v_advisor_id, v_advisor_slug
  from public.advisors a
  where a.is_active = true
    and (
      a.referrer_invite_code = p_code
      or a.advisor_referral_slug = p_code
    )
  limit 1;

  if v_advisor_id is null then
    raise exception 'Ungueltiger Empfehler-Einladungslink';
  end if;

  select coalesce(s.auto_activate_referrers, false)
    into v_auto_activate
  from public.advisor_settings s
  where s.advisor_id = v_advisor_id
  limit 1;

  -- Activation is only allowed after verified email.
  select (u.email_confirmed_at is not null)
    into v_email_verified
  from auth.users u
  where u.id = p_user_id
  limit 1;

  v_should_activate := coalesce(v_auto_activate, false) and coalesce(v_email_verified, false);

  -- Split full name into first/last for existing schema.
  v_first_name := split_part(v_full_name, ' ', 1);
  v_last_name := btrim(substr(v_full_name, char_length(v_first_name) + 1));
  if v_last_name = '' then
    v_last_name := '-';
  end if;

  -- 1) Existing mapping by user_id
  select r.id
    into v_referrer_id
  from public.referrers r
  where r.user_id = p_user_id
  limit 1;

  if v_referrer_id is not null then
    update public.referrers
    set advisor_id = v_advisor_id,
        first_name = v_first_name,
        last_name = v_last_name,
        email = v_email,
        phone = nullif(btrim(coalesce(p_phone, '')), ''),
        -- never downgrade active->inactive
        is_active = case when is_active then true else v_should_activate end,
        updated_at = timezone('utc', now())
    where id = v_referrer_id;

    return v_referrer_id;
  end if;

  -- 2) Existing pending/application by advisor + email
  select r.id
    into v_referrer_id
  from public.referrers r
  where r.advisor_id = v_advisor_id
    and r.email = v_email
  order by r.created_at desc
  limit 1;

  if v_referrer_id is not null then
    update public.referrers
    set user_id = p_user_id,
        first_name = v_first_name,
        last_name = v_last_name,
        phone = nullif(btrim(coalesce(p_phone, '')), ''),
        -- never downgrade active->inactive
        is_active = case when is_active then true else v_should_activate end,
        updated_at = timezone('utc', now())
    where id = v_referrer_id;

    return v_referrer_id;
  end if;

  -- 3) Fresh insert
  v_referral_code := public.generate_referrer_link_code(
    v_advisor_id,
    v_advisor_slug,
    v_first_name,
    v_last_name
  );

  insert into public.referrers (
    advisor_id,
    user_id,
    referral_code,
    referral_slug,
    first_name,
    last_name,
    email,
    phone,
    is_active,
    notes
  )
  values (
    v_advisor_id,
    p_user_id,
    v_referral_code,
    v_referral_code,
    v_first_name,
    v_last_name,
    v_email,
    nullif(btrim(coalesce(p_phone, '')), ''),
    v_should_activate,
    case
      when v_should_activate
        then 'Direkte Registrierung automatisch aktiviert am ' || timezone('utc', now())
      else 'Direkte Registrierung nach E-Mail-Verifizierung in Pruefung am ' || timezone('utc', now())
    end
  )
  returning id into v_referrer_id;

  return v_referrer_id;
end;
$$;
