-- =========================================================
-- 001_init.sql
-- Core schema for Empfehlungsmarketing MVP
-- =========================================================

create extension if not exists pgcrypto;
create extension if not exists citext;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'referral_status') then
    create type public.referral_status as enum ('neu', 'kontaktiert', 'termin', 'abschluss', 'abgelehnt');
  end if;

  if not exists (select 1 from pg_type where typname = 'advisor_member_role') then
    create type public.advisor_member_role as enum ('advisor_admin', 'advisor_staff');
  end if;

  if not exists (select 1 from pg_type where typname = 'points_transaction_type') then
    create type public.points_transaction_type as enum (
      'earn_referral_close',
      'spend_reward_redemption',
      'manual_adjustment',
      'reversal'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'redemption_status') then
    create type public.redemption_status as enum ('requested', 'approved', 'fulfilled', 'rejected', 'cancelled');
  end if;
end $$;

-- Profiles (bridge to auth.users)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists avatar_url text,
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

-- Advisor = tenant
create table if not exists public.advisors (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  name text not null,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.advisors
  add column if not exists owner_user_id uuid references auth.users(id) on delete restrict,
  add column if not exists name text,
  add column if not exists slug text,
  add column if not exists is_active boolean not null default true,
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'advisors_slug_key') then
    alter table public.advisors add constraint advisors_slug_key unique (slug);
  end if;
end $$;

create table if not exists public.advisor_users (
  id uuid primary key default gen_random_uuid(),
  advisor_id uuid not null references public.advisors(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.advisor_member_role not null default 'advisor_staff',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (advisor_id, user_id)
);

alter table public.advisor_users
  add column if not exists advisor_id uuid references public.advisors(id) on delete cascade,
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists role public.advisor_member_role not null default 'advisor_staff',
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

create table if not exists public.advisor_settings (
  advisor_id uuid primary key references public.advisors(id) on delete cascade,
  points_per_successful_referral integer not null default 100 check (points_per_successful_referral > 0),
  brand_name text,
  primary_color text,
  logo_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.advisor_settings
  add column if not exists points_per_successful_referral integer not null default 100,
  add column if not exists brand_name text,
  add column if not exists primary_color text,
  add column if not exists logo_url text,
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

create table if not exists public.referrers (
  id uuid primary key default gen_random_uuid(),
  advisor_id uuid not null references public.advisors(id) on delete cascade,
  user_id uuid unique references auth.users(id) on delete set null,
  referral_code text not null,
  first_name text not null,
  last_name text not null,
  email citext,
  phone text,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (advisor_id, referral_code),
  unique (advisor_id, id)
);

alter table public.referrers
  add column if not exists advisor_id uuid references public.advisors(id) on delete cascade,
  add column if not exists user_id uuid unique references auth.users(id) on delete set null,
  add column if not exists referral_code text,
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists email citext,
  add column if not exists phone text,
  add column if not exists is_active boolean not null default true,
  add column if not exists notes text,
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'referrers_advisor_referral_code_key') then
    alter table public.referrers add constraint referrers_advisor_referral_code_key unique (advisor_id, referral_code);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'referrers_advisor_id_id_key') then
    alter table public.referrers add constraint referrers_advisor_id_id_key unique (advisor_id, id);
  end if;
end $$;

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  advisor_id uuid not null references public.advisors(id) on delete cascade,
  referrer_id uuid not null references public.referrers(id) on delete restrict,
  source_referral_code text,
  contact_first_name text not null,
  contact_last_name text not null,
  contact_email citext,
  contact_phone text,
  message text,
  status public.referral_status not null default 'neu',
  closed_at timestamptz,
  created_by_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (advisor_id, id),
  constraint fk_referrals_referrer_tenant
    foreign key (advisor_id, referrer_id)
    references public.referrers(advisor_id, id)
    on delete restrict
);

alter table public.referrals
  add column if not exists advisor_id uuid references public.advisors(id) on delete cascade,
  add column if not exists referrer_id uuid references public.referrers(id) on delete restrict,
  add column if not exists source_referral_code text,
  add column if not exists contact_first_name text,
  add column if not exists contact_last_name text,
  add column if not exists contact_email citext,
  add column if not exists contact_phone text,
  add column if not exists message text,
  add column if not exists status public.referral_status not null default 'neu',
  add column if not exists closed_at timestamptz,
  add column if not exists created_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'referrals_advisor_id_id_key') then
    alter table public.referrals add constraint referrals_advisor_id_id_key unique (advisor_id, id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'fk_referrals_referrer_tenant') then
    alter table public.referrals
      add constraint fk_referrals_referrer_tenant
      foreign key (advisor_id, referrer_id)
      references public.referrers(advisor_id, id)
      on delete restrict;
  end if;
end $$;

create table if not exists public.referral_status_history (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals(id) on delete cascade,
  advisor_id uuid not null references public.advisors(id) on delete cascade,
  old_status public.referral_status,
  new_status public.referral_status not null,
  changed_by_user_id uuid references auth.users(id) on delete set null,
  reason text,
  changed_at timestamptz not null default timezone('utc', now())
);

alter table public.referral_status_history
  add column if not exists referral_id uuid references public.referrals(id) on delete cascade,
  add column if not exists advisor_id uuid references public.advisors(id) on delete cascade,
  add column if not exists old_status public.referral_status,
  add column if not exists new_status public.referral_status,
  add column if not exists changed_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists reason text,
  add column if not exists changed_at timestamptz not null default timezone('utc', now());

create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  advisor_id uuid not null references public.advisors(id) on delete cascade,
  name text not null,
  description text,
  points_cost integer not null check (points_cost > 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (advisor_id, id)
);

alter table public.rewards
  add column if not exists advisor_id uuid references public.advisors(id) on delete cascade,
  add column if not exists name text,
  add column if not exists description text,
  add column if not exists points_cost integer,
  add column if not exists is_active boolean not null default true,
  add column if not exists sort_order integer not null default 0,
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'rewards_advisor_id_id_key') then
    alter table public.rewards add constraint rewards_advisor_id_id_key unique (advisor_id, id);
  end if;
end $$;

create table if not exists public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  advisor_id uuid not null references public.advisors(id) on delete cascade,
  referrer_id uuid not null references public.referrers(id) on delete restrict,
  reward_id uuid not null references public.rewards(id) on delete restrict,
  requested_points_cost integer not null check (requested_points_cost > 0),
  status public.redemption_status not null default 'requested',
  requested_at timestamptz not null default timezone('utc', now()),
  approved_at timestamptz,
  fulfilled_at timestamptz,
  rejected_at timestamptz,
  processed_by_user_id uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (advisor_id, id),
  constraint fk_redemptions_referrer_tenant
    foreign key (advisor_id, referrer_id)
    references public.referrers(advisor_id, id)
    on delete restrict,
  constraint fk_redemptions_reward_tenant
    foreign key (advisor_id, reward_id)
    references public.rewards(advisor_id, id)
    on delete restrict
);

alter table public.reward_redemptions
  add column if not exists advisor_id uuid references public.advisors(id) on delete cascade,
  add column if not exists referrer_id uuid references public.referrers(id) on delete restrict,
  add column if not exists reward_id uuid references public.rewards(id) on delete restrict,
  add column if not exists requested_points_cost integer,
  add column if not exists status public.redemption_status not null default 'requested',
  add column if not exists requested_at timestamptz not null default timezone('utc', now()),
  add column if not exists approved_at timestamptz,
  add column if not exists fulfilled_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists processed_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists notes text,
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'reward_redemptions_advisor_id_id_key') then
    alter table public.reward_redemptions add constraint reward_redemptions_advisor_id_id_key unique (advisor_id, id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'fk_redemptions_referrer_tenant') then
    alter table public.reward_redemptions
      add constraint fk_redemptions_referrer_tenant
      foreign key (advisor_id, referrer_id)
      references public.referrers(advisor_id, id)
      on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'fk_redemptions_reward_tenant') then
    alter table public.reward_redemptions
      add constraint fk_redemptions_reward_tenant
      foreign key (advisor_id, reward_id)
      references public.rewards(advisor_id, id)
      on delete restrict;
  end if;
end $$;

create table if not exists public.points_transactions (
  id uuid primary key default gen_random_uuid(),
  advisor_id uuid not null references public.advisors(id) on delete cascade,
  referrer_id uuid not null references public.referrers(id) on delete restrict,
  points integer not null check (points <> 0),
  transaction_type public.points_transaction_type not null,
  referral_id uuid references public.referrals(id) on delete set null,
  reward_redemption_id uuid references public.reward_redemptions(id) on delete set null,
  created_by_user_id uuid references auth.users(id) on delete set null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint fk_points_referrer_tenant
    foreign key (advisor_id, referrer_id)
    references public.referrers(advisor_id, id)
    on delete restrict
);

alter table public.points_transactions
  add column if not exists advisor_id uuid references public.advisors(id) on delete cascade,
  add column if not exists referrer_id uuid references public.referrers(id) on delete restrict,
  add column if not exists points integer,
  add column if not exists transaction_type public.points_transaction_type,
  add column if not exists referral_id uuid references public.referrals(id) on delete set null,
  add column if not exists reward_redemption_id uuid references public.reward_redemptions(id) on delete set null,
  add column if not exists created_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists description text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default timezone('utc', now());

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_points_referrer_tenant') then
    alter table public.points_transactions
      add constraint fk_points_referrer_tenant
      foreign key (advisor_id, referrer_id)
      references public.referrers(advisor_id, id)
      on delete restrict;
  end if;
end $$;

-- Idempotency for automatic points ledger
create unique index if not exists uq_points_referral_close_once
  on public.points_transactions (referral_id, transaction_type)
  where transaction_type = 'earn_referral_close';

create unique index if not exists uq_points_redemption_spend_once
  on public.points_transactions (reward_redemption_id, transaction_type)
  where transaction_type = 'spend_reward_redemption';

-- Performance indices
create index if not exists idx_advisors_owner_user_id on public.advisors(owner_user_id);
create index if not exists idx_advisor_users_user_id on public.advisor_users(user_id);
create index if not exists idx_advisor_users_advisor_id on public.advisor_users(advisor_id);
create index if not exists idx_referrers_advisor_id_active on public.referrers(advisor_id, is_active);
create index if not exists idx_referrers_user_id on public.referrers(user_id);
create index if not exists idx_referrers_email on public.referrers(email);
create index if not exists idx_referrals_advisor_status_created on public.referrals(advisor_id, status, created_at desc);
create index if not exists idx_referrals_referrer_created on public.referrals(referrer_id, created_at desc);
create index if not exists idx_referrals_contact_email on public.referrals(contact_email);
create index if not exists idx_referral_status_history_referral_changed on public.referral_status_history(referral_id, changed_at desc);
create index if not exists idx_referral_status_history_advisor_changed on public.referral_status_history(advisor_id, changed_at desc);
create index if not exists idx_rewards_advisor_active on public.rewards(advisor_id, is_active, sort_order);
create index if not exists idx_redemptions_advisor_status_created on public.reward_redemptions(advisor_id, status, created_at desc);
create index if not exists idx_redemptions_referrer_status on public.reward_redemptions(referrer_id, status);
create index if not exists idx_points_advisor_referrer_created on public.points_transactions(advisor_id, referrer_id, created_at desc);
create index if not exists idx_points_referrer_created on public.points_transactions(referrer_id, created_at desc);

