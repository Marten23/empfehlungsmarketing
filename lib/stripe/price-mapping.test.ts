import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveRecurringStripePriceId,
  shouldApplyLifetimeCoupon,
} from "@/lib/stripe/price-mapping";

const TEST_ENV = {
  STRIPE_SECRET_KEY: "sk_test_x",
  STRIPE_WEBHOOK_SECRET: "whsec_x",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_x",
  STRIPE_PRICE_MONTHLY_TIER_1: "price_monthly_1",
  STRIPE_PRICE_MONTHLY_TIER_2: "price_monthly_2",
  STRIPE_PRICE_MONTHLY_TIER_3: "price_monthly_3",
  STRIPE_PRICE_MONTHLY_TIER_4: "price_monthly_4",
  STRIPE_PRICE_MONTHLY_TIER_5: "price_monthly_5",
  STRIPE_PRICE_ANNUAL_TIER_1: "price_annual_1",
  STRIPE_PRICE_ANNUAL_TIER_2: "price_annual_2",
  STRIPE_PRICE_ANNUAL_TIER_3: "price_annual_3",
  STRIPE_PRICE_ANNUAL_TIER_4: "price_annual_4",
  STRIPE_PRICE_ANNUAL_TIER_5: "price_annual_5",
  STRIPE_LIFETIME_COUPON_ID: "coupon_lifetime",
  APP_URL: "http://localhost:3000",
  STRIPE_CHECKOUT_SUCCESS_URL: "http://localhost:3000/success",
  STRIPE_CHECKOUT_CANCEL_URL: "http://localhost:3000/cancel",
};

describe("stripe recurring price mapping", () => {
  it("maps monthly founder to tier 1 env price", () => {
    const price = resolveRecurringStripePriceId(
      { tierSnapshot: "founder", billingInterval: "monthly" },
      TEST_ENV,
    );
    assert.equal(price, "price_monthly_1");
  });

  it("maps annual standard to tier 3 env price", () => {
    const price = resolveRecurringStripePriceId(
      { tierSnapshot: "standard", billingInterval: "annual" },
      TEST_ENV,
    );
    assert.equal(price, "price_annual_3");
  });

  it("maps monthly scale to tier 4 env price", () => {
    const price = resolveRecurringStripePriceId(
      { tierSnapshot: "scale", billingInterval: "monthly" },
      TEST_ENV,
    );
    assert.equal(price, "price_monthly_4");
  });

  it("maps annual market to tier 5 env price", () => {
    const price = resolveRecurringStripePriceId(
      { tierSnapshot: "market", billingInterval: "annual" },
      TEST_ENV,
    );
    assert.equal(price, "price_annual_5");
  });
});

describe("lifetime coupon usage", () => {
  it("applies only for active state", () => {
    assert.equal(shouldApplyLifetimeCoupon("active", "coupon_lifetime"), true);
    assert.equal(
      shouldApplyLifetimeCoupon("pending_next_cycle", "coupon_lifetime"),
      false,
    );
    assert.equal(shouldApplyLifetimeCoupon("inactive", "coupon_lifetime"), false);
  });
});
