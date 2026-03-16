import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/auth";
import {
  ArrowUpRightIcon,
  BookIcon,
  GiftIcon,
  SparklesIcon,
  TargetIcon,
  TrophyIcon,
  UsersIcon,
} from "@/app/empfehler/dashboard/components/icons";

const painPoints = [
  "Empfehlungen laufen über WhatsApp, Zuruf oder Notizen und gehen im Tagesgeschäft unter.",
  "Es ist oft unklar, wer wen empfohlen hat und welcher Kontakt bereits in Bearbeitung ist.",
  "Belohnungen werden nicht sauber nachgehalten, Empfehler verlieren Motivation.",
];

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

export default async function HomePage() {
  const { user, role } = await getCurrentUser();
  const dashboardHref =
    role === "referrer" ? "/empfehler/dashboard" : "/berater/dashboard";

  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 p-6 md:p-8">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_35%,rgba(170,130,255,0.16),transparent_52%),radial-gradient(circle_at_15%_0%,rgba(126,87,255,0.26),transparent_42%),radial-gradient(circle_at_85%_8%,rgba(159,124,255,0.2),transparent_40%),linear-gradient(180deg,#1b1230_0%,#140d26_100%)]" />
      <div className="hex-honeycomb-bg pointer-events-none fixed inset-0 z-0 opacity-24" />
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute left-[5%] top-[12%] h-[220px] w-[260px] opacity-72">
          <div className="hex-node absolute left-0 top-8 h-14 w-14 border border-[#b788ff]/70 bg-[#6E44FF]/18" />
          <div className="hex-node absolute left-14 top-0 h-20 w-20 border border-[#c79bff]/80 bg-[#8d63ff]/24" />
          <div className="hex-node absolute left-30 top-12 h-14 w-14 border border-[#d2adff]/85 bg-[#a374ff]/26" />
        </div>
        <div className="absolute right-[6%] top-[62%] h-[230px] w-[280px] opacity-72">
          <div className="hex-node absolute left-4 top-4 h-16 w-16 border border-[#b788ff]/70 bg-[#6E44FF]/18" />
          <div className="hex-node absolute left-24 top-0 h-20 w-20 border border-[#c79bff]/80 bg-[#8d63ff]/24" />
          <div className="hex-node absolute left-44 top-14 h-14 w-14 border border-[#d2adff]/85 bg-[#a374ff]/26" />
        </div>
      </div>

      <header className="relative z-10 flex items-center justify-between gap-3 rounded-2xl border border-violet-200/55 bg-violet-50/88 px-4 py-3 shadow-[0_14px_34px_rgba(7,4,16,0.26)] backdrop-blur-xl">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-900">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-violet-300/45 bg-violet-100/80 text-violet-700">
            <SparklesIcon className="h-4 w-4" />
          </span>
          Emfielster
        </p>
        {user ? (
          <Link
            href={dashboardHref}
            className="rounded-xl border border-emerald-300/55 bg-emerald-100/90 px-4 py-2 text-sm font-semibold text-emerald-900 transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-200"
          >
            Zum Dashboard
          </Link>
        ) : null}
      </header>

      <section className="relative z-10 overflow-hidden rounded-3xl border border-violet-200/55 bg-violet-50/88 p-6 shadow-[0_24px_60px_rgba(5,3,12,0.38)] backdrop-blur-xl md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-300/45 bg-violet-200/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-violet-800">
              <UsersIcon className="h-3.5 w-3.5" />
              Für Berater
            </span>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 md:text-5xl">
              Empfehlungen endlich strukturiert statt zufällig.
            </h1>
            <p className="mt-4 max-w-3xl text-sm text-zinc-700 md:text-base">
              Emfielster ist die Empfehlungsplattform für Berater: Sie verwalten
              Empfehlungen, Empfehler, Punkte, Prämien und Einlösungen in einem klaren
              System. So geht kein wertvoller Kontakt mehr verloren.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                href="/berater/signup"
                className="inline-flex items-center gap-2 rounded-xl border border-violet-300/45 bg-white/88 px-5 py-2.5 text-sm font-semibold text-violet-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-400/70 hover:bg-violet-100"
              >
                Berater-Konto erstellen
              </Link>
              <Link
                href="/berater/login"
                className="inline-flex items-center gap-2 rounded-xl border border-violet-300/40 bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(91,61,200,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-violet-500"
              >
                Berater-Login
                <ArrowUpRightIcon className="h-4 w-4" />
              </Link>
              <Link
                href="/empfehler/login"
                className="text-sm font-medium text-violet-700 underline decoration-violet-300/70 underline-offset-4 transition-colors hover:text-violet-900"
              >
                Empfehler-Login
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-violet-200/60 bg-white/85 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
            <p className="text-xs font-medium uppercase tracking-wide text-violet-700">
              Was Berater konkret gewinnen
            </p>
            <ul className="mt-3 space-y-2 text-sm text-zinc-700">
              <li>- Klarer Überblick über jede Empfehlung und jeden Status</li>
              <li>- Höhere Aktivität Ihrer Empfehler durch sichtbare Belohnungen</li>
              <li>- Weniger manueller Aufwand, mehr Fokus auf Abschlüsse</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="relative z-10 rounded-3xl border border-violet-200/55 bg-white/84 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] md:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-zinc-900 md:text-2xl">
            So sieht der Arbeitsalltag in Emfielster aus
          </h2>
          <span className="hidden rounded-full border border-violet-300/45 bg-violet-100/75 px-3 py-1 text-xs font-semibold text-violet-700 md:inline-flex">
            Produkt-Mockup
          </span>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-2xl border border-violet-200/60 bg-violet-50/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            <p className="text-xs font-medium uppercase tracking-wide text-violet-700">
              Berater-Cockpit
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-violet-200/55 bg-white/90 p-3">
                <p className="text-xs text-zinc-500">Offene Empfehlungen</p>
                <p className="mt-1 text-2xl font-semibold text-zinc-900">12</p>
              </div>
              <div className="rounded-xl border border-violet-200/55 bg-white/90 p-3">
                <p className="text-xs text-zinc-500">Erfolgreich</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-700">27</p>
              </div>
              <div className="rounded-xl border border-violet-200/55 bg-white/90 p-3">
                <p className="text-xs text-zinc-500">Offene Einlösungen</p>
                <p className="mt-1 text-2xl font-semibold text-zinc-900">4</p>
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-violet-200/55 bg-white/90 p-3">
              <p className="text-xs font-medium text-zinc-600">Neueste Empfehlung</p>
              <p className="mt-1 text-sm text-zinc-900">Max Mustermann - in Prüfung - +100 Punkte bei Abschluss</p>
            </div>
          </article>

          <article className="rounded-2xl border border-violet-200/60 bg-violet-50/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            <p className="text-xs font-medium uppercase tracking-wide text-violet-700">
              Empfehler-Bereich
            </p>
            <div className="mt-3 rounded-xl border border-violet-200/55 bg-white/90 p-3">
              <p className="text-xs text-zinc-500">Verfügbare Punkte</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900">320</p>
              <p className="mt-1 text-xs text-zinc-600">Nächstes Level in 80 Punkten</p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-violet-100">
                <div className="h-full w-3/4 rounded-full bg-violet-500" />
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-violet-200/55 bg-white/90 p-3">
              <p className="text-xs text-zinc-500">Prämie einlösbar</p>
              <p className="mt-1 text-sm font-medium text-zinc-900">Gutschein - 250 Punkte</p>
            </div>
          </article>
        </div>
      </section>

      <section className="relative z-10 grid gap-4 lg:grid-cols-3">
        {painPoints.map((item) => (
          <article
            key={item}
            className="rounded-2xl border border-violet-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]"
          >
            <p className="text-sm text-zinc-700">{item}</p>
          </article>
        ))}
      </section>

      <section className="relative z-10 rounded-3xl border border-violet-200/55 bg-violet-50/86 p-6 shadow-[0_24px_60px_rgba(5,3,12,0.34)] backdrop-blur-xl md:p-7">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold text-zinc-900 md:text-3xl">
            So unterstützt Emfielster Ihr Wachstum
          </h2>
          <span className="hidden rounded-full border border-violet-300/45 bg-violet-200/45 px-3 py-1 text-xs font-semibold text-violet-800 md:inline-flex">
            Produktnutzen
          </span>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <article
                key={benefit.title}
                className="rounded-2xl border border-violet-200/55 bg-white/84 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-300/70 hover:bg-violet-50/90"
              >
                <h3 className="inline-flex items-center gap-2 text-base font-semibold text-zinc-900">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-violet-300/45 bg-violet-100 text-violet-700">
                    <Icon className="h-4 w-4" />
                  </span>
                  {benefit.title}
                </h3>
                <p className="mt-2 text-sm text-zinc-700">{benefit.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="relative z-10 rounded-2xl border border-violet-200/55 bg-white/84 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
        <h2 className="text-xl font-semibold text-zinc-900">
          So funktioniert es in 3 Schritten
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {steps.map((step, index) => (
            <article
              key={step.title}
              className="rounded-xl border border-violet-200/55 bg-violet-50/70 p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                Schritt {index + 1}
              </p>
              <h3 className="mt-1 text-sm font-semibold text-zinc-900">{step.title}</h3>
              <p className="mt-1 text-sm text-zinc-700">{step.text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
