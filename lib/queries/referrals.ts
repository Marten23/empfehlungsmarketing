import type { SupabaseClient } from "@supabase/supabase-js";
import type { Referral, ReferralStatus } from "@/lib/types/domain";

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
  if (error) throw error;
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

  if (error) throw error;
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

  if (error) throw error;
  return data as Referral;
}
