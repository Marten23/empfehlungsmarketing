-- 034_extend_pricing_tiers_phase4_phase5.sql
-- Step 1 only: extend enum values.
-- IMPORTANT: enum values must be committed before they can be referenced.

do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.advisor_pricing_tier'::regtype
      and enumlabel = 'scale'
  ) then
    alter type public.advisor_pricing_tier add value 'scale';
  end if;

  if not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.advisor_pricing_tier'::regtype
      and enumlabel = 'market'
  ) then
    alter type public.advisor_pricing_tier add value 'market';
  end if;
end $$;
