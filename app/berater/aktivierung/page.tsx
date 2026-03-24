import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/auth";
import { getCurrentAdvisorContext } from "@/lib/auth/advisor";
import { ensureAdvisorOnboardingForUser } from "@/lib/auth/onboarding";
import {
  canAccessAdvisorApp,
  getAdvisorAccessStateForUser,
} from "@/lib/auth/advisor-access";
import { calculatePricingSnapshot } from "@/lib/billing/domain";
import { CheckoutStartButtons } from "@/app/berater/aktivierung/checkout-start-buttons";
import {
  BookIcon,
  SparklesIcon,
  TrophyIcon,
} from "@/app/empfehler/dashboard/components/icons";

function euro(cents: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export default async function AdvisorActivationPage() {
  const { user, role } = await getCurrentUser();
  if (!user) redirect("/berater/login");
  if (role === "referrer") redirect("/empfehler/dashboard");

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (authUser) {
    await ensureAdvisorOnboardingForUser(supabase, authUser);
  }

  const access = await getAdvisorAccessStateForUser(supabase, user.id);
  if (access.canAccessApp) {
    redirect("/berater/dashboard");
  }

  const advisorContext = await getCurrentAdvisorContext();
  if (!advisorContext) redirect("/berater/login");

  const { data: advisorRow } = await supabase
    .from("advisors")
    .select(
      "id, pricing_tier, referred_by_advisor_id, account_status, lifetime_discount_state, lifetime_discount_percent",
    )
    .eq("id", advisorContext.advisorId)
    .maybeSingle();

  const advisor = advisorRow as
    | {
        id: string;
        pricing_tier: "founder" | "early" | "standard";
        referred_by_advisor_id: string | null;
        account_status: string | null;
        lifetime_discount_state: "inactive" | "pending_next_cycle" | "active" | null;
        lifetime_discount_percent: number | null;
      }
    | null;

  if (!advisor) {
    redirect("/berater/login");
  }

  const monthlyPreview = calculatePricingSnapshot({
    tier: advisor.pricing_tier,
    billingInterval: "monthly",
    hasReferralDiscount: Boolean(advisor.referred_by_advisor_id),
    applyAnnualSetupDiscount: false,
    lifetimeDiscountState: advisor.lifetime_discount_state ?? "inactive",
    lifetimeDiscountPercent: advisor.lifetime_discount_percent ?? 0,
  });

  const annualPreview = calculatePricingSnapshot({
    tier: advisor.pricing_tier,
    billingInterval: "annual",
    hasReferralDiscount: Boolean(advisor.referred_by_advisor_id),
    applyAnnualSetupDiscount: true,
    lifetimeDiscountState: advisor.lifetime_discount_state ?? "inactive",
    lifetimeDiscountPercent: advisor.lifetime_discount_percent ?? 0,
  });

  const accountStatus = advisor.account_status ?? "registered";
  const canAccess = canAccessAdvisorApp(accountStatus);
  if (canAccess) {
    redirect("/berater/dashboard");
  }

  const monthlySetupSavings =
    monthlyPreview.referralDiscountSnapshotCents +
    monthlyPreview.annualSetupDiscountSnapshotCents;
  const annualSetupSavings =
    annualPreview.referralDiscountSnapshotCents +
    annualPreview.annualSetupDiscountSnapshotCents;

  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-7 md:px-8">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_8%_4%,rgba(255,157,66,0.2),transparent_38%),radial-gradient(circle_at_92%_8%,rgba(96,165,250,0.18),transparent_38%),radial-gradient(circle_at_50%_120%,rgba(139,92,246,0.09),transparent_48%),linear-gradient(180deg,#fcfcff_0%,#f6f8ff_45%,#edf2ff_100%)]" />
      <div className="hex-honeycomb-bg pointer-events-none fixed inset-0 z-0 opacity-[0.1] [mask-image:linear-gradient(180deg,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0.1)_36%,rgba(0,0,0,0.02)_100%)]" />

      <section className="relative z-10 rounded-3xl border border-zinc-200/85 bg-white/95 p-6 shadow-[0_20px_44px_rgba(15,23,42,0.1)] backdrop-blur-xl md:p-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-orange-300/50 bg-orange-100/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-orange-800">
          <SparklesIcon className="h-3.5 w-3.5" />
          Aktivierung
        </span>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
          Dein Konto ist erstellt. Jetzt aktivierst du dein eigenes Empfehlungsprogramm.
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-zinc-700 md:text-base">
          Wähle die Zahlungsart, die zu dir passt. Nach erfolgreicher Aktivierung
          erhältst du Zugriff auf alle Rewaro-Funktionen.
        </p>

        <div className="mt-4 inline-flex rounded-xl border border-orange-200/70 bg-white/90 px-3 py-2 text-sm text-zinc-700">
          Aktueller Kontostatus:{" "}
          <span className="ml-1 font-semibold text-zinc-900">{accountStatus}</span>
        </div>
      </section>

      <section className="relative z-10 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-2xl border border-zinc-200/85 bg-white/90 p-5 shadow-[0_12px_24px_rgba(15,23,42,0.08)]">
          <h2 className="inline-flex items-center gap-2 text-xl font-semibold text-zinc-900">
            <BookIcon className="h-5 w-5 text-orange-700" />
            Dein aktuelles Angebot
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Preisvorschau basierend auf deinem aktuellen Konto- und Preisstatus.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-orange-200/65 bg-orange-50/70 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-orange-700">
                Monatlich starten
              </p>
              {monthlySetupSavings > 0 ? (
                <p className="mt-2 inline-flex rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  Du sparst {euro(monthlySetupSavings)} beim Setup
                </p>
              ) : null}
              <div className="mt-2 rounded-lg border border-zinc-200/80 bg-white/85 p-3">
                <div className="flex items-center justify-between text-sm text-zinc-700">
                  <span>Setup regulär</span>
                  <span>{euro(monthlyPreview.setupPriceSnapshotCents)}</span>
                </div>
                {monthlyPreview.referralDiscountSnapshotCents > 0 ? (
                  <div className="mt-1 flex items-center justify-between text-sm text-emerald-700">
                    <span>Rabatt über Berater-Einladung</span>
                    <span>-{euro(monthlyPreview.referralDiscountSnapshotCents)}</span>
                  </div>
                ) : null}
                {monthlyPreview.annualSetupDiscountSnapshotCents > 0 ? (
                  <div className="mt-1 flex items-center justify-between text-sm text-emerald-700">
                    <span>Jahresstart-Vorteil</span>
                    <span>-{euro(monthlyPreview.annualSetupDiscountSnapshotCents)}</span>
                  </div>
                ) : null}
                <div className="mt-2 border-t border-zinc-200/80 pt-2 text-sm font-semibold text-zinc-900">
                  <div className="flex items-center justify-between">
                    <span>Setup heute fällig</span>
                    <span>{euro(monthlyPreview.finalSetupPriceSnapshotCents)}</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-zinc-700">
                Laufend: {euro(monthlyPreview.finalRecurringPriceSnapshotCents)} / Monat
              </p>
            </div>

            <div className="rounded-xl border border-orange-200/70 bg-orange-50/75 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-orange-700">
                Jährlich starten
              </p>
              {annualSetupSavings > 0 ? (
                <p className="mt-2 inline-flex rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  Du sparst {euro(annualSetupSavings)} beim Setup
                </p>
              ) : null}
              <div className="mt-2 rounded-lg border border-zinc-200/80 bg-white/85 p-3">
                <div className="flex items-center justify-between text-sm text-zinc-700">
                  <span>Setup regulär</span>
                  <span>{euro(annualPreview.setupPriceSnapshotCents)}</span>
                </div>
                {annualPreview.referralDiscountSnapshotCents > 0 ? (
                  <div className="mt-1 flex items-center justify-between text-sm text-emerald-700">
                    <span>Rabatt über Berater-Einladung</span>
                    <span>-{euro(annualPreview.referralDiscountSnapshotCents)}</span>
                  </div>
                ) : null}
                {annualPreview.annualSetupDiscountSnapshotCents > 0 ? (
                  <div className="mt-1 flex items-center justify-between text-sm text-emerald-700">
                    <span>Jahresstart-Vorteil</span>
                    <span>-{euro(annualPreview.annualSetupDiscountSnapshotCents)}</span>
                  </div>
                ) : null}
                <div className="mt-2 border-t border-zinc-200/80 pt-2 text-sm font-semibold text-zinc-900">
                  <div className="flex items-center justify-between">
                    <span>Setup heute fällig</span>
                    <span>{euro(annualPreview.finalSetupPriceSnapshotCents)}</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-zinc-700">
                Laufend: {euro(annualPreview.finalRecurringPriceSnapshotCents)} / Jahr
              </p>
              <p className="mt-1 text-xs font-medium text-orange-700">
                Einrichtungsvorteil bereits berücksichtigt
              </p>
            </div>
          </div>

          <div className="mt-5">
            <CheckoutStartButtons
              monthlyLabel="Monatlich starten"
              annualLabel="Jährlich starten und bei der Einrichtung sparen"
            />
          </div>
        </article>

        <article className="rounded-2xl border border-zinc-200/85 bg-white/90 p-5 shadow-[0_12px_24px_rgba(15,23,42,0.08)]">
          <h2 className="inline-flex items-center gap-2 text-xl font-semibold text-zinc-900">
            <TrophyIcon className="h-5 w-5 text-orange-700" />
            Sparmöglichkeiten
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-zinc-700">
            <li>• 100 € Startvorteil über Berater-Einladung.</li>
            <li>• 200 € Einrichtungsvorteil bei direkter Jahreszahlung.</li>
            <li>
              • Bis zu 11 Monate kostenlos möglich durch Empfehlungen und Optionen
              beim Start.
            </li>
            <li>• Bis zu 50 % dauerhaft auf laufende Kosten möglich.</li>
          </ul>

          <div className="mt-5 rounded-xl border border-orange-200/65 bg-orange-50/80 p-3 text-sm text-zinc-700">
            Starte vergünstigt, aktiviere dein Programm sauber und skaliere dann mit
            klarer Struktur statt Zufall.
          </div>

          <div className="mt-4">
            <Link
              href="/berater/login"
              className="text-sm font-medium text-orange-700 underline decoration-orange-300/70 underline-offset-4 hover:text-orange-900"
            >
              Zu einem anderen Konto wechseln
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}
