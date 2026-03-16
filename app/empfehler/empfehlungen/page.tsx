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
    <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 p-6">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_15%_0%,rgba(126,87,255,0.24),transparent_34%),radial-gradient(circle_at_85%_8%,rgba(159,124,255,0.2),transparent_32%),linear-gradient(180deg,#150d24_0%,#120a1f_100%)]" />
      <div className="hex-honeycomb-bg pointer-events-none fixed inset-0 z-0 opacity-22" />
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute left-[4%] top-[18%] h-[220px] w-[260px] opacity-55">
          <div className="hex-node hex-pulse absolute left-0 top-6 h-14 w-14 border border-violet-300/30 bg-violet-300/10" />
          <div className="hex-node hex-pulse absolute left-14 top-0 h-20 w-20 border border-[#9F7CFF]/45 bg-[#6E44FF]/18 [animation-delay:1.1s]" />
          <div className="hex-node hex-pulse absolute left-28 top-10 h-14 w-14 border border-violet-300/26 bg-violet-200/12 [animation-delay:2s]" />
          <div className="hex-node hex-pulse absolute left-9 top-20 h-16 w-16 border border-violet-300/25 bg-violet-300/8 [animation-delay:2.7s]" />
        </div>
        <div className="absolute right-[5%] top-[56%] h-[240px] w-[300px] opacity-55">
          <div className="hex-node hex-pulse absolute left-6 top-4 h-16 w-16 border border-violet-300/26 bg-violet-300/8 [animation-delay:0.8s]" />
          <div className="hex-node hex-pulse absolute left-24 top-0 h-20 w-20 border border-[#9F7CFF]/45 bg-[#6E44FF]/16 [animation-delay:1.6s]" />
          <div className="hex-node hex-pulse absolute left-46 top-12 h-14 w-14 border border-violet-300/26 bg-violet-200/12 [animation-delay:2.4s]" />
          <div className="hex-node hex-pulse absolute left-16 top-24 h-16 w-16 border border-violet-300/24 bg-violet-300/8 [animation-delay:3.2s]" />
        </div>
      </div>

      <section className="relative z-10 overflow-hidden rounded-3xl border border-violet-200/55 bg-violet-50/88 p-5 shadow-[0_24px_60px_rgba(5,3,12,0.38)] backdrop-blur-xl md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-300/45 bg-violet-200/45 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-violet-800">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-300/35 text-violet-800">
                <UsersIcon className="h-3.5 w-3.5" />
              </span>
              Empfehlungsübersicht
            </span>
            <h1 className="text-2xl font-semibold text-zinc-900 md:text-3xl">Deine Empfehlungen</h1>
            <p className="text-sm text-zinc-700 md:text-base">
              Hier siehst du alle Kontakte, die du empfohlen hast, und ihren aktuellen Status.
            </p>
          </div>

          <div className="rounded-2xl border border-violet-200/65 bg-violet-50/92 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-violet-700">
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
            className="inline-flex items-center gap-2 text-sm text-violet-700 underline decoration-violet-300/60 underline-offset-4 transition-all duration-300 hover:text-violet-900 hover:decoration-violet-500/90"
          >
            Zurück zum Dashboard
          </Link>
          <Link
            href="/empfehler/punktekonto"
            className="group inline-flex items-center gap-1 text-sm text-violet-700 underline decoration-violet-300/60 underline-offset-4 transition-all duration-300 hover:text-violet-900 hover:decoration-violet-500/90"
          >
            Zum Punktekonto
            <ArrowUpRightIcon className="h-3.5 w-3.5 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
          <Link
            href="/empfehler/praemien"
            className="group inline-flex items-center gap-1 text-sm text-violet-700 underline decoration-violet-300/60 underline-offset-4 transition-all duration-300 hover:text-violet-900 hover:decoration-violet-500/90"
          >
            Zu den Prämien
            <ArrowUpRightIcon className="h-3.5 w-3.5 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </section>

      <section className="relative z-10 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-violet-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
          <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-violet-700">
            <BookIcon className="h-4 w-4" />
            Alle Empfehlungen
          </p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">{totalCount}</p>
        </article>
        <article className="rounded-2xl border border-violet-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
          <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-violet-700">
            <TrophyIcon className="h-4 w-4" />
            Erfolgreich
          </p>
          <p className="mt-2 text-3xl font-semibold text-emerald-700">{successfulCount}</p>
        </article>
        <article className="rounded-2xl border border-violet-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
          <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-violet-700">
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

      <section className="relative z-10 rounded-2xl border border-violet-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="inline-flex items-center gap-2.5 text-lg font-semibold text-zinc-900">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-violet-300/45 bg-violet-100/80 text-violet-700">
              <UsersIcon className="h-4 w-4" />
            </span>
            Vollständige Empfehlungsübersicht
          </h2>
          <span className="text-xs text-zinc-600">{referrals.length} Einträge</span>
        </div>

        <div className="max-h-[620px] overflow-auto rounded-xl border border-violet-100/80 bg-violet-50/65">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-violet-100/90 text-left text-zinc-600 backdrop-blur">
              <tr>
                <th className="px-3 py-2">Empfohlene Person</th>
                <th className="px-3 py-2">Datum</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Erhaltene Punkte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-100">
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
                      className="transition-colors duration-200 hover:bg-violet-100/65"
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

