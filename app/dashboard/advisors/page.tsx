import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdvisorContext } from "@/lib/auth/advisor";
import { normalizeSupabaseError } from "@/lib/supabase/errors";
import { getAdvisorActivationState } from "@/lib/queries/advisors";
import { LinkToolCard } from "@/app/components/link-tool-card";
import {
  ArrowUpRightIcon,
  BookIcon,
  GiftIcon,
  SparklesIcon,
  TrophyIcon,
  UsersIcon,
} from "@/app/empfehler/dashboard/components/icons";
import {
  markOwnContractActivatedAction,
  setReferrerActivationModeAction,
} from "@/app/dashboard/advisors/actions";
import { AdvisorAreaHeader } from "@/app/berater/components/advisor-area-header";

type AdvisorGrowthRow = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

type DashboardAdvisorsPageProps = {
  searchParams: Promise<{
    activated?: string;
    settings?: string;
    reason?: string;
  }>;
};

export default async function DashboardAdvisorsPage({
  searchParams,
}: DashboardAdvisorsPageProps) {
  const params = await searchParams;
  const advisorContext = await getCurrentAdvisorContext();

  if (!advisorContext) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 p-6">
        <h1 className="text-2xl font-semibold">Empfehlungsprogramm für Berater</h1>
        <p className="rounded bg-zinc-100 px-3 py-2 text-sm text-zinc-700">
          Kein Berater-Kontext gefunden.
        </p>
      </main>
    );
  }

  const supabase = await createClient();
  let successfulInvites: AdvisorGrowthRow[] = [];
  let loadError: string | null = null;
  let advisorInviteCode: string | null = null;
  let advisorReferralSlug: string | null = null;
  let referrerInviteCode: string | null = null;
  let accountActivatedAt: string | null = null;
  let isActive = false;
  let autoActivateReferrers = false;

  try {
    const { data: advisorCodesRow, error: advisorCodesError } = await supabase
      .from("advisors")
      .select("invite_code, advisor_referral_slug, referrer_invite_code")
      .eq("id", advisorContext.advisorId)
      .maybeSingle();

    if (advisorCodesError) {
      const code = (advisorCodesError as { code?: string }).code;
      if (code !== "PGRST204") throw advisorCodesError;
    } else {
      const row = advisorCodesRow as {
        invite_code?: string | null;
        advisor_referral_slug?: string | null;
        referrer_invite_code?: string | null;
      } | null;
      advisorInviteCode = row?.invite_code ?? null;
      advisorReferralSlug = row?.advisor_referral_slug ?? null;
      referrerInviteCode = row?.referrer_invite_code ?? null;
    }

    const activationState = await getAdvisorActivationState(
      supabase,
      advisorContext.advisorId,
    );
    accountActivatedAt = activationState.account_activated_at;
    isActive = activationState.is_active;

    const { data: settingsRow, error: settingsError } = await supabase
      .from("advisor_settings")
      .select("auto_activate_referrers")
      .eq("advisor_id", advisorContext.advisorId)
      .maybeSingle();

    if (settingsError) {
      const code = (settingsError as { code?: string }).code;
      if (code !== "PGRST204") throw settingsError;
    } else {
      autoActivateReferrers =
        (settingsRow as { auto_activate_referrers?: boolean } | null)
          ?.auto_activate_referrers ?? false;
    }

    const { data: rows, error } = await supabase
      .from("advisors")
      .select("id, name, slug, is_active, referred_by_advisor_id")
      .eq("referred_by_advisor_id", advisorContext.advisorId)
      .eq("is_active", true);

    if (error) throw error;
    successfulInvites = (rows ?? []) as AdvisorGrowthRow[];
  } catch (error) {
    loadError = normalizeSupabaseError(error).message;
  }

  const appBase = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const advisorShareCode =
    advisorReferralSlug ?? advisorInviteCode ?? advisorContext.advisorSlug;
  const advisorInviteLink = `${appBase}/partner/${advisorShareCode}`;
  const referrerInviteLink = `${appBase}/empfehler/${referrerInviteCode ?? advisorContext.advisorSlug}`;

  const successfulCount = successfulInvites.length;
  const nextGoal = successfulCount < 10 ? 10 - successfulCount : 0;
  const progressPercent = Math.min(
    100,
    Math.round((Math.min(successfulCount, 10) / 10) * 100),
  );
  const currentBenefit =
    successfulCount >= 10
      ? "50 % Lifetime Rabatt auf Ihr Monatsabo"
      : successfulCount >= 1
        ? `${successfulCount} Gratismonat${successfulCount === 1 ? "" : "e"}`
        : "Noch kein Vorteil erreicht";

  const panelClass =
    "relative z-10 rounded-2xl border border-orange-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]";
  const buttonClass =
    "rounded-lg border border-orange-300/50 bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-500 hover:shadow-[0_12px_20px_rgba(249,115,22,0.2)]";

  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 p-6">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_8%_4%,rgba(255,157,66,0.2),transparent_38%),radial-gradient(circle_at_92%_8%,rgba(96,165,250,0.18),transparent_38%),radial-gradient(circle_at_50%_120%,rgba(139,92,246,0.09),transparent_48%),linear-gradient(180deg,#fcfcff_0%,#f6f8ff_45%,#edf2ff_100%)]" />
      <div className="hex-honeycomb-bg pointer-events-none fixed inset-0 z-0 opacity-[0.1] [mask-image:linear-gradient(180deg,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0.1)_36%,rgba(0,0,0,0.02)_100%)]" />
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute left-[5%] top-[20%] h-[220px] w-[260px] opacity-72">
          <div className="hex-node absolute left-0 top-8 h-14 w-14 border border-[#b788ff]/70 bg-[#6E44FF]/18" />
          <div className="hex-node absolute left-14 top-0 h-20 w-20 border border-[#c79bff]/80 bg-[#8d63ff]/24" />
          <div className="hex-node absolute left-30 top-12 h-14 w-14 border border-[#d2adff]/85 bg-[#a374ff]/26" />
        </div>
        <div className="absolute right-[6%] top-[58%] h-[230px] w-[280px] opacity-72">
          <div className="hex-node absolute left-4 top-4 h-16 w-16 border border-[#b788ff]/70 bg-[#6E44FF]/18" />
          <div className="hex-node absolute left-24 top-0 h-20 w-20 border border-[#c79bff]/80 bg-[#8d63ff]/24" />
          <div className="hex-node absolute left-44 top-14 h-14 w-14 border border-[#d2adff]/85 bg-[#a374ff]/26" />
        </div>
      </div>

      <AdvisorAreaHeader active="advisors" />

      <section className="relative z-10 overflow-hidden rounded-3xl border border-zinc-200/85 bg-white/95 p-5 shadow-[0_20px_44px_rgba(15,23,42,0.1)] backdrop-blur-xl md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-300/45 bg-orange-200/45 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-orange-800">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-300/35 text-orange-800">
                <UsersIcon className="h-3.5 w-3.5" />
              </span>
              Wachstumsbereich
            </span>
            <h1 className="text-2xl font-semibold text-zinc-900 md:text-3xl">
              Empfehlungsprogramm für Berater
            </h1>
            <p className="text-sm text-zinc-700 md:text-base">
              Laden Sie neue Berater ein und profitieren Sie von Freimonaten und
              attraktiven Vorteilen.
            </p>
          </div>

          <div className="rounded-2xl border border-orange-200/65 bg-orange-50/92 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-orange-700">
              <SparklesIcon className="h-4 w-4" />
              Aktueller Vorteil aus Berater-Empfehlungen
            </p>
            <p className="mt-1 max-w-xs text-sm font-medium text-zinc-800">
              {currentBenefit}
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              Erfolgreich geworbene Berater: {successfulCount}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href="/berater/dashboard"
            className="inline-flex items-center gap-2 text-sm text-orange-700 underline decoration-orange-300/60 underline-offset-4 transition-all duration-300 hover:text-orange-900 hover:decoration-orange-500/90"
          >
            Zurück zum Dashboard
          </Link>
          <Link
            href="/berater/empfehlungen"
            className="group inline-flex items-center gap-1 text-sm text-orange-700 underline decoration-orange-300/60 underline-offset-4 transition-all duration-300 hover:text-orange-900 hover:decoration-orange-500/90"
          >
            Zu Empfehlungen
            <ArrowUpRightIcon className="h-3.5 w-3.5 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </section>

      <section className="relative z-10 overflow-hidden rounded-3xl border border-zinc-200/85 bg-white/95 p-4 shadow-[0_20px_44px_rgba(15,23,42,0.1)] backdrop-blur-xl md:p-5">
      <div className="space-y-4">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className={panelClass}>
          <p className="text-xs font-medium uppercase tracking-wide text-orange-700">
            Erfolgreich geworbene Berater
          </p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">{successfulCount}</p>
        </article>
        <article className={panelClass}>
          <p className="text-xs font-medium uppercase tracking-wide text-orange-700">
            Nächstes Ziel
          </p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">
            {nextGoal > 0 ? nextGoal : 0}
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            {nextGoal > 0
              ? `Noch ${nextGoal} erfolgreiche Berater-Empfehlungen bis 50 % Lifetime Rabatt`
              : "Top: Höchste Vorteil-Stufe erreicht"}
          </p>
        </article>
        <article className={panelClass}>
          <p className="text-xs font-medium uppercase tracking-wide text-orange-700">
            Eigener Beraterstatus
          </p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">
            {isActive ? "Aktiv" : "Inaktiv"}
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            {accountActivatedAt
              ? `Aktiv seit ${new Date(accountActivatedAt).toLocaleDateString("de-DE")}`
              : "Noch kein Aktivierungsdatum gesetzt"}
          </p>
        </article>
        <article className={panelClass}>
          <p className="text-xs font-medium uppercase tracking-wide text-orange-700">
            Empfehler-Freigabe
          </p>
          <p className="mt-2 text-sm font-semibold text-zinc-900">
            {autoActivateReferrers ? "Automatisch" : "Manuell"}
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            {autoActivateReferrers
              ? "Neue Empfehler werden direkt aktiviert."
              : "Neue Empfehler warten auf Ihre Freigabe."}
          </p>
        </article>
      </section>

      <section className={panelClass}>
        <h2 className="inline-flex items-center gap-2.5 text-lg font-semibold text-zinc-900">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-orange-300/45 bg-orange-100/80 text-orange-700">
            <GiftIcon className="h-4 w-4" />
          </span>
          Programmvorteile
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-zinc-700">
          <li>• Für 1 bis 9 erfolgreiche Berater-Empfehlungen erhalten Sie jeweils 1 Gratismonat.</li>
          <li>• Ab 10 erfolgreichen Berater-Empfehlungen erhalten Sie 50 % Lifetime Rabatt auf Ihr Monatsabo.</li>
          <li>• Geworbene Berater erhalten 100 € Rabatt auf die Einrichtungsgebühr.</li>
        </ul>
      </section>

      <section className={panelClass}>
        <h2 className="inline-flex items-center gap-2.5 text-lg font-semibold text-zinc-900">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-orange-300/45 bg-orange-100/80 text-orange-700">
            <BookIcon className="h-4 w-4" />
          </span>
          Link- und Code-Werkzeuge
        </h2>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <LinkToolCard
            title="Berater-Einladungslink"
            audienceLabel="Für neue Berater"
            helperText="Über diesen Link können sich neue Berater Ihrem Empfehlungsprogramm zuordnen."
            link={advisorInviteLink}
            code={advisorShareCode}
            icon={UsersIcon}
          />
          <LinkToolCard
            title="Empfehler-Einladungslink"
            audienceLabel="Für neue Empfehler"
            helperText="Über diesen Link registrieren sich neue Empfehler direkt Ihrem Konto zugeordnet."
            link={referrerInviteLink}
            code={referrerInviteCode ?? advisorContext.advisorSlug}
            icon={SparklesIcon}
          />
        </div>
      </section>

      <section className={panelClass}>
        <h2 className="inline-flex items-center gap-2.5 text-lg font-semibold text-zinc-900">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-orange-300/45 bg-orange-100/80 text-orange-700">
            <TrophyIcon className="h-4 w-4" />
          </span>
          Fortschritt bis zum Top-Vorteil
        </h2>
        <p className="mt-1 text-sm text-zinc-700">
          Aktueller Vorteil aus Berater-Empfehlungen:{" "}
          <span className="font-semibold text-zinc-900">{currentBenefit}</span>
        </p>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-orange-100">
          <div
            className="h-full rounded-full bg-orange-500 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-zinc-600">
          {Math.min(successfulCount, 10)} / 10 erfolgreiche Berater-Empfehlungen
        </p>
      </section>

      <section className="grid gap-4">
        <article className={panelClass}>
          <h3 className="text-sm font-semibold text-zinc-900">Empfehler-Freigabe</h3>
          <p className="mt-1 text-xs text-zinc-600">
            Empfehlung für Produktion: Manuelle Freigabe reduziert Spam und Missbrauch.
          </p>

          {params.settings === "1" ? (
            <p className="mt-3 rounded bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              Einstellung gespeichert.
            </p>
          ) : null}
          {params.settings === "0" ? (
            <p className="mt-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
              Einstellung konnte nicht gespeichert werden.
              {params.reason ? ` Grund: ${params.reason}` : ""}
            </p>
          ) : null}

          <form action={setReferrerActivationModeAction} className="mt-3 space-y-2">
            <input
              type="hidden"
              name="auto_activate_referrers"
              value={autoActivateReferrers ? "0" : "1"}
            />
            <button type="submit" className={buttonClass}>
              {autoActivateReferrers
                ? "Auf manuelle Freigabe umstellen"
                : "Auf automatische Aktivierung umstellen"}
            </button>
          </form>
        </article>
      </section>

      <section className="grid gap-4">
        <article className={panelClass}>
          <h3 className="text-sm font-semibold text-zinc-900">Vertragsstatus (eigener Berater)</h3>
          <p className="mt-1 text-xs text-zinc-600">
            Aktiv: <span className="font-semibold text-zinc-900">{isActive ? "Ja" : "Nein"}</span>
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            Aktiv seit:{" "}
            <span className="font-semibold text-zinc-900">
              {accountActivatedAt
                ? new Date(accountActivatedAt).toLocaleString("de-DE")
                : "-"}
            </span>
          </p>

          {params.activated === "1" ? (
            <p className="mt-3 rounded bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              Vertragsabschluss wurde gesetzt.
            </p>
          ) : null}
          {params.activated === "0" ? (
            <p className="mt-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
              Vertragsabschluss konnte nicht gesetzt werden.
            </p>
          ) : null}
          {params.reason && params.activated === "0" ? (
            <p className="mt-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
              Grund: {params.reason}
            </p>
          ) : null}

          <form action={markOwnContractActivatedAction} className="mt-3">
            <button type="submit" className={buttonClass}>
              Vertrag als abgeschlossen markieren (Test)
            </button>
          </form>
        </article>
      </section>

      <section className={panelClass}>
        <h3 className="text-sm font-semibold text-zinc-900">Neu geworbene Berater</h3>
        <p className="mt-1 text-xs text-zinc-600">
          Übersicht der erfolgreichen und aktiven Berater-Empfehlungen.
        </p>

        {successfulInvites.length > 0 ? (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {successfulInvites.slice(0, 9).map((invite) => (
              <li
                key={invite.id}
                className="rounded-xl border border-orange-200/55 bg-orange-50/70 px-3 py-2 text-sm text-zinc-800"
              >
                <p className="font-medium text-zinc-900">{invite.name || invite.slug}</p>
                <p className="text-xs text-zinc-600">Slug: {invite.slug}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-xl border border-orange-200/55 bg-orange-50/70 px-3 py-2 text-sm text-zinc-700">
            Noch keine erfolgreichen Berater-Empfehlungen vorhanden.
          </p>
        )}

        {loadError ? (
          <p className="mt-3 rounded bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
            Hinweis: Growth-Daten derzeit nicht vollständig verfügbar: {loadError}
          </p>
        ) : null}
      </section>
      </div>
      </section>
    </main>
  );
}

