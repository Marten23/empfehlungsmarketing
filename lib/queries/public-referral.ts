import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeSupabaseError } from "@/lib/supabase/errors";

export type PublicReferrerLinkContext = {
  link_type: "referrer";
  advisor_id: string;
  advisor_name: string;
  advisor_slug: string;
  advisor_invite_code: string | null;
  referrer_id: string;
  referrer_first_name: string;
  referrer_last_name: string;
};

export type PublicAdvisorLinkContext = {
  link_type: "advisor";
  advisor_id: string;
  advisor_name: string;
  advisor_slug: string;
  advisor_invite_code: string | null;
  referrer_id: null;
  referrer_first_name: null;
  referrer_last_name: null;
};

export type PublicLinkContext =
  | PublicReferrerLinkContext
  | PublicAdvisorLinkContext;

export async function getPublicLinkContext(
  supabase: SupabaseClient,
  code: string,
) {
  const unified = await supabase.rpc("get_public_link_context", {
    p_code: code,
  });

  if (!unified.error) {
    const rows = (unified.data ?? []) as PublicLinkContext[];
    return rows[0] ?? null;
  }

  // Backward-compatible fallback if migration 008 is not executed yet.
  const errCode = (unified.error as { code?: string } | null)?.code;
  if (errCode !== "PGRST202") {
    throw normalizeSupabaseError(unified.error);
  }

  const legacy = await supabase.rpc("get_public_referral_context", {
    p_code: code,
  });
  if (legacy.error) throw normalizeSupabaseError(legacy.error);

  const legacyRows = (legacy.data ?? []) as Array<{
    advisor_id: string;
    advisor_name: string;
    advisor_slug: string;
    referrer_id: string;
    referrer_first_name: string;
    referrer_last_name: string;
  }>;

  const first = legacyRows[0];
  if (!first) return null;

  return {
    link_type: "referrer",
    advisor_id: first.advisor_id,
    advisor_name: first.advisor_name,
    advisor_slug: first.advisor_slug,
    advisor_invite_code: null,
    referrer_id: first.referrer_id,
    referrer_first_name: first.referrer_first_name,
    referrer_last_name: first.referrer_last_name,
  } as PublicReferrerLinkContext;
}

export async function submitPublicReferralRpc(
  supabase: SupabaseClient,
  input: {
    code: string;
    contact_name?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
    contact_note?: string | null;
  },
) {
  const { data, error } = await supabase.rpc("submit_public_referral", {
    p_code: input.code,
    p_contact_name: input.contact_name ?? null,
    p_contact_email: input.contact_email ?? null,
    p_contact_phone: input.contact_phone ?? null,
    p_contact_note: input.contact_note ?? null,
  });

  if (error) throw normalizeSupabaseError(error);
  return data as string | null;
}
