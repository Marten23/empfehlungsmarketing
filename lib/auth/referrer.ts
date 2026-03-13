import type { SupabaseClient, User } from "@supabase/supabase-js";
import { normalizeSupabaseError } from "@/lib/supabase/errors";

export type ReferrerContext = {
  referrerId: string;
  advisorId: string;
  advisorName: string;
  advisorSlug: string;
  firstName: string;
  lastName: string;
  referralCode: string | null;
  referralSlug: string | null;
  inviteCode: string | null;
  isActive: boolean;
};

type EnsureReferrerOnboardingOptions = {
  inviteCodeFromInput?: string | null;
  fullNameFromInput?: string | null;
  phoneFromInput?: string | null;
};

function splitName(fullName: string) {
  const trimmed = fullName.trim();
  const firstName = trimmed.split(/\s+/)[0] ?? "";
  const rest = trimmed.slice(firstName.length).trim();
  return {
    firstName: firstName || "Empfehler",
    lastName: rest || "-",
  };
}

export async function getCurrentReferrerContext(
  supabase: SupabaseClient,
): Promise<ReferrerContext | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("referrers")
    .select(
      "id, advisor_id, first_name, last_name, referral_code, referral_slug, invite_code, is_active, advisor:advisors!inner(id, name, slug, is_active)",
    )
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) throw normalizeSupabaseError(error);
  if (!data) return null;

  const advisorValue = (data as { advisor?: unknown }).advisor;
  const advisor = Array.isArray(advisorValue)
    ? (advisorValue[0] as { id: string; name: string; slug: string; is_active: boolean } | undefined)
    : (advisorValue as { id: string; name: string; slug: string; is_active: boolean } | undefined);

  if (!advisor || !advisor.is_active) return null;

  return {
    referrerId: data.id as string,
    advisorId: data.advisor_id as string,
    advisorName: advisor.name,
    advisorSlug: advisor.slug,
    firstName: data.first_name as string,
    lastName: data.last_name as string,
    referralCode: (data.referral_code as string | null) ?? null,
    referralSlug: (data.referral_slug as string | null) ?? null,
    inviteCode: (data.invite_code as string | null) ?? null,
    isActive: Boolean(data.is_active),
  };
}

export async function ensureReferrerOnboardingForUser(
  supabase: SupabaseClient,
  user: User,
  options?: EnsureReferrerOnboardingOptions,
) {
  const inviteFromMetadata =
    typeof user.user_metadata?.pending_referrer_invite === "string"
      ? String(user.user_metadata.pending_referrer_invite)
      : null;

  const inviteCode = (
    options?.inviteCodeFromInput ??
    inviteFromMetadata ??
    ""
  ).trim();

  if (!inviteCode) {
    return null;
  }

  const fullNameRaw =
    options?.fullNameFromInput?.trim() ||
    (typeof user.user_metadata?.full_name === "string"
      ? String(user.user_metadata.full_name).trim()
      : "") ||
    (user.email?.split("@")[0] ?? "Empfehler");

  const phoneRaw =
    options?.phoneFromInput?.trim() ||
    (typeof user.user_metadata?.phone === "string"
      ? String(user.user_metadata.phone).trim()
      : "") ||
    null;

  const { firstName, lastName } = splitName(fullNameRaw);
  const email = (user.email ?? "").trim().toLowerCase();
  if (!email) {
    throw new Error("E-Mail fuer Referrer-Onboarding fehlt.");
  }

  const { data: referrerId, error } = await supabase.rpc(
    "complete_referrer_signup_from_invite",
    {
      p_code: inviteCode,
      p_user_id: user.id,
      p_email: email,
      p_full_name: `${firstName} ${lastName}`.trim(),
      p_phone: phoneRaw,
    },
  );

  if (error) throw normalizeSupabaseError(error);

  await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      role: "referrer",
      full_name: `${firstName} ${lastName}`.trim(),
      phone: phoneRaw,
    },
    { onConflict: "user_id" },
  );

  if (inviteFromMetadata) {
    await supabase.auth.updateUser({
      data: { pending_referrer_invite: null },
    });
  }

  return (referrerId as string | null) ?? null;
}
