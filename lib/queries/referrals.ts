import type { SupabaseClient } from "@supabase/supabase-js";
import type { Referral, ReferralStatus } from "@/lib/types/domain";
import { normalizeSupabaseError } from "@/lib/supabase/errors";

const referralSelect = `
  id,
  advisor_id,
  referrer_id,
  source_referral_code,
  contact_name,
  contact_first_name,
  contact_last_name,
  contact_email,
  contact_phone,
  contact_note,
  message,
  status,
  closed_at,
  created_by_user_id,
  metadata,
  created_at,
  updated_at
`;

export async function listReferralsForAdvisor(
  supabase: SupabaseClient,
  advisorId: string,
  status?: ReferralStatus,
) {
  let query = supabase
    .from("referrals")
    .select(referralSelect)
    .eq("advisor_id", advisorId)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw normalizeSupabaseError(error);
  return (data ?? []) as Referral[];
}

export async function listReferralsForReferrer(
  supabase: SupabaseClient,
  advisorId: string,
  referrerId: string,
) {
  const { data, error } = await supabase
    .from("referrals")
    .select(referralSelect)
    .eq("advisor_id", advisorId)
    .eq("referrer_id", referrerId)
    .order("created_at", { ascending: false });

  if (error) throw normalizeSupabaseError(error);
  return (data ?? []) as Referral[];
}

export async function createReferral(
  supabase: SupabaseClient,
  input: {
    advisor_id: string;
    referrer_id: string;
    status?: ReferralStatus;
    source_referral_code?: string | null;
    contact_name?: string | null;
    contact_first_name?: string | null;
    contact_last_name?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
    contact_note?: string | null;
    message?: string | null;
  },
) {
  const { data, error } = await supabase
    .from("referrals")
    .insert({
      advisor_id: input.advisor_id,
      referrer_id: input.referrer_id,
      status: input.status ?? "neu",
      source_referral_code: input.source_referral_code ?? null,
      contact_name: input.contact_name ?? null,
      contact_first_name: input.contact_first_name ?? null,
      contact_last_name: input.contact_last_name ?? null,
      contact_email: input.contact_email ?? null,
      contact_phone: input.contact_phone ?? null,
      contact_note: input.contact_note ?? null,
      message: input.message ?? null,
    })
    .select(referralSelect)
    .single();

  if (error) throw normalizeSupabaseError(error);
  return data as Referral;
}

export async function updateReferralStatus(
  supabase: SupabaseClient,
  referralId: string,
  status: ReferralStatus,
) {
  const { data, error } = await supabase
    .from("referrals")
    .update({ status })
    .eq("id", referralId)
    .select(referralSelect)
    .single();

  if (error) throw normalizeSupabaseError(error);
  return data as Referral;
}

export type DashboardReferralRow = Referral & {
  referrer: {
    id: string;
    first_name: string;
    last_name: string;
    referral_code: string | null;
    referral_slug: string | null;
  } | null;
  awarded_points: number | null;
};

export async function listDashboardReferrals(
  supabase: SupabaseClient,
  advisorId: string,
) {
  const { data: referralRows, error: referralsError } = await supabase
    .from("referrals")
    .select(referralSelect)
    .eq("advisor_id", advisorId)
    .order("created_at", { ascending: false });

  if (referralsError) throw normalizeSupabaseError(referralsError);

  const referrals = (referralRows ?? []) as Referral[];
  if (referrals.length === 0) return [];

  const referrerIds = Array.from(new Set(referrals.map((row) => row.referrer_id)));
  const { data: referrerRows, error: referrersError } = await supabase
    .from("referrers")
    .select("id, first_name, last_name, referral_code, referral_slug")
    .eq("advisor_id", advisorId)
    .in("id", referrerIds);

  if (referrersError) throw normalizeSupabaseError(referrersError);

  const referrerMap = new Map(
    (referrerRows ?? []).map((r) => [
      r.id as string,
      {
        id: r.id as string,
        first_name: r.first_name as string,
        last_name: r.last_name as string,
        referral_code: (r.referral_code as string | null) ?? null,
        referral_slug: (r.referral_slug as string | null) ?? null,
      },
    ]),
  );

  const referralIds = referrals.map((row) => row.id);
  const { data: pointsRows, error: pointsError } = await supabase
    .from("points_transactions")
    .select("referral_id, points, created_at")
    .eq("advisor_id", advisorId)
    .eq("transaction_type", "earn_referral_close")
    .in("referral_id", referralIds)
    .order("created_at", { ascending: true });

  if (pointsError) throw normalizeSupabaseError(pointsError);

  const awardedMap = new Map<string, number>();
  for (const row of pointsRows ?? []) {
    const referralId = row.referral_id as string | null;
    if (!referralId) continue;
    if (awardedMap.has(referralId)) continue;
    awardedMap.set(referralId, Number(row.points ?? 0));
  }

  return referrals.map((row) => ({
    ...row,
    referrer: referrerMap.get(row.referrer_id) ?? null,
    awarded_points: awardedMap.get(row.id) ?? null,
  }));
}
