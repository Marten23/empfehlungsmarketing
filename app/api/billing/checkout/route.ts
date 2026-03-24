import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAdvisorContext } from "@/lib/auth/advisor";
import {
  createPricingReservation,
  setAdvisorAccountStatus,
} from "@/lib/queries/billing";
import { getStripeServerClient } from "@/lib/stripe/client";
import { getStripeServerConfig } from "@/lib/stripe/config";
import {
  resolveRecurringStripePriceId,
  shouldApplyLifetimeCoupon,
  type TierSnapshot,
} from "@/lib/stripe/price-mapping";

type CheckoutPayload = {
  billingInterval?: "monthly" | "annual";
  checkoutReference?: string;
};

function buildSetupLineItem(
  amountCents: number,
  reservationId: string,
): Stripe.Checkout.SessionCreateParams.LineItem {
  return {
    quantity: 1,
    price_data: {
      currency: "eur",
      product_data: {
        name: "Rewaro Einrichtungsgebühr",
        description: `Dynamisch berechnet aus Pricing-Snapshot (${reservationId})`,
      },
      unit_amount: amountCents,
    },
  };
}

function resolveStripeSecretMode(secretKey: string): "live" | "test" {
  if (secretKey.startsWith("sk_live_")) return "live";
  return "test";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as CheckoutPayload;
    const billingInterval = body.billingInterval === "annual" ? "annual" : "monthly";
    const checkoutReference = body.checkoutReference?.trim() || null;

    const supabase = await createClient();
    const advisorContext = await getCurrentAdvisorContext();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!advisorContext || !user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert oder kein Berater-Kontext." },
        { status: 401 },
      );
    }

    const admin = createAdminClient();

    const reservation = await createPricingReservation(admin, {
      advisorId: advisorContext.advisorId,
      billingInterval,
      checkoutReference,
      ttlMinutes: 30,
    });

    const config = getStripeServerConfig();
    const checkoutMode = resolveStripeSecretMode(config.STRIPE_SECRET_KEY);

    await setAdvisorAccountStatus(admin, {
      advisorId: advisorContext.advisorId,
      newStatus: "checkout_reserved",
      billingInterval: billingInterval,
      mode: checkoutMode,
    });

    const stripe = getStripeServerClient();

    const recurringPriceId = resolveRecurringStripePriceId({
      tierSnapshot: reservation.tier_snapshot as TierSnapshot,
      billingInterval: reservation.billing_interval_snapshot,
    });

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    if (reservation.final_setup_price_snapshot_cents > 0) {
      lineItems.push(
        buildSetupLineItem(
          reservation.final_setup_price_snapshot_cents,
          reservation.id,
        ),
      );
    }
    lineItems.push({
      price: recurringPriceId,
      quantity: 1,
    });

    const metadata: Record<string, string> = {
      advisor_id: advisorContext.advisorId,
      user_id: user.id,
      pricing_reservation_id: reservation.id,
      tier_snapshot: reservation.tier_snapshot,
      billing_interval_snapshot: reservation.billing_interval_snapshot,
      setup_price_snapshot_cents: String(reservation.setup_price_snapshot_cents),
      monthly_price_snapshot_cents: String(
        reservation.monthly_price_snapshot_cents,
      ),
      annual_price_snapshot_cents: String(
        reservation.annual_price_snapshot_cents,
      ),
      referral_discount_snapshot_cents: String(
        reservation.referral_discount_snapshot_cents,
      ),
      annual_setup_discount_snapshot_cents: String(
        reservation.annual_setup_discount_snapshot_cents,
      ),
      lifetime_discount_state_snapshot:
        reservation.lifetime_discount_state_snapshot,
      lifetime_discount_percent_snapshot: String(
        reservation.lifetime_discount_percent_snapshot,
      ),
      mode: checkoutMode,
    };

    const discounts = shouldApplyLifetimeCoupon(
      reservation.lifetime_discount_state_snapshot,
      config.STRIPE_LIFETIME_COUPON_ID,
    )
      ? [{ coupon: config.STRIPE_LIFETIME_COUPON_ID }]
      : undefined;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      success_url: config.STRIPE_CHECKOUT_SUCCESS_URL,
      cancel_url: config.STRIPE_CHECKOUT_CANCEL_URL,
      line_items: lineItems,
      client_reference_id: advisorContext.advisorId,
      allow_promotion_codes: false,
      discounts,
      metadata,
      subscription_data: {
        metadata,
      },
    });

    return NextResponse.json(
      {
        id: session.id,
        url: session.url,
        pricingReservationId: reservation.id,
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Checkout konnte nicht erstellt werden.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
