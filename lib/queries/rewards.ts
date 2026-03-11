import type { SupabaseClient } from "@supabase/supabase-js";
import type { Reward, RewardRedemption, RedemptionStatus } from "@/lib/types/domain";

const rewardSelect = `
  id,
  advisor_id,
  title,
  name,
  description,
  image_url,
  external_product_url,
  points_cost,
  is_active,
  sort_order,
  created_at,
  updated_at
`;

export async function listActiveRewardsForAdvisor(
  supabase: SupabaseClient,
  advisorId: string,
) {
  const { data, error } = await supabase
    .from("rewards")
    .select(rewardSelect)
    .eq("advisor_id", advisorId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Reward[];
}

const redemptionSelect = `
  id,
  advisor_id,
  referrer_id,
  reward_id,
  requested_points_cost,
  status,
  requested_at,
  processed_at,
  completed_at,
  approved_at,
  fulfilled_at,
  rejected_at,
  processed_by_user_id,
  notes,
  created_at,
  updated_at
`;

export async function createRewardRedemption(
  supabase: SupabaseClient,
  input: {
    advisor_id: string;
    referrer_id: string;
    reward_id: string;
    requested_points_cost: number;
    notes?: string | null;
  },
) {
  const { data, error } = await supabase
    .from("reward_redemptions")
    .insert({
      advisor_id: input.advisor_id,
      referrer_id: input.referrer_id,
      reward_id: input.reward_id,
      requested_points_cost: input.requested_points_cost,
      notes: input.notes ?? null,
      status: "offen",
    })
    .select(redemptionSelect)
    .single();

  if (error) throw error;
  return data as RewardRedemption;
}

export async function updateRewardRedemptionStatus(
  supabase: SupabaseClient,
  redemptionId: string,
  status: RedemptionStatus,
) {
  const { data, error } = await supabase
    .from("reward_redemptions")
    .update({ status })
    .eq("id", redemptionId)
    .select(redemptionSelect)
    .single();

  if (error) throw error;
  return data as RewardRedemption;
}
