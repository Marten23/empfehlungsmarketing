"use client";

import { useState } from "react";

type CheckoutStartButtonsProps = {
  monthlyLabel: string;
  annualLabel: string;
};

async function startCheckout(billingInterval: "monthly" | "annual") {
  const response = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ billingInterval }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
  };

  if (!response.ok || !payload.url) {
    throw new Error(payload.error ?? "Checkout konnte nicht gestartet werden.");
  }

  window.location.href = payload.url;
}

export function CheckoutStartButtons({
  monthlyLabel,
  annualLabel,
}: CheckoutStartButtonsProps) {
  const [pending, setPending] = useState<"monthly" | "annual" | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-2">
        <button
          type="button"
          onClick={async () => {
            setError(null);
            setPending("monthly");
            try {
              await startCheckout("monthly");
            } catch (e) {
              setError(e instanceof Error ? e.message : "Monatlicher Checkout fehlgeschlagen.");
              setPending(null);
            }
          }}
          disabled={pending !== null}
          className="rounded-xl border border-orange-300/60 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-400/70 hover:bg-orange-50 disabled:opacity-60"
        >
          {pending === "monthly" ? "Weiterleitung..." : monthlyLabel}
        </button>

        <button
          type="button"
          onClick={async () => {
            setError(null);
            setPending("annual");
            try {
              await startCheckout("annual");
            } catch (e) {
              setError(e instanceof Error ? e.message : "Jahres-Checkout fehlgeschlagen.");
              setPending(null);
            }
          }}
          disabled={pending !== null}
          className="rounded-xl border border-orange-300/70 bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(249,115,22,0.34)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-400 disabled:opacity-60"
        >
          {pending === "annual" ? "Weiterleitung..." : annualLabel}
        </button>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

