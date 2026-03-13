import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdvisorContext } from "@/lib/auth/advisor";
import { normalizeSupabaseError } from "@/lib/supabase/errors";
import { getAdvisorActivationState } from "@/lib/queries/advisors";
import {
  markOwnContractActivatedAction,
  setLevelThresholdsAction,
  setPointsAwardModeAction,
  setReferrerActivationModeAction,
} from "@/app/dashboard/advisors/actions";

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
    points?: string;
    levels?: string;
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
        <h1 className="text-2xl font-semibold">Empfehlungsprogramm fuer Berater</h1>
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
  let autoAwardPointsOnClose = true;
  let defaultPointsOnClose = 100;
  let levelBronzePoints = 100;
  let levelSilverPoints = 200;
  let levelGoldPoints = 500;
  let levelPlatinumPoints = 1000;

  try {
    const { data: advisorCodesRow, error: advisorCodesError } = await supabase
      .from("advisors")
      .select("invite_code, advisor_referral_slug, referrer_invite_code")
      .eq("id", advisorContext.advisorId)
      .maybeSingle();

    if (advisorCodesError) {
      const code = (advisorCodesError as { code?: string }).code;
      if (code !== "PGRST204") {
        throw advisorCodesError;
      }
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
      .select(
        "auto_activate_referrers, auto_award_points_on_referral_close, points_per_successful_referral, level_bronze_points, level_silver_points, level_gold_points, level_platinum_points",
      )
      .eq("advisor_id", advisorContext.advisorId)
      .maybeSingle();

    if (settingsError) {
      const code = (settingsError as { code?: string }).code;
      if (code !== "PGRST204") {
        throw settingsError;
      }
    } else {
      autoActivateReferrers =
        (settingsRow as { auto_activate_referrers?: boolean } | null)
          ?.auto_activate_referrers ?? false;
      autoAwardPointsOnClose =
        (
          settingsRow as {
            auto_award_points_on_referral_close?: boolean;
          } | null
        )?.auto_award_points_on_referral_close ?? true;
      defaultPointsOnClose =
        (
          settingsRow as {
            points_per_successful_referral?: number;
          } | null
        )?.points_per_successful_referral ?? 100;
      levelBronzePoints =
        (
          settingsRow as {
            level_bronze_points?: number;
          } | null
        )?.level_bronze_points ?? 100;
      levelSilverPoints =
        (
          settingsRow as {
            level_silver_points?: number;
          } | null
        )?.level_silver_points ?? 200;
      levelGoldPoints =
        (
          settingsRow as {
            level_gold_points?: number;
          } | null
        )?.level_gold_points ?? 500;
      levelPlatinumPoints =
        (
          settingsRow as {
            level_platinum_points?: number;
          } | null
        )?.level_platinum_points ?? 1000;
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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Empfehlungsprogramm fuer Berater</h1>
        <p className="text-sm text-zinc-600">
          Berater-Einladungen und Empfehler-Einladungen verwalten.
        </p>
        <Link href="/berater/dashboard" className="text-sm text-zinc-800 underline">
          Zurueck zum Dashboard
        </Link>
      </header>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="text-sm font-medium text-zinc-900">Berater-Einladungslink</p>
        <p className="mt-1 break-all text-sm font-medium text-zinc-900">
          {advisorInviteLink}
        </p>
        <p className="mt-2 text-xs text-zinc-600">
          Dieser Link ist fuer neue Berater gedacht.
        </p>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="text-sm font-medium text-zinc-900">Empfehler-Einladungslink</p>
        <p className="mt-1 break-all text-sm font-medium text-zinc-900">
          {referrerInviteLink}
        </p>
        <p className="mt-2 text-xs text-zinc-600">
          Dieser Link ist fuer Personen gedacht, die als Empfehler fuer Sie aktiv werden.
        </p>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="text-sm font-medium text-zinc-900">Empfehler-Freigabe</p>
        <p className="mt-1 text-sm text-zinc-700">
          Aktueller Modus:{" "}
          <span className="font-semibold text-zinc-900">
            {autoActivateReferrers ? "Automatisch aktivieren" : "Manuelle Freigabe"}
          </span>
        </p>
        <p className="mt-2 text-xs text-zinc-600">
          Empfehlung fuer Produktion: Manuelle Freigabe, um Spam und Missbrauch zu
          reduzieren.
        </p>

        {params.settings === "1" ? (
          <p className="mt-2 rounded bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            Einstellung gespeichert.
          </p>
        ) : null}
        {params.settings === "0" ? (
          <p className="mt-2 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
            Einstellung konnte nicht gespeichert werden.
          </p>
        ) : null}

        <form action={setReferrerActivationModeAction} className="mt-3 flex gap-2">
          <input
            type="hidden"
            name="auto_activate_referrers"
            value={autoActivateReferrers ? "0" : "1"}
          />
          <button
            type="submit"
            className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900"
          >
            {autoActivateReferrers
              ? "Auf manuelle Freigabe umstellen"
              : "Auf automatische Aktivierung umstellen"}
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="text-sm font-medium text-zinc-900">Punktevergabe bei Abschluss</p>
        <p className="mt-1 text-sm text-zinc-700">
          Aktueller Modus:{" "}
          <span className="font-semibold text-zinc-900">
            {autoAwardPointsOnClose
              ? `Automatisch (${defaultPointsOnClose} Punkte)`
              : "Manuell"}
          </span>
        </p>
        {params.points === "1" ? (
          <p className="mt-2 rounded bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            Punkte-Modus gespeichert.
          </p>
        ) : null}
        <form action={setPointsAwardModeAction} className="mt-3 space-y-2">
          <input
            type="hidden"
            name="auto_award_points_on_referral_close"
            value={autoAwardPointsOnClose ? "0" : "1"}
          />
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Standardpunkte bei Abschluss
            <input
              type="number"
              name="points_per_successful_referral"
              min={1}
              defaultValue={defaultPointsOnClose}
              className="w-36 rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900"
            />
          </label>
          <button
            type="submit"
            className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900"
          >
            {autoAwardPointsOnClose
              ? "Auf manuelle Punktevergabe umstellen"
              : "Auf automatische Punktevergabe umstellen"}
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="text-sm font-medium text-zinc-900">Level-Schwellen fuer Empfehler</p>
        <p className="mt-1 text-sm text-zinc-700">
          Sie entscheiden individuell, ab welcher Punktzahl Bronze, Silber, Gold
          und Platin erreicht werden.
        </p>
        <p className="mt-2 text-xs text-zinc-600">
          Vor Bronze hat ein Empfehler keinen Titel.
        </p>

        {params.levels === "1" ? (
          <p className="mt-2 rounded bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            Level-Schwellen gespeichert.
          </p>
        ) : null}
        {params.levels === "0" ? (
          <p className="mt-2 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
            Level-Schwellen konnten nicht gespeichert werden.
            {params.reason ? ` Grund: ${params.reason}` : ""}
          </p>
        ) : null}

        <form action={setLevelThresholdsAction} className="mt-3 grid gap-3 sm:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Bronze ab
            <input
              type="number"
              name="level_bronze_points"
              min={1}
              defaultValue={levelBronzePoints}
              className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Silber ab
            <input
              type="number"
              name="level_silver_points"
              min={2}
              defaultValue={levelSilverPoints}
              className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Gold ab
            <input
              type="number"
              name="level_gold_points"
              min={2}
              defaultValue={levelGoldPoints}
              className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            Platin ab
            <input
              type="number"
              name="level_platinum_points"
              min={3}
              defaultValue={levelPlatinumPoints}
              className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900"
            />
          </label>
          <div className="sm:col-span-3">
            <button
              type="submit"
              className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900"
            >
              Level-Schwellen speichern
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="text-sm text-zinc-600">Vertragsstatus (eigener Berater)</p>
        <p className="mt-1 text-sm text-zinc-900">
          Aktiv: <span className="font-medium">{isActive ? "Ja" : "Nein"}</span>
        </p>
        <p className="mt-1 text-sm text-zinc-900">
          account_activated_at:{" "}
          <span className="font-medium">
            {accountActivatedAt
              ? new Date(accountActivatedAt).toLocaleString("de-DE")
              : "-"}
          </span>
        </p>

        {params.activated === "1" ? (
          <p className="mt-2 rounded bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            Vertragsabschluss wurde gesetzt.
          </p>
        ) : null}
        {params.activated === "0" ? (
          <p className="mt-2 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
            Vertragsabschluss konnte nicht gesetzt werden.
          </p>
        ) : null}
        {params.reason ? (
          <p className="mt-2 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
            Grund: {params.reason}
          </p>
        ) : null}

        <form action={markOwnContractActivatedAction} className="mt-3">
          <button
            type="submit"
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          >
            Vertrag als abgeschlossen markieren (Test)
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="text-sm text-zinc-600">
          Erfolgreiche Berater-Empfehlungen (aktiv):{" "}
          <span className="font-semibold text-zinc-900">
            {successfulInvites.length}
          </span>
        </p>
        {loadError ? (
          <p className="mt-2 rounded bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
            Hinweis: Growth-Daten derzeit nicht vollstaendig verfuegbar: {loadError}
          </p>
        ) : null}
      </section>
    </main>
  );
}
