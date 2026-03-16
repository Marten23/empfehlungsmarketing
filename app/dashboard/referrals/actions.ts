"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import type { ReferralStatus } from "@/lib/types/domain";
import { createClient } from "@/lib/supabase/server";
import { updateReferralStatus } from "@/lib/queries/referrals";
import { getCurrentAdvisorContext } from "@/lib/auth/advisor";
import { createPointsTransaction } from "@/lib/queries/points";
import { normalizeSupabaseError } from "@/lib/supabase/errors";

const allowedStatuses: ReferralStatus[] = [
  "neu",
  "kontaktiert",
  "termin",
  "abschluss",
  "abgelehnt",
];

export async function updateReferralStatusAction(formData: FormData) {
  const referralId = String(formData.get("referral_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() as ReferralStatus;

  if (!referralId || !allowedStatuses.includes(status)) {
    return;
  }

  const advisorContext = await getCurrentAdvisorContext();
  if (!advisorContext) {
    return;
  }

  try {
    const supabase = await createClient();
    const { data: existing, error: existingError } = await supabase
      .from("referrals")
      .select("id, advisor_id, status")
      .eq("id", referralId)
      .eq("advisor_id", advisorContext.advisorId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing) {
      redirect("/berater/dashboard/referrals?saved=0&sreason=not-found");
    }

    if (existing.status === "abschluss" && status !== "abschluss") {
      redirect("/berater/dashboard/referrals?saved=0&sreason=locked");
    }

    if (existing.status === status) {
      redirect("/berater/dashboard/referrals?saved=1");
    }

    const updated = await updateReferralStatus(supabase, referralId, status);

    // Guard against cross-tenant updates in case of future policy changes.
    if (updated.advisor_id !== advisorContext.advisorId) {
      redirect("/berater/dashboard/referrals?saved=0&sreason=tenant");
    }
  } catch (error) {
    if (isRedirectError(error)) throw error;

    const message = normalizeSupabaseError(error).message;
    redirect(
      `/berater/dashboard/referrals?saved=0&sreason=${encodeURIComponent(message)}`,
    );
  }

  revalidatePath("/dashboard");
  revalidatePath("/berater/dashboard");
  revalidatePath("/dashboard/referrals");
  revalidatePath("/berater/dashboard/referrals");
  redirect("/berater/dashboard/referrals?saved=1");
}

export async function awardManualReferralPointsAction(formData: FormData) {
  const referralId = String(formData.get("referral_id") ?? "").trim();
  const pointsRaw = String(formData.get("points") ?? "").trim();
  const points = Number(pointsRaw);

  if (!referralId || !Number.isFinite(points) || points <= 0) {
    redirect("/berater/dashboard/referrals?awarded=0&reason=ungueltige-punkte");
  }

  const advisorContext = await getCurrentAdvisorContext();
  if (!advisorContext) {
    redirect("/berater/login");
  }

  try {
    const supabase = await createClient();
    const { data: referral, error: referralError } = await supabase
      .from("referrals")
      .select("id, advisor_id, referrer_id, status")
      .eq("id", referralId)
      .eq("advisor_id", advisorContext.advisorId)
      .maybeSingle();

    if (referralError) throw referralError;
    if (!referral) {
      redirect("/berater/dashboard/referrals?awarded=0&reason=not-found");
    }

    if (referral.status !== "abschluss") {
      redirect("/berater/dashboard/referrals?awarded=0&reason=status");
    }

    await createPointsTransaction(supabase, {
      advisor_id: referral.advisor_id as string,
      referrer_id: referral.referrer_id as string,
      points,
      transaction_type: "earn_referral_close",
      referral_id: referral.id as string,
      description: "Manuelle Punktevergabe für Abschluss",
      metadata: { referral_id: referral.id, mode: "manual" },
    });

    revalidatePath("/berater/dashboard");
    revalidatePath("/berater/dashboard/referrals");
    revalidatePath("/empfehler/dashboard");
    revalidatePath("/empfehler/praemien");
    redirect("/berater/dashboard/referrals?awarded=1");
  } catch (error) {
    if (isRedirectError(error)) throw error;

    const code = (error as { code?: string }).code;
    if (code === "23505") {
      redirect("/berater/dashboard/referrals?awarded=0&reason=already-awarded");
    }

    const message = normalizeSupabaseError(error).message;
    redirect(
      `/berater/dashboard/referrals?awarded=0&reason=${encodeURIComponent(message)}`,
    );
  }
}
