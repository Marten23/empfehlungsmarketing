import type { SupabaseClient } from "@supabase/supabase-js";
import type { Reward, RewardRedemption, RedemptionStatus } from "@/lib/types/domain";

const rewardSelect = `
  id,
  advisor_id,
  title,
  name,
  description,
  motivation_text,
  image_url,
  image_source_note,
  image_rights_confirmed,
  image_rights_confirmed_at,
  image_rights_confirmed_by_user_id,
  image_focus_x,
  image_focus_y,
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
    .order("points_cost", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Reward[];
}

export async function listRewardsForAdvisor(
  supabase: SupabaseClient,
  advisorId: string,
) {
  const { data, error } = await supabase
    .from("rewards")
    .select(rewardSelect)
    .eq("advisor_id", advisorId)
    .order("points_cost", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Reward[];
}

export async function upsertAdvisorReward(
  supabase: SupabaseClient,
  input: {
    id?: string;
    advisor_id: string;
    title: string;
    description?: string | null;
    motivation_text?: string | null;
    points_cost: number;
    image_url?: string | null;
    image_source_note?: string | null;
    image_rights_confirmed?: boolean;
    image_rights_confirmed_by_user_id?: string | null;
    image_focus_x?: number;
    image_focus_y?: number;
    external_product_url?: string | null;
    is_active: boolean;
    sort_order?: number;
  },
) {
  const payload = {
    id: input.id,
    advisor_id: input.advisor_id,
    title: input.title,
    name: input.title,
    description: input.description ?? null,
    motivation_text: input.motivation_text ?? null,
    points_cost: input.points_cost,
    image_url: input.image_url ?? null,
    image_source_note: input.image_source_note ?? null,
    image_rights_confirmed: input.image_rights_confirmed ?? false,
    image_rights_confirmed_at: input.image_rights_confirmed ? new Date().toISOString() : null,
    image_rights_confirmed_by_user_id:
      input.image_rights_confirmed && input.image_rights_confirmed_by_user_id
        ? input.image_rights_confirmed_by_user_id
        : null,
    image_focus_x: Number.isFinite(input.image_focus_x) ? input.image_focus_x : 50,
    image_focus_y: Number.isFinite(input.image_focus_y) ? input.image_focus_y : 50,
    external_product_url: input.external_product_url ?? null,
    is_active: input.is_active,
    sort_order: input.sort_order ?? 100,
  };

  const { data, error } = await supabase
    .from("rewards")
    .upsert(payload)
    .select(rewardSelect)
    .single();

  if (error) throw error;
  return data as Reward;
}

export async function deleteAdvisorReward(
  supabase: SupabaseClient,
  advisorId: string,
  rewardId: string,
) {
  const { error } = await supabase
    .from("rewards")
    .delete()
    .eq("id", rewardId)
    .eq("advisor_id", advisorId);

  if (error) throw error;
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

export async function listRewardRedemptionsForReferrer(
  supabase: SupabaseClient,
  advisorId: string,
  referrerId: string,
) {
  const { data, error } = await supabase
    .from("reward_redemptions")
    .select(redemptionSelect)
    .eq("advisor_id", advisorId)
    .eq("referrer_id", referrerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as RewardRedemption[];
}

export type AdvisorRewardRedemptionRow = RewardRedemption & {
  reward: Pick<Reward, "id" | "title" | "name" | "points_cost"> | null;
  referrer: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
  } | null;
};

export async function listRewardRedemptionsForAdvisor(
  supabase: SupabaseClient,
  advisorId: string,
) {
  const { data, error } = await supabase
    .from("reward_redemptions")
    .select(redemptionSelect)
    .eq("advisor_id", advisorId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  const redemptions = (data ?? []) as RewardRedemption[];
  if (redemptions.length === 0) return [] as AdvisorRewardRedemptionRow[];

  const rewardIds = Array.from(new Set(redemptions.map((row) => row.reward_id)));
  const referrerIds = Array.from(
    new Set(redemptions.map((row) => row.referrer_id)),
  );

  const [{ data: rewardRows, error: rewardError }, { data: referrerRows, error: referrerError }] =
    await Promise.all([
      supabase
        .from("rewards")
        .select("id, title, name, points_cost")
        .eq("advisor_id", advisorId)
        .in("id", rewardIds),
      supabase
        .from("referrers")
        .select("id, first_name, last_name, email")
        .eq("advisor_id", advisorId)
        .in("id", referrerIds),
    ]);

  if (rewardError) throw rewardError;
  if (referrerError) throw referrerError;

  const rewardMap = new Map(
    (rewardRows ?? []).map((row) => [
      row.id as string,
      {
        id: row.id as string,
        title: (row.title as string) ?? "",
        name: (row.name as string | null) ?? null,
        points_cost: Number(row.points_cost ?? 0),
      },
    ]),
  );
  const referrerMap = new Map(
    (referrerRows ?? []).map((row) => [
      row.id as string,
      {
        id: row.id as string,
        first_name: (row.first_name as string) ?? "",
        last_name: (row.last_name as string) ?? "",
        email: (row.email as string | null) ?? null,
      },
    ]),
  );

  return redemptions.map((row) => ({
    ...row,
    reward: rewardMap.get(row.reward_id) ?? null,
    referrer: referrerMap.get(row.referrer_id) ?? null,
  }));
}

export async function redeemRewardAtomic(
  supabase: SupabaseClient,
  rewardId: string,
) {
  const { data, error } = await supabase.rpc("redeem_reward_atomic", {
    p_reward_id: rewardId,
  });

  if (error) throw error;
  return data as string | null;
}
