import type { SupabaseClient } from "@supabase/supabase-js";
import type { Referrer } from "@/lib/types/domain";

const referrerSelect = `
  id,
  advisor_id,
  user_id,
  referral_code,
  referral_slug,
  invite_code,
  first_name,
  last_name,
  email,
  phone,
  is_active,
  notes,
  created_at,
  updated_at
`;

export async function listReferrersForAdvisor(
  supabase: SupabaseClient,
  advisorId: string,
) {
  const { data, error } = await supabase
    .from("referrers")
    .select(referrerSelect)
    .eq("advisor_id", advisorId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Referrer[];
}

export async function findReferrerByCodeOrSlug(
  supabase: SupabaseClient,
  advisorId: string,
  codeOrSlug: string,
) {
  const { data, error } = await supabase
    .from("referrers")
    .select(referrerSelect)
    .eq("advisor_id", advisorId)
    .or(`referral_code.eq.${codeOrSlug},referral_slug.eq.${codeOrSlug}`)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as Referrer | null;
}

export type PublicReferrerLookup = Referrer & {
  advisor: {
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
  } | null;
};

const publicReferrerSelect = `
  id,
  advisor_id,
  user_id,
  referral_code,
  referral_slug,
  invite_code,
  first_name,
  last_name,
  email,
  phone,
  is_active,
  notes,
  created_at,
  updated_at,
  advisor:advisors (
    id,
    name,
    slug,
    is_active
  )
`;

export async function findPublicReferrerByCodeOrSlug(
  supabase: SupabaseClient,
  codeOrSlug: string,
) {
  const { data, error } = await supabase
    .from("referrers")
    .select(publicReferrerSelect)
    .eq("is_active", true)
    .or(`referral_code.eq.${codeOrSlug},referral_slug.eq.${codeOrSlug}`)
    .limit(2);

  if (error) throw error;

  const rows = (data ?? []).map((row) => {
    const advisorValue = (row as { advisor?: unknown }).advisor;
    const advisor = Array.isArray(advisorValue)
      ? (advisorValue[0] as PublicReferrerLookup["advisor"] | undefined) ?? null
      : (advisorValue as PublicReferrerLookup["advisor"] | null | undefined) ??
        null;

    return {
      ...(row as Omit<PublicReferrerLookup, "advisor">),
      advisor,
    } as PublicReferrerLookup;
  });
  if (rows.length === 0) return null;
  if (rows.length > 1) {
    throw new Error(
      "Referral code is not unique. Please ensure referral_code/referral_slug are globally unique.",
    );
  }

  return rows[0];
}
