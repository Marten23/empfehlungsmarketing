"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdvisorContext } from "@/lib/auth/advisor";
import { normalizeSupabaseError } from "@/lib/supabase/errors";

export async function approveReferrerAction(formData: FormData) {
  const referrerId = String(formData.get("referrer_id") ?? "").trim();
  if (!referrerId) return;

  const advisorContext = await getCurrentAdvisorContext();
  if (!advisorContext) return;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("referrers")
      .update({ is_active: true })
      .eq("id", referrerId)
      .eq("advisor_id", advisorContext.advisorId)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      redirect("/berater/dashboard/referrers?approved=0");
    }

    revalidatePath("/dashboard");
    revalidatePath("/berater/dashboard");
    revalidatePath("/dashboard/referrers");
    revalidatePath("/berater/dashboard/referrers");
  } catch (error) {
    const message = normalizeSupabaseError(error).message;
    redirect(
      `/berater/dashboard/referrers?approved=0&reason=${encodeURIComponent(message)}`,
    );
  }

  redirect("/berater/dashboard/referrers?approved=1");
}
