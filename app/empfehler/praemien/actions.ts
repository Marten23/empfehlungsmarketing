"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { redeemRewardAtomic } from "@/lib/queries/rewards";
import { normalizeSupabaseError } from "@/lib/supabase/errors";

export async function redeemRewardAction(formData: FormData) {
  const rewardId = String(formData.get("reward_id") ?? "").trim();
  if (!rewardId) {
    redirect("/empfehler/praemien?redeemed=0&reason=ungueltige-praemie");
  }

  let redirectUrl = "/empfehler/praemien?redeemed=1";

  try {
    const supabase = await createClient();
    await redeemRewardAtomic(supabase, rewardId);
    revalidatePath("/empfehler/dashboard");
    revalidatePath("/empfehler/praemien");
  } catch (error) {
    const message = normalizeSupabaseError(error).message;
    redirectUrl = `/empfehler/praemien?redeemed=0&reason=${encodeURIComponent(message)}`;
  }

  redirect(redirectUrl);
}
