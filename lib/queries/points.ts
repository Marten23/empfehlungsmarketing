import type { SupabaseClient } from "@supabase/supabase-js";
import type { PointsTransaction, PointsTransactionType } from "@/lib/types/domain";

const pointsSelect = `
  id,
  advisor_id,
  referrer_id,
  points,
  transaction_type,
  referral_id,
  reward_redemption_id,
  created_by_user_id,
  description,
  metadata,
  created_at
`;

export async function listPointsTransactionsForReferrer(
  supabase: SupabaseClient,
  advisorId: string,
  referrerId: string,
) {
  const { data, error } = await supabase
    .from("points_transactions")
    .select(pointsSelect)
    .eq("advisor_id", advisorId)
    .eq("referrer_id", referrerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PointsTransaction[];
}

export async function getPointsBalanceForReferrer(
  supabase: SupabaseClient,
  advisorId: string,
  referrerId: string,
) {
  const { data, error } = await supabase
    .from("points_transactions")
    .select("points")
    .eq("advisor_id", advisorId)
    .eq("referrer_id", referrerId);

  if (error) throw error;
  return sumAvailablePoints((data ?? []) as Pick<PointsTransaction, "points">[]);
}

export function sumAvailablePoints(
  rows: Array<Pick<PointsTransaction, "points">>,
) {
  return rows.reduce((sum, row) => sum + Number(row.points ?? 0), 0);
}

export function sumLifetimeLevelPoints(
  rows: Array<Pick<PointsTransaction, "points" | "transaction_type">>,
) {
  return rows.reduce((sum, row) => {
    const points = Number(row.points ?? 0);
    if (points <= 0) return sum;
    if (row.transaction_type !== "earn_referral_close") return sum;
    return sum + points;
  }, 0);
}

export async function createPointsTransaction(
  supabase: SupabaseClient,
  input: {
    advisor_id: string;
    referrer_id: string;
    points: number;
    transaction_type: PointsTransactionType;
    referral_id?: string | null;
    reward_redemption_id?: string | null;
    description?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  if (input.points === 0) {
    throw new Error("Points transaction must be non-zero.");
  }

  const { data, error } = await supabase
    .from("points_transactions")
    .insert({
      advisor_id: input.advisor_id,
      referrer_id: input.referrer_id,
      points: input.points,
      transaction_type: input.transaction_type,
      referral_id: input.referral_id ?? null,
      reward_redemption_id: input.reward_redemption_id ?? null,
      description: input.description ?? null,
      metadata: input.metadata ?? {},
    })
    .select(pointsSelect)
    .single();

  if (error) throw error;
  return data as PointsTransaction;
}
