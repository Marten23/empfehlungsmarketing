import type { SupabaseClient, User } from "@supabase/supabase-js";
import { normalizeSupabaseError } from "@/lib/supabase/errors";

function cleanText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function buildBaseNameFromUser(user: User) {
  const emailPrefix = (user.email ?? "berater").split("@")[0] ?? "berater";
  const base = emailPrefix.replace(/[._-]+/g, " ").trim();
  return base.length > 0 ? base : "Berater";
}

async function generateUniqueAdvisorSlug(
  supabase: SupabaseClient,
  baseName: string,
  userId: string,
) {
  const base = cleanText(baseName) || "berater";

  for (let i = 0; i < 10; i += 1) {
    const suffix = i === 0 ? "" : `-${userId.slice(0, 6)}-${i}`;
    const candidate = `${base}${suffix}`;
    const { data, error } = await supabase
      .from("advisors")
      .select("id")
      .eq("slug", candidate)
      .limit(1)
      .maybeSingle();

    if (error) throw normalizeSupabaseError(error);
    if (!data) return candidate;
  }

  return `${base}-${userId.slice(0, 8)}`;
}

async function resolveInviterAdvisorId(
  supabase: SupabaseClient,
  inviteCode: string | null,
) {
  if (!inviteCode) return null;

  const unified = await supabase.rpc("get_public_link_context", {
    p_code: inviteCode,
  });

  if (!unified.error) {
    const rows = (unified.data ?? []) as Array<{
      link_type: string;
      advisor_id: string;
    }>;
    const row = rows[0];
    if (!row) return null;
    return row.link_type === "advisor" ? row.advisor_id : null;
  }

  const unifiedCode = (unified.error as { code?: string } | null)?.code;
  if (unifiedCode !== "PGRST202") {
    throw normalizeSupabaseError(unified.error);
  }

  // Fallback for pre-008 schema: treat invite as advisor slug/ref code.
  const legacy = await supabase
    .from("advisors")
    .select("id")
    .eq("is_active", true)
    .or(
      `slug.eq.${inviteCode},advisor_referral_slug.eq.${inviteCode},invite_code.eq.${inviteCode}`,
    )
    .limit(1)
    .maybeSingle();

  if (legacy.error) {
    const code = (legacy.error as { code?: string }).code;
    if (code !== "PGRST204") {
      throw normalizeSupabaseError(legacy.error);
    }

    const slugOnly = await supabase
      .from("advisors")
      .select("id")
      .eq("is_active", true)
      .eq("slug", inviteCode)
      .limit(1)
      .maybeSingle();

    if (slugOnly.error) throw normalizeSupabaseError(slugOnly.error);
    return (slugOnly.data as { id: string } | null)?.id ?? null;
  }

  return (legacy.data as { id: string } | null)?.id ?? null;
}

export async function ensureAdvisorOnboardingForUser(
  supabase: SupabaseClient,
  user: User,
  inviteCodeFromInput?: string | null,
) {
  const inviteCodeFromMetadata =
    typeof user.user_metadata?.pending_advisor_invite === "string"
      ? String(user.user_metadata.pending_advisor_invite)
      : null;
  const inviteCode = (inviteCodeFromInput ?? inviteCodeFromMetadata ?? "").trim();
  const normalizedInviteCode = inviteCode.length > 0 ? inviteCode : null;

  const inviterAdvisorId = await resolveInviterAdvisorId(
    supabase,
    normalizedInviteCode,
  );

  // Profile role preparation
  try {
    await supabase
      .from("profiles")
      .upsert({ user_id: user.id, role: "advisor" }, { onConflict: "user_id" });
  } catch (error) {
    // If role column is not present yet, fallback to minimal upsert.
    await supabase.from("profiles").upsert({ user_id: user.id });
    console.warn("profiles.role update skipped:", normalizeSupabaseError(error).message);
  }

  const existing = await supabase
    .from("advisors")
    .select("id, referred_by_advisor_id")
    .eq("owner_user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (existing.error) throw normalizeSupabaseError(existing.error);

  const existingAdvisor = existing.data as
    | { id: string; referred_by_advisor_id?: string | null }
    | null;

  if (existingAdvisor) {
    if (!existingAdvisor.referred_by_advisor_id && inviterAdvisorId) {
      const { error } = await supabase
        .from("advisors")
        .update({
          referred_by_advisor_id: inviterAdvisorId,
          referral_source: "advisor_invite",
          account_status: "registered",
          account_classification: "live",
          billing_mode: "live",
        })
        .eq("id", existingAdvisor.id);

      if (error) {
        const code = (error as { code?: string }).code;
        if (code !== "PGRST204") throw normalizeSupabaseError(error);
      }
    }
    return existingAdvisor.id;
  }

  const baseName = buildBaseNameFromUser(user);
  const slug = await generateUniqueAdvisorSlug(supabase, baseName, user.id);

  const insertPayload: Record<string, unknown> = {
    owner_user_id: user.id,
    name: baseName,
    slug,
    is_active: true,
    account_status: "registered",
    account_classification: "live",
    billing_mode: "live",
    referred_by_advisor_id: inviterAdvisorId,
    referral_source: inviterAdvisorId ? "advisor_invite" : null,
  };

  const insert = await supabase
    .from("advisors")
    .insert(insertPayload)
    .select("id")
    .single();

  if (insert.error) {
    // Fallback if extended columns not present yet.
    const fallback = await supabase
      .from("advisors")
      .insert({
        owner_user_id: user.id,
        name: baseName,
        slug,
        is_active: true,
      })
      .select("id")
      .single();

    if (fallback.error) throw normalizeSupabaseError(fallback.error);
    return (fallback.data as { id: string }).id;
  }

  // Clear pending invite marker if it came from metadata.
  if (inviteCodeFromMetadata) {
    await supabase.auth.updateUser({
      data: { pending_advisor_invite: null },
    });
  }

  return (insert.data as { id: string }).id;
}
