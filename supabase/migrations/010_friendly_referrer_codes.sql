-- =========================================================
-- 010_friendly_referrer_codes.sql
-- Make referrer codes human-friendly but unique per advisor
-- =========================================================

-- Normalize arbitrary text to a URL-safe slug part.
create or replace function public.slugify_text(p_value text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v text := lower(coalesce(p_value, ''));
begin
  -- German-friendly replacements first
  v := replace(v, 'ä', 'ae');
  v := replace(v, 'ö', 'oe');
  v := replace(v, 'ü', 'ue');
  v := replace(v, 'ß', 'ss');

  -- Keep only ascii letters/digits/hyphen
  v := regexp_replace(v, '[^a-z0-9]+', '-', 'g');
  v := regexp_replace(v, '-{2,}', '-', 'g');
  v := trim(both '-' from v);

  if v = '' then
    return 'profil';
  end if;

  return v;
end;
$$;

-- Generate a readable, unique public code for a referrer within one advisor tenant.
create or replace function public.generate_referrer_link_code(
  p_advisor_id uuid,
  p_advisor_slug text,
  p_first_name text,
  p_last_name text
)
returns text
language plpgsql
set search_path = public
as $$
declare
  v_advisor_part text;
  v_initials text;
  v_suffix text;
  v_candidate text;
  v_try integer := 0;
begin
  v_advisor_part := left(public.slugify_text(coalesce(p_advisor_slug, 'berater')), 20);
  v_initials :=
    left(public.slugify_text(coalesce(p_first_name, 'x')), 1)
    || left(public.slugify_text(coalesce(p_last_name, 'x')), 1);

  if btrim(v_initials) = '' then
    v_initials := 'xx';
  end if;

  loop
    v_suffix := substr(md5(random()::text || clock_timestamp()::text || v_try::text), 1, 4);
    v_candidate := v_advisor_part || '-' || v_initials || '-' || v_suffix;

    exit when not exists (
      select 1
      from public.referrers r
      where r.advisor_id = p_advisor_id
        and (r.referral_code = v_candidate or r.referral_slug = v_candidate)
    );

    v_try := v_try + 1;
    if v_try > 120 then
      raise exception 'Could not generate unique referrer link code';
    end if;
  end loop;

  return v_candidate;
end;
$$;

-- Recreate public submit function so new applications get readable code/slug.
create or replace function public.submit_public_referrer_application(
  p_code text,
  p_full_name text,
  p_email text,
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
begin
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

  -- Split "full name" into first/last name for existing schema.
  v_first_name := split_part(v_full_name, ' ', 1);
  v_last_name := btrim(substr(v_full_name, char_length(v_first_name) + 1));
  if v_last_name = '' then
    v_last_name := '-';
  end if;

  -- Idempotent behaviour for repeated submissions with same advisor+email.
  select r.id
    into v_referrer_id
  from public.referrers r
  where r.advisor_id = v_advisor_id
    and r.email = v_email
    and r.user_id is null
  order by r.created_at desc
  limit 1;

  if v_referrer_id is not null then
    update public.referrers
    set first_name = v_first_name,
        last_name = v_last_name,
        phone = nullif(btrim(coalesce(p_phone, '')), ''),
        is_active = false,
        notes = concat_ws(
          E'\n',
          nullif(notes, ''),
          'Erneute Bewerbung ueber Empfehler-Einladungslink am ' || timezone('utc', now())
        ),
        updated_at = timezone('utc', now())
    where id = v_referrer_id;

    return v_referrer_id;
  end if;

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
    null,
    v_referral_code,
    v_referral_code,
    v_first_name,
    v_last_name,
    v_email,
    nullif(btrim(coalesce(p_phone, '')), ''),
    false,
    'Bewerbung ueber Empfehler-Einladungslink am ' || timezone('utc', now())
  )
  returning id into v_referrer_id;

  return v_referrer_id;
end;
$$;

-- Backfill existing pending_* codes once.
do $$
declare
  v_row record;
  v_code text;
begin
  for v_row in
    select
      r.id,
      r.advisor_id,
      r.first_name,
      r.last_name,
      a.slug as advisor_slug
    from public.referrers r
    join public.advisors a on a.id = r.advisor_id
    where r.referral_code like 'pending\_%' escape '\'
  loop
    v_code := public.generate_referrer_link_code(
      v_row.advisor_id,
      v_row.advisor_slug,
      v_row.first_name,
      v_row.last_name
    );

    update public.referrers
    set referral_code = v_code,
        referral_slug = coalesce(referral_slug, v_code),
        updated_at = timezone('utc', now())
    where id = v_row.id;
  end loop;
end $$;
