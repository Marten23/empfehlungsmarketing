import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentReferrerContext } from "@/lib/auth/referrer";
import { listReferralsForReferrer } from "@/lib/queries/referrals";
import { listPointsTransactionsForReferrer } from "@/lib/queries/points";
import {
  mapReferralStatusToUi,
  getAwardedPointsByReferral,
} from "@/app/empfehler/dashboard/gamification";
import { normalizeSupabaseError } from "@/lib/supabase/errors";
import {
  ArrowUpRightIcon,
  BookIcon,
  SparklesIcon,
  TrophyIcon,
  UsersIcon,
} from "@/app/empfehler/dashboard/components/icons";
import { ReferrerAreaHeader } from "@/app/empfehler/components/referrer-area-header";
import { getReferrerTheme } from "@/lib/ui/referrer-theme";

type ReferralRow = Awaited<ReturnType<typeof listReferralsForReferrer>>[number];

function getContactName(row: ReferralRow) {
  const fullName =
    row.contact_name ??
    [row.contact_first_name, row.contact_last_name].filter(Boolean).join(" ").trim();
  return fullName || "-";
}

function statusBadgeClass(statusLabel: string) {
  if (statusLabel === "erfolgreich") {
    return "bg-emerald-100 text-emerald-800 ring-emerald-200";
  }
  if (statusLabel === "abgelehnt") {
    return "bg-rose-100 text-rose-800 ring-rose-200";
  }
  if (statusLabel === "in Prüfung") {
    return "bg-amber-100 text-amber-800 ring-amber-200";
  }
  return "bg-cyan-100 text-cyan-800 ring-cyan-200";
}

export default async function ReferrerRecommendationsPage() {
  const supabase = await createClient();
  const referrerContext = await getCurrentReferrerContext(supabase);

  if (!referrerContext) {
    redirect("/empfehler/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profileThemeRow } = await supabase
    .from("profiles")
    .select("referrer_theme")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();
  const referrerTheme = getReferrerTheme(
    (profileThemeRow as { referrer_theme?: string | null } | null)?.referrer_theme,
  );

  let referrals: ReferralRow[] = [];
  let awardedPointsByReferral = new Map<string, number>();
  let loadError: string | null = null;

  try {
    referrals = await listReferralsForReferrer(
      supabase,
      referrerContext.advisorId,
      referrerContext.referrerId,
    );
    const pointsRows = await listPointsTransactionsForReferrer(
      supabase,
      referrerContext.advisorId,
      referrerContext.referrerId,
    );
    awardedPointsByReferral = getAwardedPointsByReferral(pointsRows);
  } catch (error) {
    loadError = normalizeSupabaseError(error).message;
  }

  const totalCount = referrals.length;
  const successfulCount = referrals.filter((row) => row.status === "abschluss").length;
  const rejectedCount = referrals.filter((row) => row.status === "abgelehnt").length;
  const openCount = Math.max(0, totalCount - successfulCount - rejectedCount);
  const lastSuccess = referrals.find((row) => row.status === "abschluss") ?? null;

  return (
    <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 p-4 pb-8 md:gap-5 md:p-6">
      <div className={`pointer-events-none fixed inset-0 z-0 ${referrerTheme.backgroundClass}`} />
      <div
        className={`${referrerTheme.honeycombClass} ${referrerTheme.honeycombOpacityClass} pointer-events-none fixed inset-0 z-0`}
      />
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute left-[4%] top-[18%] h-[220px] w-[260px] opacity-55">
          <div className="hex-node hex-pulse absolute left-0 top-6 h-14 w-14 border border-orange-300/30 bg-orange-300/10" />
          <div className="hex-node hex-pulse absolute left-14 top-0 h-20 w-20 border border-sky-300/35 bg-sky-300/14 [animation-delay:1.1s]" />
          <div className="hex-node hex-pulse absolute left-28 top-10 h-14 w-14 border border-orange-300/26 bg-orange-200/12 [animation-delay:2s]" />
          <div className="hex-node hex-pulse absolute left-9 top-20 h-16 w-16 border border-orange-300/25 bg-orange-300/8 [animation-delay:2.7s]" />
        </div>
        <div className="absolute right-[5%] top-[56%] h-[240px] w-[300px] opacity-55">
          <div className="hex-node hex-pulse absolute left-6 top-4 h-16 w-16 border border-orange-300/26 bg-orange-300/8 [animation-delay:0.8s]" />
          <div className="hex-node hex-pulse absolute left-24 top-0 h-20 w-20 border border-sky-300/35 bg-sky-300/12 [animation-delay:1.6s]" />
          <div className="hex-node hex-pulse absolute left-46 top-12 h-14 w-14 border border-orange-300/26 bg-orange-200/12 [animation-delay:2.4s]" />
          <div className="hex-node hex-pulse absolute left-16 top-24 h-16 w-16 border border-orange-300/24 bg-orange-300/8 [animation-delay:3.2s]" />
        </div>
      </div>

      <ReferrerAreaHeader active="empfehlungen" />

      <section className="relative z-10 overflow-hidden rounded-3xl border border-zinc-200/85 bg-white/95 p-5 shadow-[0_20px_44px_rgba(15,23,42,0.1)] backdrop-blur-xl md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-300/45 bg-orange-200/45 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-orange-800">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-300/35 text-orange-800">
                <UsersIcon className="h-3.5 w-3.5" />
              </span>
              EmpfehlungsÜbersicht
            </span>
            <h1 className="text-2xl font-semibold text-zinc-900 md:text-3xl">Deine Empfehlungen</h1>
            <p className="text-sm text-zinc-700 md:text-base">
              Hier siehst du alle Kontakte, die du empfohlen hast, und ihren aktuellen Status.
            </p>
          </div>

          <div className="rounded-2xl border border-orange-200/65 bg-orange-50/92 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-orange-700">
              <SparklesIcon className="h-4 w-4" />
              Letzter Erfolg
            </p>
            <p className="mt-1 max-w-xs text-sm font-medium text-zinc-800">
              {lastSuccess ? getContactName(lastSuccess) : "Noch kein erfolgreicher Abschluss"}
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              {lastSuccess
                ? new Date(lastSuccess.created_at).toLocaleString("de-DE")
                : "Sobald ein Kontakt den Status 'erfolgreich' erreicht."}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href="/empfehler/dashboard"
            className="inline-flex items-center gap-2 text-sm text-orange-700 underline decoration-orange-300/60 underline-offset-4 transition-all duration-300 hover:text-orange-900 hover:decoration-orange-500/90"
          >
            Zurück zum Dashboard
          </Link>
          <Link
            href="/empfehler/punktekonto"
            className="group inline-flex items-center gap-1 text-sm text-orange-700 underline decoration-orange-300/60 underline-offset-4 transition-all duration-300 hover:text-orange-900 hover:decoration-orange-500/90"
          >
            Zum Punktekonto
            <ArrowUpRightIcon className="h-3.5 w-3.5 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
          <Link
            href="/empfehler/praemien"
            className="group inline-flex items-center gap-1 text-sm text-orange-700 underline decoration-orange-300/60 underline-offset-4 transition-all duration-300 hover:text-orange-900 hover:decoration-orange-500/90"
          >
            Zu den Prämien
            <ArrowUpRightIcon className="h-3.5 w-3.5 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </section>

      <section className="relative z-10 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-orange-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
          <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-orange-700">
            <BookIcon className="h-4 w-4" />
            Alle Empfehlungen
          </p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">{totalCount}</p>
        </article>
        <article className="rounded-2xl border border-orange-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
          <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-orange-700">
            <TrophyIcon className="h-4 w-4" />
            Erfolgreich
          </p>
          <p className="mt-2 text-3xl font-semibold text-emerald-700">{successfulCount}</p>
        </article>
        <article className="rounded-2xl border border-orange-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
          <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-orange-700">
            <UsersIcon className="h-4 w-4" />
            Offen
          </p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">{openCount}</p>
        </article>
      </section>

      {loadError ? (
        <p className="rounded-xl border border-rose-300/70 bg-rose-50/95 px-3 py-2 text-sm text-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          Daten konnten nicht vollständig geladen werden: {loadError}
        </p>
      ) : null}

      <section className="relative z-10 rounded-2xl border border-orange-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="inline-flex items-center gap-2.5 text-lg font-semibold text-zinc-900">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-orange-300/45 bg-orange-100/80 text-orange-700">
              <UsersIcon className="h-4 w-4" />
            </span>
            Vollständige Empfehlungsübersicht
          </h2>
          <span className="text-xs text-zinc-600">{referrals.length} Einträge</span>
        </div>

        <div className="max-h-[620px] overflow-auto rounded-xl border border-orange-100/80 bg-orange-50/65">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-orange-100/90 text-left text-zinc-600 backdrop-blur">
              <tr>
                <th className="px-3 py-2">Empfohlene Person</th>
                <th className="px-3 py-2">Datum</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Erhaltene Punkte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-100">
              {referrals.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-zinc-500">
                    Noch keine Empfehlungen vorhanden.
                  </td>
                </tr>
              ) : (
                referrals.map((row) => {
                  const statusLabel = mapReferralStatusToUi(row.status);
                  const awarded = awardedPointsByReferral.get(row.id) ?? null;
                  return (
                    <tr
                      key={row.id}
                      className="transition-colors duration-200 hover:bg-orange-100/65"
                    >
                      <td className="px-3 py-2 text-zinc-900">{getContactName(row)}</td>
                      <td className="px-3 py-2 text-zinc-600">
                        {new Date(row.created_at).toLocaleString("de-DE")}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ring-1 ${statusBadgeClass(statusLabel)}`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-zinc-700">
                        {awarded !== null ? (
                          <span className="font-semibold text-emerald-700">+{awarded}</span>
                        ) : row.status === "abschluss" ? (
                          <span className="text-zinc-500">in Bearbeitung</span>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}


