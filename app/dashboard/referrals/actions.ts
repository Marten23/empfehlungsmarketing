"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ReferralStatus } from "@/lib/types/domain";
import { createClient } from "@/lib/supabase/server";
import { updateReferralStatus } from "@/lib/queries/referrals";
import { getCurrentAdvisorContext } from "@/lib/auth/advisor";

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
    const updated = await updateReferralStatus(supabase, referralId, status);

    // Guard against cross-tenant updates in case of future policy changes.
    if (updated.advisor_id !== advisorContext.advisorId) {
      return;
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/referrals");
    redirect("/dashboard/referrals");
  } catch (error) {
    console.error("updateReferralStatusAction failed:", error);
  }
}
