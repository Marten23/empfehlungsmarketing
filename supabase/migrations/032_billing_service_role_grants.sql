-- 032_billing_service_role_grants.sql
-- Ensure Stripe webhook processing with service role can execute billing RPCs.

grant execute on function public.get_qualifying_live_advisor_count() to service_role;
grant execute on function public.create_or_refresh_pricing_reservation(uuid, public.advisor_billing_interval, text, integer) to service_role;
grant execute on function public.finalize_pricing_reservation(uuid) to service_role;
grant execute on function public.compute_referral_free_months_available(uuid) to service_role;
grant execute on function public.set_advisor_account_status(uuid, public.advisor_account_status, public.advisor_billing_interval, timestamptz, timestamptz, public.advisor_billing_mode) to service_role;

