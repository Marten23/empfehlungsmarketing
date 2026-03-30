import { getStripeServerConfig, type StripeServerConfig } from "@/lib/stripe/config";
import type { BillingInterval } from "@/lib/billing/domain";

export type TierSnapshot =
  | "founder"
  | "early"
  | "standard"
  | "scale"
  | "market";
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
        : params.tierSnapshot === "standard"
          ? "3"
          : params.tierSnapshot === "scale"
            ? "4"
            : "5";

  if (params.billingInterval === "monthly") {
    if (tierKey === "1") return config.STRIPE_PRICE_MONTHLY_TIER_1;
    if (tierKey === "2") return config.STRIPE_PRICE_MONTHLY_TIER_2;
    if (tierKey === "3") return config.STRIPE_PRICE_MONTHLY_TIER_3;
    if (tierKey === "4") return config.STRIPE_PRICE_MONTHLY_TIER_4;
    return config.STRIPE_PRICE_MONTHLY_TIER_5;
  }

  if (tierKey === "1") return config.STRIPE_PRICE_ANNUAL_TIER_1;
  if (tierKey === "2") return config.STRIPE_PRICE_ANNUAL_TIER_2;
  if (tierKey === "3") return config.STRIPE_PRICE_ANNUAL_TIER_3;
  if (tierKey === "4") return config.STRIPE_PRICE_ANNUAL_TIER_4;
  return config.STRIPE_PRICE_ANNUAL_TIER_5;
}

export function shouldApplyLifetimeCoupon(
  state: LifetimeState,
  couponId: string | null,
): couponId is string {
  return state === "active" && Boolean(couponId);
}
