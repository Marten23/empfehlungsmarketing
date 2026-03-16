alter table public.profiles
  add column if not exists referrer_theme text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'role'
  ) then
    execute $sql$
      update public.profiles
      set referrer_theme = 'lila'
      where role = 'referrer'
        and referrer_theme is null
    $sql$;
  else
    update public.profiles
    set referrer_theme = 'lila'
    where referrer_theme is null;
  end if;
end $$;

alter table public.profiles
  alter column referrer_theme set default 'lila';

alter table public.profiles
  drop constraint if exists profiles_referrer_theme_check;

alter table public.profiles
  add constraint profiles_referrer_theme_check
  check (referrer_theme in ('lila', 'midnight') or referrer_theme is null);
