-- 033_ordely_promo_credit_guard.sql
-- Cleanup duplicate Ordely promo credits and prevent future duplicate +credit rows.

-- 1) One-time cleanup:
-- Keep only the first positive ordely_promo credit per advisor, delete later duplicates.
with ranked as (
  select
    id,
    row_number() over (
      partition by advisor_id, source
      order by created_at asc, id asc
    ) as rn
  from public.advisor_billing_credit_ledger
  where source = 'ordely_promo'
    and months_delta > 0
)
delete from public.advisor_billing_credit_ledger l
using ranked r
where l.id = r.id
  and r.rn > 1;

-- 2) Guard against race-condition duplicates:
-- Allow only one positive ordely_promo credit row per advisor.
create unique index if not exists uq_advisor_ordely_promo_positive_credit
  on public.advisor_billing_credit_ledger (advisor_id, source)
  where source = 'ordely_promo'
    and months_delta > 0;

