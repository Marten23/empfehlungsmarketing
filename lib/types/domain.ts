export type ReferralStatus =
  | "neu"
  | "kontaktiert"
  | "termin"
  | "abschluss"
  | "abgelehnt";

export type RedemptionStatus =
  | "offen"
  | "bearbeitet"
  | "abgeschlossen"
  | "abgelehnt"
  | "requested"
  | "approved"
  | "fulfilled"
  | "rejected"
  | "cancelled";

export type PointsTransactionType =
  | "earn_referral_close"
  | "spend_reward_redemption"
  | "manual_adjustment"
  | "reversal";

export type Referrer = {
  id: string;
  advisor_id: string;
  user_id: string | null;
  referral_code: string | null;
  referral_slug: string | null;
  invite_code: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Referral = {
  id: string;
  advisor_id: string;
  referrer_id: string;
  source_referral_code: string | null;
  contact_name: string | null;
  contact_first_name: string | null;
  contact_last_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_note: string | null;
  message: string | null;
  status: ReferralStatus;
  closed_at: string | null;
  created_by_user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type Reward = {
  id: string;
  advisor_id: string;
  title: string;
  name: string | null;
  description: string | null;
  image_url: string | null;
  external_product_url: string | null;
  points_cost: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type RewardRedemption = {
  id: string;
  advisor_id: string;
  referrer_id: string;
  reward_id: string;
  requested_points_cost: number;
  status: RedemptionStatus;
  requested_at: string;
  processed_at: string | null;
  completed_at: string | null;
  approved_at: string | null;
  fulfilled_at: string | null;
  rejected_at: string | null;
  processed_by_user_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PointsTransaction = {
  id: string;
  advisor_id: string;
  referrer_id: string;
  points: number;
  transaction_type: PointsTransactionType;
  referral_id: string | null;
  reward_redemption_id: string | null;
  created_by_user_id: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};
