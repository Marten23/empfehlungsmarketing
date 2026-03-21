import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdvisorContext } from "@/lib/auth/advisor";
import { listDashboardReferrals } from "@/lib/queries/referrals";
import { listReferrersForAdvisor } from "@/lib/queries/referrers";
import { listRewardRedemptionsForAdvisor } from "@/lib/queries/rewards";
import { normalizeSupabaseError } from "@/lib/supabase/errors";
import {
  ArrowUpRightIcon,
  BoltIcon,
  TrophyIcon,
  UsersIcon,
} from "@/app/empfehler/dashboard/components/icons";
import { AdvisorAreaHeader } from "@/app/berater/components/advisor-area-header";
import { PodiumRanklist } from "@/app/empfehler/dashboard/components/podium-ranklist";

type LeaderboardEntry = {
  referrerId: string;
  name: string;
  points: number;
  avatarUrl: string | null;
};

function formatReferrerName(firstName: string, lastName: string) {
  const cleanFirst = firstName.trim() || "Empfehler";
  const cleanLast = lastName.trim();
  if (!cleanLast) return cleanFirst;
  return `${cleanFirst} ${cleanLast[0]}.`;
}

function getReferralName(
  row: Awaited<ReturnType<typeof listDashboardReferrals>>[number],
) {
  const fallbackName = [row.contact_first_name, row.contact_last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return row.contact_name ?? (fallbackName || "Unbekannter Kontakt");
}

function statusBadgeClass(status: string) {
  if (status === "abschluss") return "bg-emerald-100 text-emerald-800 ring-emerald-200";
  if (status === "abgelehnt") return "bg-rose-100 text-rose-800 ring-rose-200";
  if (status === "kontaktiert" || status === "termin") {
    return "bg-amber-100 text-amber-800 ring-amber-200";
  }
  return "bg-cyan-100 text-cyan-800 ring-cyan-200";
}

function statusLabel(status: string) {
  if (status === "neu") return "eingereicht";
  if (status === "kontaktiert" || status === "termin") return "in Prüfung";
  if (status === "abschluss") return "erfolgreich";
  if (status === "abgelehnt") return "abgelehnt";
  return status;
}

export default async function DashboardPage() {

  let referralCount = 0;
  let openCount = 0;
  let closingCount = 0;
  let activeReferrerCount = 0;
  let pendingReferrerCount = 0;
  let openRedemptionCount = 0;
  let advisorContext: Awaited<ReturnType<typeof getCurrentAdvisorContext>> = null;
  let latestReferrals: Awaited<ReturnType<typeof listDashboardReferrals>> = [];
  let latestOpenRedemptions: Awaited<
    ReturnType<typeof listRewardRedemptionsForAdvisor>
  > = [];
  let leaderboard: LeaderboardEntry[] = [];
  let loadError: string | null = null;

  try {
    advisorContext = await getCurrentAdvisorContext();
    if (advisorContext) {
      const supabase = await createClient();
      const rows = await listDashboardReferrals(supabase, advisorContext.advisorId);
      referralCount = rows.length;
      openCount = rows.filter((row) =>
        row.status === "neu" || row.status === "kontaktiert" || row.status === "termin",
      ).length;
      closingCount = rows.filter((row) => row.status === "abschluss").length;
      latestReferrals = rows.slice(0, 5);

      const referrerRows = await listReferrersForAdvisor(
        supabase,
        advisorContext.advisorId,
      );
      pendingReferrerCount = referrerRows.filter((row) => !row.is_active).length;
      activeReferrerCount = referrerRows.filter((row) => row.is_active).length;

      const pointsByReferrer = new Map<string, number>();
      const { data: allPointsRows, error: allPointsError } = await supabase
        .from("points_transactions")
        .select("referrer_id, points")
        .eq("advisor_id", advisorContext.advisorId);
      if (allPointsError) throw allPointsError;

      for (const row of allPointsRows ?? []) {
        const referrerId = String(row.referrer_id ?? "");
        if (!referrerId) continue;
        const points = Number(row.points ?? 0);
        if (points <= 0) continue;
        pointsByReferrer.set(referrerId, (pointsByReferrer.get(referrerId) ?? 0) + points);
      }

      const profileIds = referrerRows
        .map((row) => row.user_id)
        .filter((value): value is string => Boolean(value));
      const avatarByUserId = new Map<string, string | null>();
      if (profileIds.length > 0) {
        const { data: profileRows } = await supabase
          .from("profiles")
          .select("user_id, avatar_url")
          .in("user_id", profileIds);
        for (const row of (profileRows ?? []) as Array<{ user_id: string; avatar_url: string | null }>) {
          avatarByUserId.set(row.user_id, row.avatar_url ?? null);
        }
      }

      leaderboard = referrerRows
        .filter((row) => row.is_active || row.id)
        .map((row) => ({
          referrerId: row.id,
          name: formatReferrerName(row.first_name, row.last_name),
          points: pointsByReferrer.get(row.id) ?? 0,
          avatarUrl: row.user_id ? (avatarByUserId.get(row.user_id) ?? null) : null,
        }))
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          return a.name.localeCompare(b.name, "de-DE");
        });

      const redemptions = await listRewardRedemptionsForAdvisor(
        supabase,
        advisorContext.advisorId,
      );
      const openRedemptions = redemptions.filter((row) => row.status === "offen");
      openRedemptionCount = openRedemptions.length;
      latestOpenRedemptions = openRedemptions.slice(0, 5);
    }
  } catch (error) {
    loadError = normalizeSupabaseError(error).message;
  }

  return (
    <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 p-6">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_35%,rgba(170,130,255,0.16),transparent_52%),radial-gradient(circle_at_15%_0%,rgba(126,87,255,0.26),transparent_42%),radial-gradient(circle_at_85%_8%,rgba(159,124,255,0.2),transparent_40%),linear-gradient(180deg,#1b1230_0%,#140d26_100%)]" />
      <div className="hex-honeycomb-bg pointer-events-none fixed inset-0 z-0 opacity-24" />
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

      <AdvisorAreaHeader active="dashboard" />

      <section className="relative z-10 overflow-hidden rounded-3xl border border-violet-200/50 bg-violet-50/86 p-5 shadow-[0_24px_60px_rgba(5,3,12,0.36)] backdrop-blur-xl md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-300/45 bg-violet-200/45 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-violet-800">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-300/35 text-violet-800">
                <BoltIcon className="h-3.5 w-3.5" />
              </span>
              Beraterbereich
            </span>
            <h1 className="text-2xl font-semibold text-zinc-900 md:text-3xl">Ihr Berater-Cockpit</h1>
            <p className="text-sm text-zinc-700 md:text-base">
              Behalten Sie Empfehlungen, Empfehler, Prämien und Einlösungen im Blick.
            </p>
            <p className="text-xs text-zinc-600">
              {advisorContext?.advisorName
                ? `Bereich: ${advisorContext.advisorName}`
                : "Bereich wird geladen"}
            </p>
          </div>

        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-violet-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
            <p className="text-xs font-medium uppercase tracking-wide text-violet-700">Offene Empfehlungen</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-900">{openCount}</p>
          </article>
          <article className="rounded-2xl border border-violet-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
            <p className="text-xs font-medium uppercase tracking-wide text-violet-700">Erfolgreiche Empfehlungen</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-700">{closingCount}</p>
          </article>
          <article className="rounded-2xl border border-violet-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
            <p className="text-xs font-medium uppercase tracking-wide text-violet-700">Aktive Empfehler</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-900">{activeReferrerCount}</p>
          </article>
          <article className="rounded-2xl border border-violet-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
            <p className="text-xs font-medium uppercase tracking-wide text-violet-700">Offene Einlösungen</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-900">{openRedemptionCount}</p>
          </article>
        </div>
      </section>

      {loadError ? (
        <p className="rounded-xl border border-rose-300/70 bg-rose-50/95 px-3 py-2 text-sm text-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          Dashboard konnte nicht vollständig geladen werden: {loadError}
        </p>
      ) : null}

      {pendingReferrerCount > 0 ? (
        <section className="relative z-10 rounded-2xl border border-amber-300/70 bg-amber-50/95 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-amber-900">
              {pendingReferrerCount} neue Empfehler warten auf Freigabe.
            </p>
            <Link
              href="/berater/dashboard/referrers"
              className="inline-flex items-center gap-1 text-sm font-medium text-amber-900 underline decoration-amber-400/70 underline-offset-4 transition-colors hover:text-amber-950"
            >
              Jetzt freigeben
              <ArrowUpRightIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      ) : null}

      <section className="relative z-10 overflow-hidden rounded-3xl border border-violet-200/50 bg-violet-50/86 p-4 shadow-[0_24px_60px_rgba(5,3,12,0.36)] backdrop-blur-xl md:p-5">
        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-3xl border border-amber-200/35 bg-[radial-gradient(circle_at_50%_0%,rgba(255,230,170,0.18),transparent_42%),linear-gradient(165deg,rgba(34,28,22,0.95),rgba(17,14,12,0.96))] p-3 shadow-[inset_0_1px_0_rgba(255,240,210,0.14),0_24px_46px_rgba(10,8,6,0.58)] md:p-4">
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-b-2xl rounded-t-xl border border-amber-300/35 bg-[linear-gradient(180deg,rgba(253,214,135,0.95),rgba(228,172,69,0.94))] px-4 py-1.5 shadow-[0_10px_24px_rgba(188,132,40,0.33)]">
                <TrophyIcon className="h-4 w-4 text-white" />
                <span className="text-xs font-semibold tracking-[0.2em] text-amber-950">
                  RANGLISTE DEINER EMPFEHLER
                </span>
              </div>
            </div>
            <div className="mt-3">
              <PodiumRanklist
                entries={leaderboard}
                backMode="all"
                backTitle="Alle Empfehler"
              />
            </div>
          </div>

          <div className="grid gap-4">
            <article className="rounded-2xl border border-violet-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="inline-flex items-center gap-2.5 text-lg font-semibold text-zinc-900">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-violet-300/45 bg-violet-100/80 text-violet-700">
                    <UsersIcon className="h-4 w-4" />
                  </span>
                  Neueste Empfehlungen
                </h2>
                <Link
                  href="/berater/empfehlungen"
                  className="group inline-flex items-center gap-1 text-sm text-violet-700 underline decoration-violet-300/60 underline-offset-4 transition-colors hover:text-violet-900"
                >
                  Alle ansehen
                  <ArrowUpRightIcon className="h-3.5 w-3.5 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </div>
              <div className="max-h-[240px] overflow-auto rounded-xl border border-violet-100/80 bg-violet-50/65">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-violet-100/90 text-left text-zinc-600 backdrop-blur">
                    <tr>
                      <th className="px-3 py-2">Kontakt</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2 text-right">Punkte</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-violet-100">
                    {latestReferrals.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-6 text-zinc-500">
                          Noch keine Empfehlungen vorhanden.
                        </td>
                      </tr>
                    ) : (
                      latestReferrals.map((row) => (
                        <tr key={row.id} className="transition-colors duration-200 hover:bg-violet-100/65">
                          <td className="px-3 py-2 text-zinc-900">{getReferralName(row)}</td>
                          <td className="px-3 py-2">
                            <span className={`rounded px-2 py-0.5 text-xs font-medium ring-1 ${statusBadgeClass(row.status)}`}>
                              {statusLabel(row.status)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            {row.awarded_points !== null ? (
                              <span className="font-semibold text-emerald-700">+{row.awarded_points}</span>
                            ) : (
                              <span className="text-zinc-500">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="rounded-2xl border border-violet-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="inline-flex items-center gap-2.5 text-lg font-semibold text-zinc-900">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-violet-300/45 bg-violet-100/80 text-violet-700">
                    <TrophyIcon className="h-4 w-4" />
                  </span>
                  Offene Einlösungen
                </h2>
                <Link
                  href="/berater/praemien"
                  className="group inline-flex items-center gap-1 text-sm text-violet-700 underline decoration-violet-300/60 underline-offset-4 transition-colors hover:text-violet-900"
                >
                  Zu Prämien & Einlösungen
                  <ArrowUpRightIcon className="h-3.5 w-3.5 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </div>
              <div className="max-h-[240px] overflow-auto rounded-xl border border-violet-100/80 bg-violet-50/65">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-violet-100/90 text-left text-zinc-600 backdrop-blur">
                    <tr>
                      <th className="px-3 py-2">Empfehler</th>
                      <th className="px-3 py-2">Prämie</th>
                      <th className="px-3 py-2 text-right">Punkte</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-violet-100">
                    {latestOpenRedemptions.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-6 text-zinc-500">
                          Keine offenen Einlösungen.
                        </td>
                      </tr>
                    ) : (
                      latestOpenRedemptions.map((row) => {
                        const referrerName = row.referrer
                          ? `${row.referrer.first_name} ${row.referrer.last_name}`.trim()
                          : "-";
                        const rewardName =
                          row.reward?.title || row.reward?.name || "Unbekannte Prämie";
                        return (
                          <tr key={row.id} className="transition-colors duration-200 hover:bg-violet-100/65">
                            <td className="px-3 py-2 text-zinc-900">{referrerName || "-"}</td>
                            <td className="px-3 py-2 text-zinc-700">{rewardName}</td>
                            <td className="px-3 py-2 text-right font-semibold text-zinc-900">
                              {row.requested_points_cost}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </div>
        </div>
      </section>

      <p className="relative z-10 text-xs text-zinc-300/90">
        Gesamt Empfehlungen: {referralCount}
      </p>
    </div>
  );
}

