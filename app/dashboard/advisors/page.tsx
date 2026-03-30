import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdvisorContext } from "@/lib/auth/advisor";
import { normalizeSupabaseError } from "@/lib/supabase/errors";
import { getAdvisorActivationState } from "@/lib/queries/advisors";
import {
  getAdvisorFreeMonthsState,
  grantOrdelyPromoMonthsIfEligible,
} from "@/lib/queries/billing";
import { LinkToolCard } from "@/app/components/link-tool-card";
import {
  ArrowUpRightIcon,
  BookIcon,
  GiftIcon,
  SparklesIcon,
  TrophyIcon,
  UsersIcon,
} from "@/app/empfehler/dashboard/components/icons";
import { AdvisorAreaHeader } from "@/app/berater/components/advisor-area-header";
import { buildWhatsAppShareUrlForFlow } from "@/lib/whatsapp/share";
import { InstagramInviteButton } from "@/app/components/instagram-invite-button";

type AdvisorGrowthRow = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

export default async function DashboardAdvisorsPage() {
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
  let advisorPromoCode: string | null = null;
  let referrerInviteCode: string | null = null;
  let accountActivatedAt: string | null = null;
  let isActive = false;
  let ordelyCooperationEnabled = false;
  let ordelyCooperationLockUntil: string | null = null;
  let qualifiedReferralCount = 0;
  let rewardedReferralCount = 0;
  let freeMonthsAvailable = 0;
  let freeMonthsEarnedTotal = 0;
  let freeMonthsReservedNextCycle = 0;
  let freeMonthsConsumedTotal = 0;
  let lifetimeDiscountState: "inactive" | "pending_next_cycle" | "active" = "inactive";
  let lifetimeDiscountPercent = 0;
  let lifetimeDiscountEffectiveFrom: string | null = null;

  try {
    const { data: advisorCodesRow, error: advisorCodesError } = await supabase
      .from("advisors")
      .select("invite_code, advisor_referral_slug, referrer_invite_code, advisor_promo_code, lifetime_discount_state, lifetime_discount_percent, lifetime_discount_effective_from")
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
        advisor_promo_code?: string | null;
        lifetime_discount_state?: "inactive" | "pending_next_cycle" | "active" | null;
        lifetime_discount_percent?: number | null;
        lifetime_discount_effective_from?: string | null;
      } | null;
      advisorInviteCode = row?.invite_code ?? null;
      advisorReferralSlug = row?.advisor_referral_slug ?? null;
      referrerInviteCode = row?.referrer_invite_code ?? null;
      advisorPromoCode = row?.advisor_promo_code ?? null;
      lifetimeDiscountState = row?.lifetime_discount_state ?? "inactive";
      lifetimeDiscountPercent = Number(row?.lifetime_discount_percent ?? 0);
      lifetimeDiscountEffectiveFrom = row?.lifetime_discount_effective_from ?? null;
    }

    const activationState = await getAdvisorActivationState(
      supabase,
      advisorContext.advisorId,
    );
    accountActivatedAt = activationState.account_activated_at;
    isActive = activationState.is_active;

    const { data: settingsRow, error: settingsError } = await supabase
      .from("advisor_settings")
      .select("ordely_cooperation_enabled, ordely_cooperation_lock_until")
      .eq("advisor_id", advisorContext.advisorId)
      .maybeSingle();

    if (settingsError) {
      const code = (settingsError as { code?: string }).code;
      if (code !== "PGRST204") throw settingsError;
    } else {
      ordelyCooperationEnabled =
        (settingsRow as { ordely_cooperation_enabled?: boolean } | null)
          ?.ordely_cooperation_enabled ?? false;
      ordelyCooperationLockUntil =
        (settingsRow as { ordely_cooperation_lock_until?: string | null } | null)
          ?.ordely_cooperation_lock_until ?? null;
    }

    if (ordelyCooperationEnabled) {
      await grantOrdelyPromoMonthsIfEligible(supabase, advisorContext.advisorId);
    }

    const { data: rows, error } = await supabase
      .from("advisors")
      .select("id, name, slug, is_active, referred_by_advisor_id")
      .eq("referred_by_advisor_id", advisorContext.advisorId)
      .eq("is_active", true);

    if (error) throw error;
    successfulInvites = (rows ?? []) as AdvisorGrowthRow[];

    const [{ data: qualificationRows, error: qualificationError }, freeMonthsState] =
      await Promise.all([
        supabase
          .from("advisor_referral_qualifications")
          .select("status, mode")
          .eq("inviter_advisor_id", advisorContext.advisorId),
        getAdvisorFreeMonthsState(supabase, advisorContext.advisorId),
      ]);

    if (qualificationError) throw qualificationError;

    const liveQualifications = (qualificationRows ?? []).filter(
      (row) => row.mode === "live",
    ) as Array<{ status: string; mode: string }>;
    qualifiedReferralCount = liveQualifications.filter((row) =>
      row.status === "qualified" || row.status === "rewarded",
    ).length;
    rewardedReferralCount = liveQualifications.filter(
      (row) => row.status === "rewarded",
    ).length;

    freeMonthsEarnedTotal = freeMonthsState.total_credited;
    freeMonthsConsumedTotal = freeMonthsState.consumed;
    freeMonthsReservedNextCycle = freeMonthsState.reserved_next_cycle;
    freeMonthsAvailable = freeMonthsState.available_now;
  } catch (error) {
    loadError = normalizeSupabaseError(error).message;
  }

  const appBase = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const advisorShareCode =
    advisorReferralSlug ?? advisorInviteCode ?? advisorContext.advisorSlug;
  const advisorInviteLink = `${appBase}/partner/${advisorShareCode}`;
  const referrerInviteLink = `${appBase}/empfehler/${referrerInviteCode ?? advisorContext.advisorSlug}`;
  const advisorToAdvisorWhatsAppUrl = buildWhatsAppShareUrlForFlow(
    "advisor_to_advisor",
    advisorInviteLink,
  );
  const advisorToReferrerWhatsAppUrl = buildWhatsAppShareUrlForFlow(
    "advisor_to_referrer",
    referrerInviteLink,
  );

  const successfulCount = successfulInvites.length;
  const nextGoal = qualifiedReferralCount < 10 ? 10 - qualifiedReferralCount : 0;
  const progressPercent = Math.min(
    100,
    Math.round((Math.min(successfulCount, 10) / 10) * 100),
  );
  const currentBenefit =
    qualifiedReferralCount >= 10
      ? "50 % Lifetime Rabatt auf Ihr Monatsabo"
      : freeMonthsAvailable >= 1
        ? `${freeMonthsAvailable} verfügbarer Gratismonat${freeMonthsAvailable === 1 ? "" : "e"}`
        : "Noch kein Vorteil erreicht";

  const panelClass =
    "relative z-10 rounded-2xl border border-orange-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]";
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
              Aktuelle Vorteile
            </p>
            <div className="mt-2 space-y-1.5 text-sm">
              <p className="text-zinc-800">
                Erhaltene Gratismonate offen:{" "}
                <span className="font-semibold text-zinc-900">{freeMonthsAvailable}</span>
              </p>
              {freeMonthsReservedNextCycle > 0 ? (
                <p className="text-zinc-700">
                  Vorgemerkt nächster Zeitraum:{" "}
                  <span className="font-semibold text-zinc-900">{freeMonthsReservedNextCycle}</span>
                </p>
              ) : null}
              <p className="text-zinc-700">
                Eingelöste Gratismonate:{" "}
                <span className="font-semibold text-zinc-900">{freeMonthsConsumedTotal}</span>
              </p>
              <p className="text-zinc-800">
                Lifetime-Rabatt:{" "}
                <span className="font-semibold text-zinc-900">
                  {lifetimeDiscountState === "active" ? "Aktiv" : "Inaktiv"}
                </span>
              </p>
            </div>
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
            Ordely-Kooperation
          </p>
          <p className="mt-2 text-lg font-semibold text-zinc-900">
            {ordelyCooperationEnabled ? "Aktiv" : "Inaktiv"}
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            {ordelyCooperationEnabled
              ? "2 Gratismonate aktiv. Hinweis wird im Empfehler-Dashboard angezeigt."
              : "Aktivieren Sie die Kooperation in Einstellungen für 2 Gratismonate."}
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            {ordelyCooperationEnabled && ordelyCooperationLockUntil
              ? `Bindend bis ${new Date(ordelyCooperationLockUntil).toLocaleDateString("de-DE")}`
              : "Status noch nicht aktiviert"}
          </p>
          {ordelyCooperationEnabled ? (
            <p className="mt-1 text-xs text-zinc-600">
              Ordely Code:{" "}
              <span className="font-semibold text-zinc-900">{advisorPromoCode || "REWARO50"}</span>
            </p>
          ) : null}
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

      <section className="relative overflow-hidden rounded-2xl border border-orange-300/65 bg-gradient-to-b from-orange-50/88 via-white to-white p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_14px_30px_rgba(249,115,22,0.09)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-400/0 via-orange-400/70 to-orange-400/0" />
        <h2 className="inline-flex items-center gap-2.5 text-lg font-semibold text-zinc-900">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-orange-300/45 bg-orange-100/80 text-orange-700">
            <BookIcon className="h-4 w-4" />
          </span>
          Recruiting-Links für Ihr Empfehlungsprogramm
        </h2>
        <p className="mt-2 rounded-xl border border-orange-200/75 bg-white/90 px-3 py-2 text-sm text-zinc-700">
          Diese beiden Links sind Ihr zentraler Hebel für Wachstum:
          neue Berater und neue Empfehler direkt Ihrem Programm zuordnen.
        </p>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <LinkToolCard
            title="Berater-Einladungslink"
            audienceLabel="Für neue Berater"
            helperText="Über diesen Link können sich neue Berater Ihrem Empfehlungsprogramm zuordnen."
            link={advisorInviteLink}
            showCode={false}
            whatsappShareUrl={advisorToAdvisorWhatsAppUrl}
            instagramAction={
              <InstagramInviteButton
                flow="advisor_to_advisor"
                inviteLink={advisorInviteLink}
                advisorName={advisorContext.advisorName}
                mode="advisor_story_and_dm"
                label="Über Instagram einladen"
                className="rounded border border-orange-300/55 bg-white px-3 py-1 text-xs font-medium text-orange-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-100 hover:text-orange-900 hover:ring-1 hover:ring-orange-400/70"
              />
            }
            icon={UsersIcon}
          />
          <LinkToolCard
            title="Empfehler-Einladungslink"
            audienceLabel="Für neue Empfehler"
            helperText="Über diesen Link registrieren sich neue Empfehler direkt Ihrem Konto zugeordnet."
            link={referrerInviteLink}
            showCode={false}
	            whatsappShareUrl={advisorToReferrerWhatsAppUrl}
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


