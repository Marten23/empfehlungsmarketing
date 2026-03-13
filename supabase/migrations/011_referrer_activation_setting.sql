-- =========================================================
-- 011_referrer_activation_setting.sql
-- Advisor setting: manual vs automatic referrer activation
-- =========================================================

alter table public.advisor_settings
  add column if not exists auto_activate_referrers boolean not null default false;

-- Recreate public submit function to respect advisor setting.
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
  v_auto_activate boolean := false;
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

  select coalesce(s.auto_activate_referrers, false)
    into v_auto_activate
  from public.advisor_settings s
  where s.advisor_id = v_advisor_id
  limit 1;

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
        is_active = v_auto_activate,
        notes = concat_ws(
          E'\n',
          nullif(notes, ''),
          case
            when v_auto_activate
              then 'Erneute Bewerbung automatisch aktiviert am ' || timezone('utc', now())
            else 'Erneute Bewerbung zur manuellen Pruefung am ' || timezone('utc', now())
          end
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
    v_auto_activate,
    case
      when v_auto_activate
        then 'Bewerbung automatisch aktiviert am ' || timezone('utc', now())
      else 'Bewerbung zur manuellen Pruefung am ' || timezone('utc', now())
    end
  )
  returning id into v_referrer_id;

  return v_referrer_id;
end;
$$;
