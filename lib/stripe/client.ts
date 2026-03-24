import "server-only";
import Stripe from "stripe";
import { getStripeServerConfig } from "@/lib/stripe/config";

let stripeClient: Stripe | null = null;

export function getStripeServerClient(): Stripe {
  if (stripeClient) return stripeClient;

  const config = getStripeServerConfig();
  stripeClient = new Stripe(config.STRIPE_SECRET_KEY, {
    apiVersion: "2026-02-25.clover",
    appInfo: {
      name: "Rewaro",
      version: "0.1.0",
    },
  });

  return stripeClient;
}
