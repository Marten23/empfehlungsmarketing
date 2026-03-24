import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeServerClient } from "@/lib/stripe/client";
import { getStripeServerConfig } from "@/lib/stripe/config";

type AdvisorLookup = {
  id: string;
};

function mapStripeLivemodeToBillingMode(
  livemode: boolean | null | undefined,
): "live" | "test" {
  return livemode ? "live" : "test";
}

function toIso(unixSeconds?: number | null): string | null {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000).toISOString();
}

function intervalFromStripe(
  interval?: Stripe.Price.Recurring.Interval | null,
): "monthly" | "annual" | null {
  if (interval === "month") return "monthly";
  if (interval === "year") return "annual";
  return null;
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const raw =
    (invoice as unknown as { subscription?: string | { id?: string } | null })
      .subscription ?? null;
  if (!raw) return null;
  if (typeof raw === "string") return raw;
  return raw.id ?? null;
}

function getInvoiceLineInterval(invoice: Stripe.Invoice): "monthly" | "annual" | null {
  const firstLine = invoice.lines.data[0] as unknown as {
    price?: { recurring?: { interval?: Stripe.Price.Recurring.Interval | null } | null } | null;
  };
  return intervalFromStripe(firstLine?.price?.recurring?.interval ?? null);
}

function getSubscriptionPeriod(subscription: Stripe.Subscription): {
  start: string | null;
  end: string | null;
} {
  const s = subscription as unknown as {
    current_period_start?: number | null;
    current_period_end?: number | null;
  };
  return {
    start: toIso(s.current_period_start ?? null),
    end: toIso(s.current_period_end ?? null),
  };
}

async function resolveAdvisorForStripeEvent(params: {
  advisorIdFromMetadata?: string | null;
  customerId?: string | null;
  subscriptionId?: string | null;
}): Promise<AdvisorLookup | null> {
  const admin = createAdminClient();

  if (params.advisorIdFromMetadata) {
    const { data } = await admin
      .from("advisors")
      .select("id")
      .eq("id", params.advisorIdFromMetadata)
      .maybeSingle();
    if (data) return data as AdvisorLookup;
  }

  if (params.customerId) {
    const { data } = await admin
      .from("advisors")
      .select("id")
      .eq("stripe_customer_id", params.customerId)
      .maybeSingle();
    if (data) return data as AdvisorLookup;
  }

  if (params.subscriptionId) {
    const { data } = await admin
      .from("advisors")
      .select("id")
      .eq("stripe_subscription_id", params.subscriptionId)
      .maybeSingle();
    if (data) return data as AdvisorLookup;
  }

  return null;
}

async function updateAdvisorStripeIds(params: {
  advisorId: string;
  customerId?: string | null;
  subscriptionId?: string | null;
  checkoutSessionId?: string | null;
}) {
  const admin = createAdminClient();
  const patch: Record<string, string> = {};
  if (params.customerId) patch.stripe_customer_id = params.customerId;
  if (params.subscriptionId) patch.stripe_subscription_id = params.subscriptionId;
  if (params.checkoutSessionId) {
    patch.stripe_checkout_session_id = params.checkoutSessionId;
  }

  if (Object.keys(patch).length === 0) return;

  await admin.from("advisors").update(patch).eq("id", params.advisorId);
}

async function setAdvisorStatus(params: {
  advisorId: string;
  status:
    | "registered"
    | "checkout_reserved"
    | "setup_pending"
    | "setup_paid"
    | "active_paid"
    | "canceled"
    | "delinquent"
    | "test_only";
  billingInterval?: "monthly" | "annual" | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  mode?: "live" | "test" | null;
}) {
  const admin = createAdminClient();
  await admin.rpc("set_advisor_account_status", {
    p_advisor_id: params.advisorId,
    p_new_status: params.status,
    p_billing_interval: params.billingInterval ?? null,
    p_period_start: params.periodStart ?? null,
    p_period_end: params.periodEnd ?? null,
    p_mode: params.mode ?? null,
  });
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const reservationId = session.metadata?.pricing_reservation_id ?? null;
  const advisorId = session.metadata?.advisor_id ?? null;
  const intervalFromMetadata = session.metadata?.billing_interval_snapshot;

  if (!advisorId) return;

  await updateAdvisorStripeIds({
    advisorId,
    customerId:
      typeof session.customer === "string" ? session.customer : session.customer?.id,
    subscriptionId:
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id,
    checkoutSessionId: session.id,
  });

  if (reservationId) {
    const admin = createAdminClient();
    await admin.rpc("finalize_pricing_reservation", {
      p_reservation_id: reservationId,
    });
  }

  await setAdvisorStatus({
    advisorId,
    status: "setup_paid",
    billingInterval:
      intervalFromMetadata === "annual" ? "annual" : "monthly",
    mode: mapStripeLivemodeToBillingMode(session.livemode),
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  const advisor = await resolveAdvisorForStripeEvent({
    advisorIdFromMetadata: invoice.lines.data[0]?.metadata?.advisor_id ?? null,
    customerId,
    subscriptionId,
  });
  if (!advisor) return;

  const firstLine = invoice.lines.data[0];
  const interval = getInvoiceLineInterval(invoice);

  await updateAdvisorStripeIds({
    advisorId: advisor.id,
    customerId,
    subscriptionId,
  });

  await setAdvisorStatus({
    advisorId: advisor.id,
    status: "active_paid",
    billingInterval: interval,
    periodStart: toIso(firstLine?.period?.start),
    periodEnd: toIso(firstLine?.period?.end),
    mode: mapStripeLivemodeToBillingMode(invoice.livemode),
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  const subscriptionId = getInvoiceSubscriptionId(invoice);

  const advisor = await resolveAdvisorForStripeEvent({
    advisorIdFromMetadata: invoice.lines.data[0]?.metadata?.advisor_id ?? null,
    customerId,
    subscriptionId,
  });
  if (!advisor) return;

  await updateAdvisorStripeIds({
    advisorId: advisor.id,
    customerId,
    subscriptionId,
  });

  await setAdvisorStatus({
    advisorId: advisor.id,
    status: "delinquent",
    mode: mapStripeLivemodeToBillingMode(invoice.livemode),
  });
}

async function handleSubscriptionChanged(
  subscription: Stripe.Subscription,
  deleted = false,
): Promise<void> {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;
  const advisor = await resolveAdvisorForStripeEvent({
    advisorIdFromMetadata: subscription.metadata?.advisor_id ?? null,
    customerId,
    subscriptionId: subscription.id,
  });

  if (!advisor) return;

  const recurringInterval = intervalFromStripe(
    subscription.items.data[0]?.price?.recurring?.interval,
  );
  const period = getSubscriptionPeriod(subscription);

  await updateAdvisorStripeIds({
    advisorId: advisor.id,
    customerId,
    subscriptionId: subscription.id,
  });

  if (deleted || subscription.status === "canceled" || subscription.status === "incomplete_expired") {
    await setAdvisorStatus({
      advisorId: advisor.id,
      status: "canceled",
      billingInterval: recurringInterval,
      periodStart: period.start,
      periodEnd: period.end,
      mode: mapStripeLivemodeToBillingMode(subscription.livemode),
    });
    return;
  }

  if (subscription.status === "past_due" || subscription.status === "unpaid") {
    await setAdvisorStatus({
      advisorId: advisor.id,
      status: "delinquent",
      billingInterval: recurringInterval,
      periodStart: period.start,
      periodEnd: period.end,
      mode: mapStripeLivemodeToBillingMode(subscription.livemode),
    });
    return;
  }

  if (subscription.status === "active" || subscription.status === "trialing") {
    await setAdvisorStatus({
      advisorId: advisor.id,
      status: "active_paid",
      billingInterval: recurringInterval,
      periodStart: period.start,
      periodEnd: period.end,
      mode: mapStripeLivemodeToBillingMode(subscription.livemode),
    });
    return;
  }

  await setAdvisorStatus({
    advisorId: advisor.id,
    status: "setup_pending",
    billingInterval: recurringInterval,
    periodStart: period.start,
    periodEnd: period.end,
    mode: mapStripeLivemodeToBillingMode(subscription.livemode),
  });
}

export async function POST(request: Request) {
  const stripe = getStripeServerClient();
  const config = getStripeServerConfig();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      config.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionChanged(
          event.data.object as Stripe.Subscription,
          false,
        );
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionChanged(
          event.data.object as Stripe.Subscription,
          true,
        );
        break;
      default:
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
