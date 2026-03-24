import Link from "next/link";
import Image from "next/image";
import { getCurrentUser } from "@/lib/auth/auth";
import {
  resolveMonthlyFeeCents,
  resolveSetupFeeCents,
  resolveTierByPosition,
  type PricingTier,
} from "@/lib/billing/domain";
import {
  BookIcon,
  GiftIcon,
  TargetIcon,
  TrophyIcon,
  UsersIcon,
} from "@/app/empfehler/dashboard/components/icons";
import { LandingProblemsSection } from "@/app/components/landing-problems-section";
import { getQualifyingLiveAdvisorCount } from "@/lib/queries/billing";
import { createAdminClient } from "@/lib/supabase/admin";

const benefits = [
  {
    title: "Empfehlungen im Blick",
    text: "Sie sehen sofort, welche Empfehlung neu ist, in Prüfung liegt oder bereits erfolgreich abgeschlossen wurde.",
    icon: BookIcon,
  },
  {
    title: "Empfehler langfristig motivieren",
    text: "Punkte, Levels und Prämien schaffen Transparenz und erhöhen die Aktivität Ihrer Empfehler.",
    icon: TrophyIcon,
  },
  {
    title: "Prämien und Einlösungen steuern",
    text: "Belohnungen, Status und Einlösungen sind zentral dokumentiert und für Sie jederzeit nachvollziehbar.",
    icon: GiftIcon,
  },
  {
    title: "Wachstum systematisieren",
    text: "Aus Empfehlungen wird ein planbarer Prozess, der mehr qualifizierte Kontakte in Abschlüsse überführt.",
    icon: TargetIcon,
  },
];

const steps = [
  {
    title: "Empfehler einladen",
    text: "Sie teilen Ihren Link und bauen Ihr Netzwerk strukturiert auf.",
  },
  {
    title: "Empfehlungen verfolgen",
    text: "Status, Kontaktfortschritt und Verantwortlichkeiten bleiben zentral sichtbar.",
  },
  {
    title: "Punkte und Prämien steuern",
    text: "Sie motivieren gezielt und verwalten Einlösungen ohne manuelle Listen.",
  },
];

const landingPricingPhases = [
  {
    key: "founder",
    title: "Startphase / Early Bird",
    text: "Frühe Berater profitieren vom vergünstigten Einstieg und bringen Praxis-Feedback direkt in die Weiterentwicklung ein.",
  },
  {
    key: "early",
    title: "Wachstumsphase",
    text: "Mit wachsender Nutzung und weiterer Etablierung entwickelt sich auch die Preisstufe in die nächste Phase.",
  },
  {
    key: "standard",
    title: "Standardphase",
    text: "Nach der Aufbauphase gilt der reguläre Einstiegspreis für neue Berater.",
  },
 ] as const satisfies ReadonlyArray<{ key: PricingTier; title: string; text: string }>;

function formatEuro(cents: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function getPhaseMetaFromCount(qualifiedLiveCount: number) {
  const nextPosition = qualifiedLiveCount + 1;
  const tier = resolveTierByPosition(nextPosition);

  if (tier === "founder") {
    const phaseLimit = 10;
    const currentCountInPhase = Math.min(Math.max(qualifiedLiveCount, 0), phaseLimit);
    return {
      tier,
      phaseLabel: "Startphase / Early Bird",
      phaseLimit,
      currentCountInPhase,
      remainingUntilNext: Math.max(phaseLimit - currentCountInPhase, 0),
    };
  }

  if (tier === "early") {
    const phaseLimit = 40;
    const currentCountInPhase = Math.min(Math.max(qualifiedLiveCount - 10, 0), phaseLimit);
    return {
      tier,
      phaseLabel: "Wachstumsphase",
      phaseLimit,
      currentCountInPhase,
      remainingUntilNext: Math.max(phaseLimit - currentCountInPhase, 0),
    };
  }

  return {
    tier,
    phaseLabel: "Standardphase",
    phaseLimit: null as number | null,
    currentCountInPhase: Math.max(qualifiedLiveCount - 50, 0),
    remainingUntilNext: 0,
  };
}

export default async function HomePage() {
  const { user, role } = await getCurrentUser();
  const dashboardHref = role === "referrer" ? "/empfehler/dashboard" : "/berater/dashboard";
  let qualifiedLiveAdvisorCount = 0;

  try {
    const admin = createAdminClient();
    qualifiedLiveAdvisorCount = await getQualifyingLiveAdvisorCount(admin);
  } catch {
    qualifiedLiveAdvisorCount = 0;
  }

  const phaseMeta = getPhaseMetaFromCount(qualifiedLiveAdvisorCount);
  const currentSetupCents = resolveSetupFeeCents(phaseMeta.tier);
  const currentMonthlyCents = resolveMonthlyFeeCents(phaseMeta.tier);
  const currentAnnualCents = currentMonthlyCents * 12;
  const phaseProgressPercent =
    phaseMeta.phaseLimit && phaseMeta.phaseLimit > 0
      ? Math.min(Math.max((phaseMeta.currentCountInPhase / phaseMeta.phaseLimit) * 100, 0), 100)
      : 100;

  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-10 px-6 pb-10 pt-6 md:gap-12 md:px-8 md:pb-14">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_8%_4%,rgba(255,157,66,0.2),transparent_38%),radial-gradient(circle_at_92%_8%,rgba(96,165,250,0.18),transparent_38%),radial-gradient(circle_at_50%_120%,rgba(139,92,246,0.09),transparent_48%),linear-gradient(180deg,#fcfcff_0%,#f6f8ff_45%,#edf2ff_100%)]" />
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.09] [background-image:radial-gradient(rgba(20,24,36,0.08)_0.45px,transparent_0.45px)] [background-size:3px_3px]" />
      <div className="hex-honeycomb-bg pointer-events-none fixed inset-0 z-0 opacity-[0.1] [mask-image:linear-gradient(180deg,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0.1)_36%,rgba(0,0,0,0.02)_100%)]" />

      <header className="sticky top-3 z-30 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/93 px-4 py-2 shadow-[0_14px_30px_rgba(15,23,42,0.1)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-y-0 left-3 w-24 -skew-x-[24deg] bg-gradient-to-b from-zinc-950/14 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 left-10 w-16 -skew-x-[24deg] bg-gradient-to-b from-zinc-900/10 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-3 w-24 skew-x-[24deg] bg-gradient-to-b from-zinc-950/14 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-10 w-16 skew-x-[24deg] bg-gradient-to-b from-zinc-900/10 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-zinc-900/8" />

        <div className="relative grid grid-cols-[auto_1fr_auto] items-center gap-6">
          <p className="inline-flex items-center">
            <Image
              src="/Logo/ChatGPT Image 22. März 2026, 09_33_57.transparent.png"
              alt="Rewaro"
              width={260}
              height={78}
              className="h-[5.75rem] w-auto md:h-[6rem]"
              priority
            />
          </p>

          <nav className="hidden items-center justify-center gap-2 xl:flex">
            <a href="#preise" className="rounded-lg px-3 py-1.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-orange-100/75 hover:text-orange-700">Preise</a>
            <a href="#alltag" className="rounded-lg px-3 py-1.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-orange-100/75 hover:text-orange-700">Anwendung</a>
            <a href="#probleme" className="rounded-lg px-3 py-1.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-orange-100/75 hover:text-orange-700">Probleme</a>
            <a href="#nutzen" className="rounded-lg px-3 py-1.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-orange-100/75 hover:text-orange-700">Nutzen</a>
            <a href="#ablauf" className="rounded-lg px-3 py-1.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-orange-100/75 hover:text-orange-700">Ablauf</a>
          </nav>

          <div className="flex min-h-[2.5rem] items-center justify-end gap-2">
            {user ? (
              <Link
                href={dashboardHref}
                className="rounded-xl border border-zinc-900/10 bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-zinc-800"
              >
                Zum Dashboard
              </Link>
            ) : null}
            <Link
              href="/berater/login"
              className="rounded-xl border border-orange-300/70 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 shadow-[0_8px_18px_rgba(249,115,22,0.14)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-100"
            >
              Berater-Login
            </Link>
            <Link
              href="/empfehler/login"
              className="rounded-xl border border-orange-300/70 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 shadow-[0_8px_18px_rgba(249,115,22,0.14)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-100"
            >
              Empfehler-Login
            </Link>
          </div>
        </div>
      </header>

      <section className="relative z-10 overflow-hidden rounded-3xl border border-zinc-200/80 bg-white/94 p-7 shadow-[0_26px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl md:p-10">
        <div className="pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full bg-orange-200/34 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 -bottom-20 h-52 w-52 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.75)_0%,rgba(255,255,255,0.55)_45%,rgba(255,255,255,0.72)_100%)]" />

        <div className="relative grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-300/60 bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-orange-700">
              <UsersIcon className="h-3.5 w-3.5" />
              Für Berater
            </span>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-zinc-950 md:text-6xl">
              Empfehlungen endlich strukturiert statt zufällig.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-relaxed text-zinc-700 md:text-lg">
              Rewaro ist die Empfehlungsplattform für Berater: Sie verwalten Empfehlungen,
              Empfehler, Punkte, Prämien und Einlösungen in einem klaren System. So geht kein
              wertvoller Kontakt mehr verloren.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/berater/signup"
                className="inline-flex items-center gap-2 rounded-xl border border-orange-300/70 bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(249,115,22,0.38)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-400 hover:shadow-[0_20px_34px_rgba(249,115,22,0.45)]"
              >
                Berater-Konto erstellen
              </Link>
              
            </div>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute -inset-6 rounded-[2.2rem] bg-[radial-gradient(circle_at_72%_24%,rgba(249,115,22,0.18),transparent_52%),radial-gradient(circle_at_24%_82%,rgba(59,130,246,0.14),transparent_50%)] blur-2xl" />
            <div className="relative rounded-[1.55rem] border border-zinc-200/85 bg-white/94 p-4 shadow-[0_26px_50px_rgba(15,23,42,0.16),inset_0_1px_0_rgba(255,255,255,0.95)] transition-transform duration-500 lg:-rotate-[1.2deg] lg:hover:-rotate-0 lg:hover:-translate-y-1">
              <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/90 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Live Produktansicht
                </p>
                <div className="mt-3 rounded-xl border border-zinc-200/75 bg-white p-3 shadow-[0_8px_18px_rgba(15,23,42,0.06)]">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[11px] text-zinc-500">Verfügbare Punkte</p>
                      <p className="text-2xl font-semibold text-zinc-900">1.320</p>
                    </div>
                    <span className="rounded-full border border-orange-300/70 bg-orange-100 px-2.5 py-1 text-[11px] font-semibold text-orange-700">
                      Level Gold
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-zinc-600">Nächstes Ziel: 1.500 Punkte</p>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-zinc-200/90">
                    <div className="h-full w-[88%] rounded-full bg-gradient-to-r from-orange-400 to-orange-500 shadow-[0_0_18px_rgba(249,115,22,0.35)]" />
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-[1.12fr_0.88fr]">
                  <div className="rounded-xl border border-zinc-200/75 bg-white p-3 shadow-[0_8px_18px_rgba(15,23,42,0.06)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Empfehlungen</p>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/80 px-2.5 py-1.5">
                        <span className="text-xs text-zinc-700">Alex Winter</span>
                        <span className="text-[11px] font-medium text-zinc-500">in Prüfung</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/80 px-2.5 py-1.5">
                        <span className="text-xs text-zinc-700">Svenja Hart</span>
                        <span className="text-[11px] font-medium text-emerald-600">erfolgreich</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-200/75 bg-white p-3 shadow-[0_8px_18px_rgba(15,23,42,0.06)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Rangliste</p>
                    <div className="mt-2 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between rounded-md bg-orange-50 px-2 py-1">
                        <span className="font-semibold text-orange-700">#1 Nora Vale</span>
                        <span className="text-zinc-700">1.280</span>
                      </div>
                      <div className="flex items-center justify-between rounded-md bg-zinc-50 px-2 py-1">
                        <span className="text-zinc-700">#2 Leon Frost</span>
                        <span className="text-zinc-700">1.140</span>
                      </div>
                      <div className="flex items-center justify-between rounded-md bg-zinc-50 px-2 py-1">
                        <span className="text-zinc-700">#3 Mia Nova</span>
                        <span className="text-zinc-700">1.060</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="preise" className="relative z-10 overflow-hidden rounded-3xl border border-zinc-200/85 bg-white/95 p-6 shadow-[0_20px_44px_rgba(15,23,42,0.1)] scroll-mt-28">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-zinc-900 md:text-3xl">
              Aktuelle Startphase und Vorteile
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-zinc-700 md:text-base">
              Der Einstiegspreis folgt einem transparenten Phasenmodell. Im Fokus steht die aktuelle Phase,
              ergänzt um eine klare Orientierung zur nächsten Preisstufe.
            </p>
          </div>
          <span className="rounded-full border border-orange-200/80 bg-orange-100/75 px-3 py-1 text-xs font-semibold text-orange-700">
            Für Berater
          </span>
        </div>

        <article className="mt-5 overflow-hidden rounded-2xl border border-orange-200/75 bg-gradient-to-br from-orange-50/90 via-white to-zinc-50 p-5 shadow-[0_18px_34px_rgba(249,115,22,0.12)] md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <span className="inline-flex items-center rounded-full border border-orange-300/70 bg-orange-100/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-orange-700">
                Aktuelle Phase
              </span>
              <h3 className="mt-3 text-2xl font-semibold text-zinc-900 md:text-[2rem]">
                Früh einsteigen und Rewaro mitgestalten
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-700 md:text-base">
                In der Startphase profitieren frühe Berater vom vergünstigten Einstieg und helfen mit
                ihrem Feedback dabei, Rewaro weiter auf den realen Beratungsalltag auszurichten.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200/80 bg-white/95 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">{phaseMeta.phaseLabel}</p>
              <p className="mt-1 text-3xl font-semibold leading-none text-zinc-900">{formatEuro(currentSetupCents)}</p>
              <p className="mt-1 text-sm font-medium text-zinc-700">Einrichtungsgebühr</p>
              <p className="mt-2 text-sm text-zinc-700">{formatEuro(currentMonthlyCents)} pro Monat</p>
              <p className="text-sm text-zinc-700">{formatEuro(currentAnnualCents)} pro Jahr</p>
            </div>
          </div>
        </article>

        <div className="mt-4 rounded-2xl border border-zinc-200/85 bg-zinc-50/85 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-zinc-700">
              {phaseMeta.phaseLimit ? (
                <>
                  Aktuell {phaseMeta.phaseLabel}: noch{" "}
                  <span className="font-semibold text-zinc-900">{phaseMeta.remainingUntilNext} Plätze</span>{" "}
                  bis zur nächsten Preisstufe.
                </>
              ) : (
                <>Aktuell {phaseMeta.phaseLabel}: regulärer Einstiegspreis aktiv.</>
              )}
            </p>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
              {phaseMeta.phaseLimit
                ? `${phaseMeta.currentCountInPhase} / ${phaseMeta.phaseLimit} Plätze belegt`
                : `${qualifiedLiveAdvisorCount} qualifizierte Live-Berater`}
            </p>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-zinc-200/90">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500"
              style={{
                width: `${phaseProgressPercent}%`,
              }}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {landingPricingPhases.map((phase) => {
            const isCurrent = phase.key === phaseMeta.tier;
            const setupCents = resolveSetupFeeCents(phase.key);
            const monthlyCents = resolveMonthlyFeeCents(phase.key);
            const annualCents = monthlyCents * 12;
            return (
              <article
                key={phase.key}
                className={`rounded-2xl border p-4 transition-colors ${
                  isCurrent ? "border-orange-200/80 bg-orange-50/70" : "border-zinc-200/85 bg-white/90"
                }`}
              >
                <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${isCurrent ? "text-orange-700" : "text-zinc-500"}`}>
                  {phase.title}
                </p>
                <p className="mt-2 text-base font-semibold text-zinc-900">{formatEuro(setupCents)} Einrichtung</p>
                <p className="text-sm text-zinc-700">{formatEuro(monthlyCents)} monatlich oder {formatEuro(annualCents)} jährlich</p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">{phase.text}</p>
              </article>
            );
          })}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-orange-200/85 bg-gradient-to-br from-orange-50/95 to-white p-4 shadow-[0_12px_26px_rgba(249,115,22,0.1)]">
            <p className="text-sm font-semibold text-zinc-900">Startvorteile beim Einstieg</p>
            <ul className="mt-2 space-y-2 text-sm text-zinc-700">
              <li>• 100 € Startvorteil über Berater-Einladung</li>
              <li>• 200 € Einrichtungsvorteil bei direkter Jahreszahlung</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-orange-200/80 bg-gradient-to-br from-orange-50/90 to-white p-4 shadow-[0_12px_26px_rgba(249,115,22,0.08)]">
            <p className="text-sm font-semibold text-zinc-900">Langfristiges Sparpotenzial</p>
            <div className="mt-2 rounded-xl border border-orange-200/80 bg-white/85 p-3">
              <p className="text-lg font-semibold leading-tight text-zinc-900">Bis zu 50 % dauerhaft auf laufende Kosten möglich</p>
              <p className="mt-1.5 text-sm text-zinc-700">
                Mit einem starken Empfehlungsnetzwerk können Sie Ihre laufenden Rewaro-Kosten dauerhaft halbieren.
              </p>
            </div>
            <p className="mt-3 text-sm font-medium text-zinc-800">Zusätzlich sind bis zu 11 Monate kostenlos möglich.</p>
            <p className="mt-1 text-sm text-zinc-700">
              Durch Empfehlungen und Optionen beim Start können Sie sich bis zu 11 Monate Rewaro komplett kostenlos sichern.
            </p>
          </div>
        </div>
      </section>

      <section id="alltag" className="relative z-10 overflow-hidden rounded-3xl border border-zinc-200/85 bg-white/95 p-6 shadow-[0_22px_50px_rgba(15,23,42,0.12)] md:p-7 scroll-mt-28">
  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(15,23,42,0.1),transparent_40%),radial-gradient(circle_at_84%_74%,rgba(249,115,22,0.16),transparent_46%),radial-gradient(circle_at_62%_42%,rgba(59,130,246,0.11),transparent_52%)]" />
  <div className="pointer-events-none absolute -left-20 top-16 h-36 w-36 rounded-full bg-zinc-900/10 blur-3xl" />
  <div className="pointer-events-none absolute -right-16 bottom-10 h-40 w-40 rounded-full bg-orange-200/30 blur-3xl" />

  <div className="relative flex items-center justify-between gap-3">
    <h2 className="text-2xl font-semibold text-zinc-900 md:text-3xl">
      Das können Sie mit Rewaro konkret umsetzen
    </h2>
  </div>

  <div className="relative mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    <article className="rounded-2xl border border-zinc-200/85 bg-white/96 p-4 shadow-[0_14px_28px_rgba(15,23,42,0.1)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_34px_rgba(15,23,42,0.14)]">
      <h3 className="text-sm font-semibold text-zinc-900">Prämien-Umfragen erstellen</h3>
      <p className="mt-1 text-sm leading-relaxed text-zinc-700">
        Fragen Sie gezielt ab, welche Prämien Ihre Empfehler wirklich motivieren.
      </p>
      <div className="mt-3 rounded-xl border border-zinc-200/75 bg-zinc-50/80 p-3">
        <p className="text-xs font-medium text-zinc-600">Aktive Umfrage</p>
        <p className="mt-1 text-xs text-zinc-800">„Welche Prämie wünscht ihr euch als Nächstes?“</p>
      </div>
    </article>

    <article className="rounded-2xl border border-zinc-200/85 bg-white/96 p-4 shadow-[0_14px_28px_rgba(15,23,42,0.1)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_34px_rgba(15,23,42,0.14)]">
      <h3 className="text-sm font-semibold text-zinc-900">Punkte sammeln &amp; Level erreichen</h3>
      <p className="mt-1 text-sm leading-relaxed text-zinc-700">
        Fortschritt ist jederzeit sichtbar und sorgt für klare Motivation.
      </p>
      <div className="mt-3 rounded-xl border border-zinc-200/75 bg-zinc-50/80 p-3">
        <p className="text-xs text-zinc-600">Noch 30 Punkte bis 100€ Gutschein</p>
        <p className="mt-1 text-xs font-semibold text-emerald-700">Level Gold erreicht</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200/90">
          <div className="h-full w-[88%] rounded-full bg-orange-500 shadow-[0_0_14px_rgba(249,115,22,0.35)]" />
        </div>
      </div>
    </article>

    <article className="rounded-2xl border border-zinc-200/85 bg-white/96 p-4 shadow-[0_14px_28px_rgba(15,23,42,0.1)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_34px_rgba(15,23,42,0.14)]">
      <h3 className="text-sm font-semibold text-zinc-900">Prämien verwalten &amp; einlösen</h3>
      <p className="mt-1 text-sm leading-relaxed text-zinc-700">
        Legen Sie Belohnungen an und behalten Sie Einlösungen zentral im Blick.
      </p>
      <div className="mt-3 rounded-xl border border-zinc-200/75 bg-zinc-50/80 p-3">
        <p className="text-xs text-zinc-600">Einlösung heute</p>
        <p className="mt-1 text-xs text-zinc-800">100€ Gutschein - bestätigt</p>
      </div>
    </article>

    <article className="rounded-2xl border border-zinc-200/85 bg-white/96 p-4 shadow-[0_14px_28px_rgba(15,23,42,0.1)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_34px_rgba(15,23,42,0.14)]">
      <h3 className="text-sm font-semibold text-zinc-900">Empfehlungen im Status verfolgen</h3>
      <p className="mt-1 text-sm leading-relaxed text-zinc-700">
        Jeder Kontakt hat einen klaren Status vom Eingang bis zum Abschluss.
      </p>
      <div className="mt-3 rounded-xl border border-zinc-200/75 bg-zinc-50/80 p-3">
        <p className="text-xs text-zinc-800">Max Mustermann - Termin morgen</p>
        <p className="mt-1 text-xs text-zinc-600">+100 Punkte bei Abschluss</p>
      </div>
    </article>

    <article className="rounded-2xl border border-zinc-200/85 bg-white/96 p-4 shadow-[0_14px_28px_rgba(15,23,42,0.1)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_34px_rgba(15,23,42,0.14)]">
      <h3 className="text-sm font-semibold text-zinc-900">Automatisch oder manuell vergeben</h3>
      <p className="mt-1 text-sm leading-relaxed text-zinc-700">
        Definieren Sie, wie Punkte entstehen - je nach Prozess automatisiert oder bewusst manuell.
      </p>
      <div className="mt-3 rounded-xl border border-zinc-200/75 bg-zinc-50/80 p-3">
        <p className="text-xs text-zinc-600">Punkte-Workflow</p>
        <p className="mt-1 text-xs text-zinc-800">Automatik aktiv - manuelle Korrektur möglich</p>
      </div>
    </article>

    <article className="rounded-2xl border border-zinc-200/85 bg-white/96 p-4 shadow-[0_14px_28px_rgba(15,23,42,0.1)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_34px_rgba(15,23,42,0.14)]">
      <h3 className="text-sm font-semibold text-zinc-900">Struktur &amp; Übersicht statt Chaos</h3>
      <p className="mt-1 text-sm leading-relaxed text-zinc-700">
        Alle Empfehlungen, Prämien und Ergebnisse sind an einem Ort nachvollziehbar.
      </p>
      <div className="mt-3 rounded-xl border border-zinc-200/75 bg-zinc-50/80 p-3">
        <p className="text-xs text-zinc-600">Wochenüberblick</p>
        <p className="mt-1 text-xs text-zinc-800">3 neue Empfehlungen - 2 Abschlüsse - 1 Einlösung</p>
      </div>
    </article>
  </div>
</section>
      <LandingProblemsSection />

      <section id="nutzen" className="relative z-10 rounded-3xl border border-zinc-200/85 bg-gradient-to-br from-orange-50/85 via-white to-sky-50/75 p-7 shadow-[0_24px_48px_rgba(15,23,42,0.1)] md:p-8 scroll-mt-28">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold text-zinc-900 md:text-3xl">So unterstützt Rewaro Ihr Wachstum</h2>
          <span className="hidden rounded-full border border-orange-200/80 bg-orange-100/70 px-3 py-1 text-xs font-semibold text-orange-700 md:inline-flex">
            Produktnutzen
          </span>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <article
                key={benefit.title}
                className="rounded-2xl border border-zinc-200/80 bg-white/93 p-4 shadow-[0_12px_24px_rgba(15,23,42,0.07)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(249,115,22,0.16)]"
              >
                <h3 className="inline-flex items-center gap-2 text-base font-semibold text-zinc-900">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-orange-300/55 bg-orange-100 text-orange-700">
                    <Icon className="h-4 w-4" />
                  </span>
                  {benefit.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-800">{benefit.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="ablauf" className="relative z-10 rounded-3xl border border-zinc-200/85 bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.09)] scroll-mt-28">
        <h2 className="text-2xl font-semibold text-zinc-950">So funktioniert es in 3 Schritten</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {steps.map((step, index) => (
            <article
              key={step.title}
              className="rounded-xl border border-zinc-200/75 bg-zinc-50/90 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-300/70"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-orange-700">Schritt {index + 1}</p>
              <h3 className="mt-1 text-sm font-semibold text-zinc-900">{step.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-800">{step.text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}





