-- =========================================================
-- 009_referrer_invite_link.sql
-- New public link type: advisor -> referrer invite
-- =========================================================

-- 1) Dedicated code for advisor -> referrer invite links
alter table public.advisors
  add column if not exists referrer_invite_code text;

create unique index if not exists uq_advisors_referrer_invite_code
  on public.advisors(referrer_invite_code)
  where referrer_invite_code is not null;

create or replace function public.generate_referrer_invite_code()
returns text
language plpgsql
set search_path = public
as $$
declare
  v_code text;
  v_try integer := 0;
begin
  loop
    v_code := 'rf_' || substr(md5(random()::text || clock_timestamp()::text || v_try::text), 1, 10);
    exit when not exists (
      select 1
      from public.advisors a
      where a.referrer_invite_code = v_code
    );

    v_try := v_try + 1;
    if v_try > 100 then
      raise exception 'Could not generate unique referrer invite code';
    end if;
  end loop;

  return v_code;
end;
$$;

update public.advisors
set referrer_invite_code = public.generate_referrer_invite_code()
where referrer_invite_code is null;

create or replace function public.set_default_referrer_invite_code_for_advisor()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.referrer_invite_code is null or btrim(new.referrer_invite_code) = '' then
    new.referrer_invite_code := public.generate_referrer_invite_code();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_advisors_set_referrer_invite_code on public.advisors;
create trigger trg_advisors_set_referrer_invite_code
before insert on public.advisors
for each row
execute function public.set_default_referrer_invite_code_for_advisor();

-- 2) Public lookup for /empfehler/[code]
create or replace function public.get_public_referrer_invite_context(p_code text)
returns table (
  advisor_id uuid,
  advisor_name text,
  advisor_slug text,
  referrer_invite_code text
)
language sql
stable
set search_path = public
as $$
  select
    a.id as advisor_id,
    a.name as advisor_name,
    a.slug as advisor_slug,
    a.referrer_invite_code
  from public.advisors a
  where a.is_active = true
    and (
      a.referrer_invite_code = p_code
      or a.advisor_referral_slug = p_code
    )
  limit 1;
$$;

-- 3) Public form submit for "advisor invites referrer"
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

  select
    a.id
  into v_advisor_id
  from public.advisors a
  where a.is_active = true
    and (
      a.referrer_invite_code = p_code
      or a.advisor_referral_slug = p_code
    )
  limit 1;

  if v_advisor_id is null then
    raise exception 'Ungültiger Empfehler-Einladungslink';
  end if;

  -- Split "full name" into first/last name for existing table structure.
  v_first_name := split_part(v_full_name, ' ', 1);
  v_last_name := btrim(substr(v_full_name, char_length(v_first_name) + 1));
  if v_last_name = '' then
    v_last_name := '-';
  end if;

  -- Idempotent behaviour for repeated submissions with same advisor+email.
  select
    r.id
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
          'Erneute Bewerbung über Empfehler-Einladungslink am ' || timezone('utc', now())
        ),
        updated_at = timezone('utc', now())
    where id = v_referrer_id;

    return v_referrer_id;
  end if;

  loop
    v_referral_code := 'pending_' || substr(md5(random()::text || clock_timestamp()::text), 1, 10);
    exit when not exists (
      select 1
      from public.referrers r
      where r.advisor_id = v_advisor_id
        and r.referral_code = v_referral_code
    );
  end loop;

  insert into public.referrers (
    advisor_id,
    user_id,
    referral_code,
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
    v_first_name,
    v_last_name,
    v_email,
    nullif(btrim(coalesce(p_phone, '')), ''),
    false,
    'Bewerbung über Empfehler-Einladungslink am ' || timezone('utc', now())
  )
  returning id into v_referrer_id;

  return v_referrer_id;
end;
$$;

revoke all on function public.get_public_referrer_invite_context(text) from public;
revoke all on function public.submit_public_referrer_application(text, text, text, text) from public;

grant execute on function public.get_public_referrer_invite_context(text) to anon, authenticated;
grant execute on function public.submit_public_referrer_application(text, text, text, text) to anon, authenticated;
