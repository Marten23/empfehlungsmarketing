"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdvisorContext } from "@/lib/auth/advisor";
import { markAdvisorContractActivated } from "@/lib/queries/advisors";
import { normalizeSupabaseError } from "@/lib/supabase/errors";

export async function markOwnContractActivatedAction() {
  const advisorContext = await getCurrentAdvisorContext();
  if (!advisorContext) return;

  try {
    const supabase = await createClient();
    await markAdvisorContractActivated(supabase, advisorContext.advisorId);
    revalidatePath("/dashboard");
    revalidatePath("/berater/dashboard");
    revalidatePath("/dashboard/advisors");
    revalidatePath("/berater/dashboard/advisors");
  } catch (error) {
    const message = normalizeSupabaseError(error).message;
    console.error("markOwnContractActivatedAction failed:", message);
    redirect(
      `/berater/dashboard/advisors?activated=0&reason=${encodeURIComponent(message)}`,
    );
  }

  redirect("/berater/dashboard/advisors?activated=1");
}

export async function setReferrerActivationModeAction(formData: FormData) {
  const advisorContext = await getCurrentAdvisorContext();
  if (!advisorContext) return;

  const nextValue = String(formData.get("auto_activate_referrers") ?? "").trim();
  const autoActivate = nextValue === "1";

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("advisor_settings").upsert(
      {
        advisor_id: advisorContext.advisorId,
        auto_activate_referrers: autoActivate,
      },
      { onConflict: "advisor_id" },
    );

    if (error) throw error;

    revalidatePath("/dashboard/advisors");
    revalidatePath("/berater/dashboard/advisors");
  } catch (error) {
    const message = normalizeSupabaseError(error).message;
    console.error("setReferrerActivationModeAction failed:", message);
    redirect(
      `/berater/dashboard/advisors?settings=0&reason=${encodeURIComponent(message)}`,
    );
  }

  redirect("/berater/dashboard/advisors?settings=1");
}

export async function setPointsAwardModeAction(formData: FormData) {
  const advisorContext = await getCurrentAdvisorContext();
  if (!advisorContext) return;

  const nextMode = String(formData.get("auto_award_points_on_referral_close") ?? "").trim();
  const autoAward = nextMode === "1";
  const pointsValueRaw = String(formData.get("points_per_successful_referral") ?? "").trim();
  const pointsValue = Number(pointsValueRaw);
  const points = Number.isFinite(pointsValue) && pointsValue > 0 ? pointsValue : 100;

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("advisor_settings").upsert(
      {
        advisor_id: advisorContext.advisorId,
        auto_award_points_on_referral_close: autoAward,
        points_per_successful_referral: points,
      },
      { onConflict: "advisor_id" },
    );

    if (error) throw error;

    revalidatePath("/berater/dashboard");
    revalidatePath("/berater/dashboard/referrals");
    revalidatePath("/berater/dashboard/advisors");
  } catch (error) {
    const message = normalizeSupabaseError(error).message;
    redirect(
      `/berater/dashboard/advisors?points=0&reason=${encodeURIComponent(message)}`,
    );
  }

  redirect("/berater/dashboard/advisors?points=1");
}

export async function setLevelThresholdsAction(formData: FormData) {
  const advisorContext = await getCurrentAdvisorContext();
  if (!advisorContext) return;

  const bronzeRaw = String(formData.get("level_bronze_points") ?? "").trim();
  const silverRaw = String(formData.get("level_silver_points") ?? "").trim();
  const goldRaw = String(formData.get("level_gold_points") ?? "").trim();
  const platinumRaw = String(formData.get("level_platinum_points") ?? "").trim();

  const bronze = Number(bronzeRaw);
  const silver = Number(silverRaw);
  const gold = Number(goldRaw);
  const platinum = Number(platinumRaw);

  if (
    !Number.isFinite(bronze) ||
    !Number.isFinite(silver) ||
    !Number.isFinite(gold) ||
    !Number.isFinite(platinum) ||
    bronze <= 0 ||
    silver <= bronze ||
    gold <= silver ||
    platinum <= gold
  ) {
    redirect("/berater/dashboard/advisors?levels=0&reason=ungueltige-level-werte");
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("advisor_settings").upsert(
      {
        advisor_id: advisorContext.advisorId,
        level_bronze_points: bronze,
        level_silver_points: silver,
        level_gold_points: gold,
        level_platinum_points: platinum,
      },
      { onConflict: "advisor_id" },
    );

    if (error) throw error;

    revalidatePath("/berater/dashboard/advisors");
    revalidatePath("/empfehler/dashboard");
  } catch (error) {
    const message = normalizeSupabaseError(error).message;
    redirect(
      `/berater/dashboard/advisors?levels=0&reason=${encodeURIComponent(message)}`,
    );
  }

  redirect("/berater/dashboard/advisors?levels=1");
}
