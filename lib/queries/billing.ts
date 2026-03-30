import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeSupabaseError } from "@/lib/supabase/errors";
import type { BillingInterval } from "@/lib/billing/domain";

export type PricingReservationRow = {
  id: string;
  advisor_id: string;
  mode: "live" | "test";
  tier_snapshot: "founder" | "early" | "standard" | "scale" | "market";
  setup_price_snapshot_cents: number;
  monthly_price_snapshot_cents: number;
  annual_price_snapshot_cents: number;
  billing_interval_snapshot: BillingInterval;
  referral_discount_snapshot_cents: number;
  annual_setup_discount_snapshot_cents: number;
  lifetime_discount_state_snapshot: "inactive" | "pending_next_cycle" | "active";
  lifetime_discount_percent_snapshot: number;
  final_setup_price_snapshot_cents: number;
  final_recurring_price_snapshot_cents: number;
  reserved_at: string;
  expires_at: string;
  is_finalized: boolean;
  checkout_reference: string | null;
};

export async function createPricingReservation(
  supabase: SupabaseClient,
  params: {
    advisorId: string;
    billingInterval: BillingInterval;
    checkoutReference?: string | null;
    ttlMinutes?: number;
  },
): Promise<PricingReservationRow> {
  const { data, error } = await supabase.rpc("create_or_refresh_pricing_reservation", {
    p_advisor_id: params.advisorId,
    p_billing_interval: params.billingInterval,
    p_checkout_reference: params.checkoutReference ?? null,
    p_ttl_minutes: params.ttlMinutes ?? 30,
  });

  if (error) throw normalizeSupabaseError(error);
  return data as PricingReservationRow;
}

export async function finalizePricingReservation(
  supabase: SupabaseClient,
  reservationId: string,
): Promise<PricingReservationRow> {
  const { data, error } = await supabase.rpc("finalize_pricing_reservation", {
    p_reservation_id: reservationId,
  });

  if (error) throw normalizeSupabaseError(error);
  return data as PricingReservationRow;
}

export async function setAdvisorAccountStatus(
  supabase: SupabaseClient,
  params: {
    advisorId: string;
    newStatus:
      | "registered"
      | "checkout_reserved"
      | "setup_pending"
      | "setup_paid"
      | "active_paid"
      | "canceled"
      | "delinquent"
      | "test_only";
    billingInterval?: BillingInterval | null;
    periodStart?: string | null;
    periodEnd?: string | null;
    mode?: "live" | "test" | null;
  },
) {
  const { data, error } = await supabase.rpc("set_advisor_account_status", {
    p_advisor_id: params.advisorId,
    p_new_status: params.newStatus,
    p_billing_interval: params.billingInterval ?? null,
    p_period_start: params.periodStart ?? null,
    p_period_end: params.periodEnd ?? null,
    p_mode: params.mode ?? null,
  });

  if (error) throw normalizeSupabaseError(error);
  return data as Record<string, unknown>;
}

export async function getBillingDebugSnapshot(
  supabase: SupabaseClient,
  advisorId: string,
) {
  const [{ data: advisor, error: advisorError }, { data: reservations, error: reservationError }, { data: qualifications, error: qualificationError }, { data: credits, error: creditError }, { data: qualifiedLiveCount, error: qualifiedCountError }, { data: freeMonthsBalance, error: freeMonthsError }] = await Promise.all([
    supabase
      .from("advisors")
      .select(
        "id, owner_user_id, pricing_tier, setup_fee_cents, monthly_fee_cents, setup_fee_discount_cents, account_classification, billing_mode, account_status, setup_paid_at, active_paid_at, billing_interval_current, billing_current_period_start, billing_current_period_end, referral_reward_free_months, referral_reward_lifetime_discount_percent, lifetime_discount_state, lifetime_discount_percent, lifetime_discount_activated_at, lifetime_discount_effective_from",
      )
      .eq("id", advisorId)
      .maybeSingle(),
    supabase
      .from("advisor_pricing_reservations")
      .select(
        "id, tier_snapshot, setup_price_snapshot_cents, monthly_price_snapshot_cents, annual_price_snapshot_cents, billing_interval_snapshot, referral_discount_snapshot_cents, annual_setup_discount_snapshot_cents, final_setup_price_snapshot_cents, final_recurring_price_snapshot_cents, lifetime_discount_state_snapshot, lifetime_discount_percent_snapshot, reserved_at, expires_at, is_finalized, checkout_reference",
      )
      .eq("advisor_id", advisorId)
      .order("reserved_at", { ascending: false })
      .limit(25),
    supabase
      .from("advisor_referral_qualifications")
      .select(
        "id, inviter_advisor_id, referred_advisor_id, status, mode, first_setup_paid_at, active_paid_since, qualified_at, reward_granted_at, reward_months_granted, qualification_reason, created_at",
      )
      .eq("inviter_advisor_id", advisorId)
      .order("created_at", { ascending: false }),
    supabase
      .from("advisor_billing_credit_ledger")
      .select(
        "id, source, source_referral_qualification_id, months_delta, available_from, consumed_at, note, created_at",
      )
      .eq("advisor_id", advisorId)
      .order("created_at", { ascending: false }),
    supabase.rpc("get_qualifying_live_advisor_count"),
    supabase.rpc("compute_referral_free_months_available", { p_advisor_id: advisorId }),
  ]);

  if (advisorError) throw normalizeSupabaseError(advisorError);
  if (reservationError) throw normalizeSupabaseError(reservationError);
  if (qualificationError) throw normalizeSupabaseError(qualificationError);
  if (creditError) throw normalizeSupabaseError(creditError);
  if (qualifiedCountError) throw normalizeSupabaseError(qualifiedCountError);
  if (freeMonthsError) throw normalizeSupabaseError(freeMonthsError);

  return {
    advisor: advisor ?? null,
    reservations: reservations ?? [],
    qualifications: qualifications ?? [],
    credits: credits ?? [],
    qualifiedLiveAdvisorCount: Number(qualifiedLiveCount ?? 0),
    freeMonthsBalance: Number(freeMonthsBalance ?? 0),
  };
}

export async function getQualifyingLiveAdvisorCount(
  supabase: SupabaseClient,
): Promise<number> {
  const { data, error } = await supabase.rpc("get_qualifying_live_advisor_count");
  if (error) throw normalizeSupabaseError(error);
  return Number(data ?? 0);
}

export type AdvisorFreeMonthsState = {
  total_credited: number;
  available_now: number;
  reserved_next_cycle: number;
  consumed: number;
  referral_credited: number;
  ordely_credited: number;
};

type BillingLedgerRow = {
  months_delta: number;
  source: "referral" | "ordely_promo" | "manual_adjustment" | "system";
  available_from: string | null;
  consumed_at: string | null;
};

export async function getAdvisorFreeMonthsState(
  supabase: SupabaseClient,
  advisorId: string,
): Promise<AdvisorFreeMonthsState> {
  const now = Date.now();
  const [{ data: ledgerRows, error: ledgerError }, { data: availableRpc, error: availableError }] =
    await Promise.all([
      supabase
        .from("advisor_billing_credit_ledger")
        .select("months_delta, source, available_from, consumed_at")
        .eq("advisor_id", advisorId),
      supabase.rpc("compute_referral_free_months_available", {
        p_advisor_id: advisorId,
      }),
    ]);

  if (ledgerError) throw normalizeSupabaseError(ledgerError);
  if (availableError) throw normalizeSupabaseError(availableError);

  const rows = (ledgerRows ?? []) as BillingLedgerRow[];
  const positives = rows.filter((row) => row.months_delta > 0);

  const totalCredited = positives.reduce((sum, row) => sum + row.months_delta, 0);
  const referralCredited = positives
    .filter((row) => row.source === "referral")
    .reduce((sum, row) => sum + row.months_delta, 0);
  const ordelyCredited = positives
    .filter((row) => row.source === "ordely_promo")
    .reduce((sum, row) => sum + row.months_delta, 0);

  const reservedNextCycle = positives
    .filter((row) => {
      if (!row.available_from) return false;
      const availableAt = new Date(row.available_from).getTime();
      return Number.isFinite(availableAt) && availableAt > now;
    })
    .reduce((sum, row) => sum + row.months_delta, 0);

  const consumed = Math.abs(
    rows
      .filter((row) => row.months_delta < 0)
      .reduce((sum, row) => sum + row.months_delta, 0),
  );

  return {
    total_credited: totalCredited,
    available_now: Number(availableRpc ?? 0),
    reserved_next_cycle: reservedNextCycle,
    consumed,
    referral_credited: referralCredited,
    ordely_credited: ordelyCredited,
  };
}

export async function grantOrdelyPromoMonthsIfEligible(
  supabase: SupabaseClient,
  advisorId: string,
): Promise<number> {
  const nowIso = new Date().toISOString();

  const [{ data: existingOrdelyRows, error: existingOrdelyError }, { data: positiveRows, error: positiveError }, { data: advisorRow, error: advisorError }] =
    await Promise.all([
      supabase
        .from("advisor_billing_credit_ledger")
        .select("id, months_delta")
        .eq("advisor_id", advisorId)
        .eq("source", "ordely_promo")
        .gt("months_delta", 0)
        .limit(1),
      supabase
        .from("advisor_billing_credit_ledger")
        .select("months_delta")
        .eq("advisor_id", advisorId)
        .gt("months_delta", 0),
      supabase
        .from("advisors")
        .select("billing_interval_current, billing_current_period_end")
        .eq("id", advisorId)
        .maybeSingle(),
    ]);

  if (existingOrdelyError) throw normalizeSupabaseError(existingOrdelyError);
  if (positiveError) throw normalizeSupabaseError(positiveError);
  if (advisorError) throw normalizeSupabaseError(advisorError);

  if ((existingOrdelyRows ?? []).length > 0) {
    return 0;
  }

  const totalPositive = (positiveRows ?? []).reduce(
    (sum, row) => sum + Number((row as { months_delta?: number }).months_delta ?? 0),
    0,
  );
  const remainingCap = Math.max(0, 11 - totalPositive);
  const grantable = Math.min(2, remainingCap);
  if (grantable <= 0) {
    return 0;
  }

  const advisor = (advisorRow as {
    billing_interval_current?: BillingInterval | null;
    billing_current_period_end?: string | null;
  } | null);
  const isAnnual = advisor?.billing_interval_current === "annual";
  const periodEndIso = advisor?.billing_current_period_end ?? null;
  const availableFrom =
    isAnnual && periodEndIso && new Date(periodEndIso).getTime() > Date.now()
      ? periodEndIso
      : nowIso;

  const { error: insertError } = await supabase
    .from("advisor_billing_credit_ledger")
    .insert({
      advisor_id: advisorId,
      source: "ordely_promo",
      source_referral_qualification_id: null,
      months_delta: grantable,
      available_from: availableFrom,
      consumed_at: null,
      note: "Ordely cooperation activation bonus",
      metadata: {
        source: "ordely_cooperation",
        granted_at: nowIso,
        delayed_until_period_end: availableFrom !== nowIso,
      },
    });

  if (insertError) {
    const code = (insertError as { code?: string }).code;
    if (code === "23505") {
      return 0;
    }
    throw normalizeSupabaseError(insertError);
  }

  await supabase
    .from("advisors")
    .update({
      platform_branding_opt_in: true,
      platform_branding_reward_months: grantable,
    })
    .eq("id", advisorId);

  return grantable;
}
