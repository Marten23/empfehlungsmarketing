export type BillingInterval = "monthly" | "annual";
export type PricingTier =
  | "founder"
  | "early"
  | "standard"
  | "scale"
  | "market";
export type LifetimeDiscountState = "inactive" | "pending_next_cycle" | "active";

export const ANNUAL_SETUP_DISCOUNT_CENTS = 20_000;
export const REFERRAL_SETUP_DISCOUNT_CENTS = 10_000;

export function resolveTierByPosition(position: number): PricingTier {
  if (position <= 10) return "founder";
  if (position <= 50) return "early";
  if (position <= 150) return "standard";
  if (position <= 500) return "scale";
  return "market";
}

export function resolveSetupFeeCents(tier: PricingTier): number {
  if (tier === "founder") return 49_900;
  if (tier === "early") return 59_900;
  if (tier === "standard") return 79_900;
  if (tier === "scale") return 99_900;
  return 149_900;
}

export function resolveMonthlyFeeCents(tier: PricingTier): number {
  if (tier === "founder") return 4_999;
  if (tier === "early") return 5_999;
  if (tier === "standard") return 7_999;
  if (tier === "scale") return 9_999;
  return 14_999;
}

export function resolveAnnualFeeCents(tier: PricingTier): number {
  if (tier === "founder") return 59_988;
  if (tier === "early") return 71_988;
  if (tier === "standard") return 95_988;
  if (tier === "scale") return 119_988;
  return 179_988;
}

export type PricingCalculationInput = {
  tier: PricingTier;
  billingInterval: BillingInterval;
  hasReferralDiscount: boolean;
  applyAnnualSetupDiscount: boolean;
  lifetimeDiscountState: LifetimeDiscountState;
  lifetimeDiscountPercent: number;
};

export type PricingCalculationResult = {
  setupPriceSnapshotCents: number;
  monthlyPriceSnapshotCents: number;
  annualPriceSnapshotCents: number;
  referralDiscountSnapshotCents: number;
  annualSetupDiscountSnapshotCents: number;
  finalSetupPriceSnapshotCents: number;
  finalRecurringPriceSnapshotCents: number;
};

export function calculatePricingSnapshot(
  input: PricingCalculationInput,
): PricingCalculationResult {
  const setupPriceSnapshotCents = resolveSetupFeeCents(input.tier);
  const monthlyPriceSnapshotCents = resolveMonthlyFeeCents(input.tier);
  const annualPriceSnapshotCents = resolveAnnualFeeCents(input.tier);

  const referralDiscountSnapshotCents = input.hasReferralDiscount
    ? REFERRAL_SETUP_DISCOUNT_CENTS
    : 0;
  const annualSetupDiscountSnapshotCents = input.applyAnnualSetupDiscount
    ? ANNUAL_SETUP_DISCOUNT_CENTS
    : 0;

  const finalSetupPriceSnapshotCents = Math.max(
    0,
    setupPriceSnapshotCents -
      referralDiscountSnapshotCents -
      annualSetupDiscountSnapshotCents,
  );

  const baseRecurring =
    input.billingInterval === "annual"
      ? annualPriceSnapshotCents
      : monthlyPriceSnapshotCents;

  const lifetimeIsActive =
    input.lifetimeDiscountState === "active" && input.lifetimeDiscountPercent > 0;

  const finalRecurringPriceSnapshotCents = lifetimeIsActive
    ? Math.floor(baseRecurring * ((100 - input.lifetimeDiscountPercent) / 100))
    : baseRecurring;

  return {
    setupPriceSnapshotCents,
    monthlyPriceSnapshotCents,
    annualPriceSnapshotCents,
    referralDiscountSnapshotCents,
    annualSetupDiscountSnapshotCents,
    finalSetupPriceSnapshotCents,
    finalRecurringPriceSnapshotCents,
  };
}
