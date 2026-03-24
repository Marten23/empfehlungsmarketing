import { getStripeServerConfig, type StripeServerConfig } from "@/lib/stripe/config";
import type { BillingInterval } from "@/lib/billing/domain";

export type TierSnapshot = "founder" | "early" | "standard";
export type LifetimeState = "inactive" | "pending_next_cycle" | "active";

export function resolveRecurringStripePriceId(
  params: {
    tierSnapshot: TierSnapshot;
    billingInterval: BillingInterval;
  },
  config: StripeServerConfig = getStripeServerConfig(),
): string {
  const tierKey =
    params.tierSnapshot === "founder"
      ? "1"
      : params.tierSnapshot === "early"
        ? "2"
        : "3";

  if (params.billingInterval === "monthly") {
    if (tierKey === "1") return config.STRIPE_PRICE_MONTHLY_TIER_1;
    if (tierKey === "2") return config.STRIPE_PRICE_MONTHLY_TIER_2;
    return config.STRIPE_PRICE_MONTHLY_TIER_3;
  }

  if (tierKey === "1") return config.STRIPE_PRICE_ANNUAL_TIER_1;
  if (tierKey === "2") return config.STRIPE_PRICE_ANNUAL_TIER_2;
  return config.STRIPE_PRICE_ANNUAL_TIER_3;
}

export function shouldApplyLifetimeCoupon(
  state: LifetimeState,
  couponId: string | null,
): couponId is string {
  return state === "active" && Boolean(couponId);
}

