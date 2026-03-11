-- =========================================================
-- 008_unified_public_invite_codes.sql
-- Unified globally-unique public invite codes for referrers and advisors
-- =========================================================

-- 1) Extend existing tables (no new table required)
alter table public.advisors
  add column if not exists invite_code text;

alter table public.referrers
  add column if not exists invite_code text;

create unique index if not exists uq_advisors_invite_code
  on public.advisors(invite_code)
  where invite_code is not null;

create unique index if not exists uq_referrers_invite_code
  on public.referrers(invite_code)
  where invite_code is not null;

-- 2) Helper: generate a globally unique code across advisor/referrer invite spaces
create or replace function public.generate_public_invite_code(p_prefix text)
returns text
language plpgsql
set search_path = public
as $$
declare
  v_code text;
  v_exists boolean;
begin
  if p_prefix not in ('a_', 'r_') then
    raise exception 'Unsupported prefix. Use a_ or r_.';
  end if;

  loop
    -- 10 hex chars ~= 40 bits entropy; with prefix -> a_xxxxxxxxxx / r_xxxxxxxxxx
    v_code := p_prefix || lower(encode(gen_random_bytes(5), 'hex'));

    select exists(
      select 1 from public.advisors a where a.invite_code = v_code
      union all
      select 1 from public.referrers r where r.invite_code = v_code
    )
    into v_exists;

    exit when not coalesce(v_exists, false);
  end loop;

  return v_code;
end;
$$;

-- 3) Backfill existing advisors/referrers
update public.advisors
set invite_code = public.generate_public_invite_code('a_')
where invite_code is null;

update public.referrers
set invite_code = public.generate_public_invite_code('r_')
where invite_code is null;

-- 4) Set code automatically for new rows
create or replace function public.set_default_advisor_invite_code()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.invite_code is null or btrim(new.invite_code) = '' then
    new.invite_code := public.generate_public_invite_code('a_');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_advisors_set_invite_code on public.advisors;
create trigger trg_advisors_set_invite_code
before insert on public.advisors
for each row
execute function public.set_default_advisor_invite_code();

create or replace function public.set_default_referrer_invite_code()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.invite_code is null or btrim(new.invite_code) = '' then
    new.invite_code := public.generate_public_invite_code('r_');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_referrers_set_invite_code on public.referrers;
create trigger trg_referrers_set_invite_code
before insert on public.referrers
for each row
execute function public.set_default_referrer_invite_code();

-- 5) Unified lookup for /ref/[code]
create or replace function public.get_public_link_context(p_code text)
returns table (
  link_type text, -- 'referrer' | 'advisor'
  advisor_id uuid,
  advisor_name text,
  advisor_slug text,
  advisor_invite_code text,
  referrer_id uuid,
  referrer_first_name text,
  referrer_last_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Priority 1: explicit referrer invite code
  return query
  select
    'referrer'::text as link_type,
    a.id as advisor_id,
    a.name as advisor_name,
    a.slug as advisor_slug,
    a.invite_code as advisor_invite_code,
    r.id as referrer_id,
    r.first_name as referrer_first_name,
    r.last_name as referrer_last_name
  from public.referrers r
  join public.advisors a on a.id = r.advisor_id
  where r.is_active = true
    and a.is_active = true
    and (
      r.invite_code = p_code
      or r.referral_slug = p_code
      or r.referral_code = p_code
    )
  limit 1;

  if found then
    return;
  end if;

  -- Priority 2: advisor invite/slug
  return query
  select
    'advisor'::text as link_type,
    a.id as advisor_id,
    a.name as advisor_name,
    a.slug as advisor_slug,
    a.invite_code as advisor_invite_code,
    null::uuid as referrer_id,
    null::text as referrer_first_name,
    null::text as referrer_last_name
  from public.advisors a
  where a.is_active = true
    and (
      a.invite_code = p_code
      or a.advisor_referral_slug = p_code
      or a.slug = p_code
    )
  limit 1;
end;
$$;

-- 6) Public submit accepts both legacy and new referrer code fields
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
      r.invite_code = p_code
      or r.referral_slug = p_code
      or r.referral_code = p_code
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

revoke all on function public.get_public_link_context(text) from public;
revoke all on function public.submit_public_referral(text, text, text, text, text) from public;

grant execute on function public.get_public_link_context(text) to anon, authenticated;
grant execute on function public.submit_public_referral(text, text, text, text, text) to anon, authenticated;

