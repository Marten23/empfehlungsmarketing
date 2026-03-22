import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ANNUAL_SETUP_DISCOUNT_CENTS,
  REFERRAL_SETUP_DISCOUNT_CENTS,
  calculatePricingSnapshot,
  resolveAnnualFeeCents,
  resolveMonthlyFeeCents,
  resolveSetupFeeCents,
  resolveTierByPosition,
} from "@/lib/billing/domain";

describe("billing domain pricing", () => {
  it("resolves tiers by qualified live customer position", () => {
    assert.equal(resolveTierByPosition(1), "founder");
    assert.equal(resolveTierByPosition(10), "founder");
    assert.equal(resolveTierByPosition(11), "early");
    assert.equal(resolveTierByPosition(50), "early");
    assert.equal(resolveTierByPosition(51), "standard");
  });

  it("applies annual setup discount of 200 EUR", () => {
    const snapshot = calculatePricingSnapshot({
      tier: "founder",
      billingInterval: "annual",
      hasReferralDiscount: false,
      applyAnnualSetupDiscount: true,
      lifetimeDiscountState: "inactive",
      lifetimeDiscountPercent: 0,
    });

    assert.equal(snapshot.setupPriceSnapshotCents, resolveSetupFeeCents("founder"));
    assert.equal(
      snapshot.finalSetupPriceSnapshotCents,
      resolveSetupFeeCents("founder") - ANNUAL_SETUP_DISCOUNT_CENTS,
    );
  });

  it("combines referral discount and annual setup discount", () => {
    const snapshot = calculatePricingSnapshot({
      tier: "founder",
      billingInterval: "annual",
      hasReferralDiscount: true,
      applyAnnualSetupDiscount: true,
      lifetimeDiscountState: "inactive",
      lifetimeDiscountPercent: 0,
    });

    assert.equal(snapshot.referralDiscountSnapshotCents, REFERRAL_SETUP_DISCOUNT_CENTS);
    assert.equal(snapshot.annualSetupDiscountSnapshotCents, ANNUAL_SETUP_DISCOUNT_CENTS);
    assert.equal(snapshot.finalSetupPriceSnapshotCents, 19_900);
  });

  it("never lets setup fee become negative", () => {
    const snapshot = calculatePricingSnapshot({
      tier: "founder",
      billingInterval: "annual",
      hasReferralDiscount: true,
      applyAnnualSetupDiscount: true,
      lifetimeDiscountState: "active",
      lifetimeDiscountPercent: 100,
    });

    assert.equal(snapshot.finalSetupPriceSnapshotCents >= 0, true);
  });

  it("computes annual snapshot from monthly snapshot", () => {
    const monthly = resolveMonthlyFeeCents("early");
    assert.equal(monthly, 5_999);
    assert.equal(resolveAnnualFeeCents(monthly), 71_988);
  });

  it("applies active lifetime discount on annual recurring price", () => {
    const snapshot = calculatePricingSnapshot({
      tier: "standard",
      billingInterval: "annual",
      hasReferralDiscount: false,
      applyAnnualSetupDiscount: false,
      lifetimeDiscountState: "active",
      lifetimeDiscountPercent: 50,
    });

    assert.equal(snapshot.annualPriceSnapshotCents, 95_988);
    assert.equal(snapshot.finalRecurringPriceSnapshotCents, 47_994);
  });

  it("does not apply pending lifetime discount yet", () => {
    const snapshot = calculatePricingSnapshot({
      tier: "standard",
      billingInterval: "annual",
      hasReferralDiscount: false,
      applyAnnualSetupDiscount: false,
      lifetimeDiscountState: "pending_next_cycle",
      lifetimeDiscountPercent: 50,
    });

    assert.equal(snapshot.finalRecurringPriceSnapshotCents, snapshot.annualPriceSnapshotCents);
  });
});

