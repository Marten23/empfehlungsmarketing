import "server-only";

type RequiredStripeEnv = {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
  STRIPE_PRICE_MONTHLY_TIER_1: string;
  STRIPE_PRICE_MONTHLY_TIER_2: string;
  STRIPE_PRICE_MONTHLY_TIER_3: string;
  STRIPE_PRICE_MONTHLY_TIER_4: string;
  STRIPE_PRICE_MONTHLY_TIER_5: string;
  STRIPE_PRICE_ANNUAL_TIER_1: string;
  STRIPE_PRICE_ANNUAL_TIER_2: string;
  STRIPE_PRICE_ANNUAL_TIER_3: string;
  STRIPE_PRICE_ANNUAL_TIER_4: string;
  STRIPE_PRICE_ANNUAL_TIER_5: string;
};

export type StripeServerConfig = RequiredStripeEnv & {
  STRIPE_LIFETIME_COUPON_ID: string | null;
  APP_URL: string;
  STRIPE_CHECKOUT_SUCCESS_URL: string;
  STRIPE_CHECKOUT_CANCEL_URL: string;
};

function readRequired(name: keyof RequiredStripeEnv): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required Stripe env: ${name}`);
  }
  return value;
}

function resolveAppUrl(): string {
  const raw =
    process.env.APP_URL?.trim() ??
    process.env.NEXT_PUBLIC_APP_URL?.trim() ??
    "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export function getStripeServerConfig(): StripeServerConfig {
  const appUrl = resolveAppUrl();
  const successUrl =
    process.env.STRIPE_CHECKOUT_SUCCESS_URL?.trim() ||
    `${appUrl}/berater/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl =
    process.env.STRIPE_CHECKOUT_CANCEL_URL?.trim() ||
    `${appUrl}/berater/dashboard?checkout=cancel`;

  return {
    STRIPE_SECRET_KEY: readRequired("STRIPE_SECRET_KEY"),
    STRIPE_WEBHOOK_SECRET: readRequired("STRIPE_WEBHOOK_SECRET"),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: readRequired(
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    ),
    STRIPE_PRICE_MONTHLY_TIER_1: readRequired("STRIPE_PRICE_MONTHLY_TIER_1"),
    STRIPE_PRICE_MONTHLY_TIER_2: readRequired("STRIPE_PRICE_MONTHLY_TIER_2"),
    STRIPE_PRICE_MONTHLY_TIER_3: readRequired("STRIPE_PRICE_MONTHLY_TIER_3"),
    STRIPE_PRICE_MONTHLY_TIER_4: readRequired("STRIPE_PRICE_MONTHLY_TIER_4"),
    STRIPE_PRICE_MONTHLY_TIER_5: readRequired("STRIPE_PRICE_MONTHLY_TIER_5"),
    STRIPE_PRICE_ANNUAL_TIER_1: readRequired("STRIPE_PRICE_ANNUAL_TIER_1"),
    STRIPE_PRICE_ANNUAL_TIER_2: readRequired("STRIPE_PRICE_ANNUAL_TIER_2"),
    STRIPE_PRICE_ANNUAL_TIER_3: readRequired("STRIPE_PRICE_ANNUAL_TIER_3"),
    STRIPE_PRICE_ANNUAL_TIER_4: readRequired("STRIPE_PRICE_ANNUAL_TIER_4"),
    STRIPE_PRICE_ANNUAL_TIER_5: readRequired("STRIPE_PRICE_ANNUAL_TIER_5"),
    STRIPE_LIFETIME_COUPON_ID:
      process.env.STRIPE_LIFETIME_COUPON_ID?.trim() || null,
    APP_URL: appUrl,
    STRIPE_CHECKOUT_SUCCESS_URL: successUrl,
    STRIPE_CHECKOUT_CANCEL_URL: cancelUrl,
  };
}
