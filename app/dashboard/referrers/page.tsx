import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdvisorContext } from "@/lib/auth/advisor";
import { listReferrersForAdvisor } from "@/lib/queries/referrers";
import { listDashboardReferrals } from "@/lib/queries/referrals";
import { normalizeSupabaseError } from "@/lib/supabase/errors";
import { CopyLinkButton } from "@/app/dashboard/referrers/copy-link-button";
import { approveReferrerAction } from "@/app/dashboard/referrers/actions";
import {
  ArrowUpRightIcon,
  BookIcon,
  SparklesIcon,
  UsersIcon,
} from "@/app/empfehler/dashboard/components/icons";
import { AdvisorAreaHeader } from "@/app/berater/components/advisor-area-header";

function getDisplayName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}

type DashboardReferrersPageProps = {
  searchParams: Promise<{ approved?: string; reason?: string }>;
};

export default async function DashboardReferrersPage({
  searchParams,
}: DashboardReferrersPageProps) {
  const params = await searchParams;
  const advisorContext = await getCurrentAdvisorContext();
  if (!advisorContext) {
    redirect("/berater/dashboard");
  }

  let loadError: string | null = null;
  let rows: Awaited<ReturnType<typeof listReferrersForAdvisor>> = [];
  const referralStatsByReferrer = new Map<
    string,
    { total: number; successful: number }
  >();
  const pointsByReferrer = new Map<string, number>();

  try {
    const supabase = await createClient();
    rows = await listReferrersForAdvisor(supabase, advisorContext.advisorId);

    const referralRows = await listDashboardReferrals(
      supabase,
      advisorContext.advisorId,
    );
    for (const referral of referralRows) {
      const prev = referralStatsByReferrer.get(referral.referrer_id) ?? {
        total: 0,
        successful: 0,
      };
      prev.total += 1;
      if (referral.status === "abschluss") prev.successful += 1;
      referralStatsByReferrer.set(referral.referrer_id, prev);
    }

    const { data: pointRows, error: pointsError } = await supabase
      .from("points_transactions")
      .select("referrer_id, points")
      .eq("advisor_id", advisorContext.advisorId);
    if (pointsError) throw pointsError;

    for (const row of pointRows ?? []) {
      const referrerId = (row as { referrer_id?: string | null }).referrer_id;
      const points = Number((row as { points?: number | null }).points ?? 0);
      if (!referrerId || !Number.isFinite(points)) continue;
      const prev = pointsByReferrer.get(referrerId) ?? 0;
      // "Gesammelte Punkte" = nur positive Gutschriften.
      pointsByReferrer.set(referrerId, prev + (points > 0 ? points : 0));
    }
  } catch (error) {
    loadError = normalizeSupabaseError(error).message;
  }

  const appBase = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const pendingCount = rows.filter((row) => !row.is_active).length;
  const activeCount = rows.filter((row) => row.is_active).length;
  const withSuccessCount = rows.filter((row) => {
    const stats = referralStatsByReferrer.get(row.id);
    return (stats?.successful ?? 0) > 0;
  }).length;
  const overallTotalReferrals = rows.reduce((sum, row) => {
    const stats = referralStatsByReferrer.get(row.id);
    return sum + (stats?.total ?? 0);
  }, 0);
  const overallSuccessfulReferrals = rows.reduce((sum, row) => {
    const stats = referralStatsByReferrer.get(row.id);
    return sum + (stats?.successful ?? 0);
  }, 0);
  const overallConversionRate =
    overallTotalReferrals > 0
      ? Math.round((overallSuccessfulReferrals / overallTotalReferrals) * 100)
      : 0;

  return (
    <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 p-6">
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

      <AdvisorAreaHeader active="referrers" />

      <section className="relative z-10 overflow-hidden rounded-3xl border border-zinc-200/85 bg-white/95 p-5 shadow-[0_20px_44px_rgba(15,23,42,0.1)] backdrop-blur-xl md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-300/45 bg-orange-200/45 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-orange-800">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-300/35 text-orange-800">
                <UsersIcon className="h-3.5 w-3.5" />
              </span>
              Empfehler-Verwaltung
            </span>
            <h1 className="text-2xl font-semibold text-zinc-900 md:text-3xl">Empfehler</h1>
            <p className="text-sm text-zinc-700 md:text-base">
              Verwalten Sie Ihre Empfehler und behalten Sie Aktivität,
              Empfehlungen und Status im Blick.
            </p>
          </div>

          <div className="rounded-2xl border border-orange-200/65 bg-orange-50/92 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-orange-700">
              <SparklesIcon className="h-4 w-4" />
              Hinweis
            </p>
            <p className="mt-1 max-w-xs text-sm text-zinc-700">
              Über den Kontakt-Empfehlungslink können Empfehler neue Kontakte
              direkt erfassen.
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

      <section className="relative z-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-2xl border border-orange-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
          <p className="text-xs font-medium uppercase tracking-wide text-orange-700">Empfehler gesamt</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">{rows.length}</p>
        </article>
        <article className="rounded-2xl border border-orange-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
          <p className="text-xs font-medium uppercase tracking-wide text-orange-700">Aktive Empfehler</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-700">{activeCount}</p>
        </article>
        <article className="rounded-2xl border border-orange-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
          <p className="text-xs font-medium uppercase tracking-wide text-orange-700">Neue Empfehler</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">{pendingCount}</p>
        </article>
        <article className="rounded-2xl border border-orange-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
          <p className="text-xs font-medium uppercase tracking-wide text-orange-700">Mit Erfolgen</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">{withSuccessCount}</p>
        </article>
        <article className="rounded-2xl border border-orange-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
          <p className="text-xs font-medium uppercase tracking-wide text-orange-700">Conversion-Rate</p>
          <p className="mt-2 text-3xl font-semibold text-orange-800">{overallConversionRate}%</p>
        </article>
      </section>

      {pendingCount > 0 ? (
        <p className="rounded-xl border border-amber-300/70 bg-amber-50/95 px-3 py-2 text-sm text-amber-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          {pendingCount} Empfehler warten auf Freigabe.
        </p>
      ) : null}

      {params.approved === "1" ? (
        <p className="rounded-xl border border-emerald-300/70 bg-emerald-50/95 px-3 py-2 text-sm text-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          Empfehler wurde freigegeben.
        </p>
      ) : null}
      {params.approved === "0" ? (
        <p className="rounded-xl border border-rose-300/70 bg-rose-50/95 px-3 py-2 text-sm text-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          Freigabe fehlgeschlagen.
          {params.reason ? ` Grund: ${params.reason}` : ""}
        </p>
      ) : null}

      <section className="relative z-10 rounded-2xl border border-orange-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="inline-flex items-center gap-2.5 text-lg font-semibold text-zinc-900">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-orange-300/45 bg-orange-100/80 text-orange-700">
              <BookIcon className="h-4 w-4" />
            </span>
            Empfehler-Übersicht
          </h2>
          <span className="text-xs text-zinc-600">{rows.length} Einträge</span>
        </div>

        {loadError ? (
          <p className="mb-3 rounded-xl border border-rose-300/70 bg-rose-50/95 px-3 py-2 text-sm text-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            Empfehler konnten nicht geladen werden: {loadError}
          </p>
        ) : null}

        <div className="max-h-[640px] overflow-auto rounded-xl border border-orange-100/80 bg-orange-50/65">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-orange-100/90 text-left text-zinc-600 backdrop-blur">
              <tr>
                <th className="px-3 py-2">Empfehler</th>
                <th className="px-3 py-2">Kontakt</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Empfehlungen</th>
                <th className="px-3 py-2">Conversion</th>
                <th className="px-3 py-2">Gesammelte Punkte</th>
                <th className="px-3 py-2">Kontakt-Empfehlungslink</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-zinc-500">
                    Noch keine Empfehler vorhanden.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const shareCode =
                    row.referral_slug ??
                    row.referral_code ??
                    row.invite_code ??
                    row.id;
                  const link = `${appBase}/ref/${shareCode}`;
                  const stats = referralStatsByReferrer.get(row.id) ?? {
                    total: 0,
                    successful: 0,
                  };
                  const conversionRate =
                    stats.total > 0
                      ? Math.round((stats.successful / stats.total) * 100)
                      : 0;
                  const collectedPoints = pointsByReferrer.get(row.id) ?? 0;

                  return (
                    <tr
                      key={row.id}
                      className="align-top transition-colors duration-200 hover:bg-orange-100/65"
                    >
                      <td className="px-3 py-3 font-medium text-zinc-900">
                        {getDisplayName(row.first_name, row.last_name)}
                      </td>
                      <td className="px-3 py-3 text-zinc-700">
                        <p>{row.email ?? "-"}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {row.phone ?? "-"}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ring-1 ${
                            row.is_active
                              ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
                              : "bg-zinc-100 text-zinc-700 ring-zinc-200"
                          }`}
                        >
                          {row.is_active ? "Aktiv" : "In Prüfung"}
                        </span>
                        {!row.is_active ? (
                          <form action={approveReferrerAction} className="mt-2">
                            <input
                              type="hidden"
                              name="referrer_id"
                              value={row.id}
                            />
                            <button
                              type="submit"
                              className="rounded-lg border border-orange-300/50 bg-orange-600 px-3 py-1 text-xs font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-500 hover:shadow-[0_10px_18px_rgba(249,115,22,0.2)]"
                            >
                              Freigeben
                            </button>
                          </form>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-zinc-900">{stats.total}</p>
                        <p className="text-xs text-zinc-500">{stats.successful} erfolgreich</p>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ring-1 ${
                            conversionRate >= 50
                              ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
                              : conversionRate >= 20
                                ? "bg-amber-100 text-amber-800 ring-amber-200"
                                : "bg-zinc-100 text-zinc-700 ring-zinc-200"
                          }`}
                        >
                          {conversionRate}%
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-semibold text-orange-800">{collectedPoints}</span>
                      </td>
                      <td className="px-3 py-3 text-zinc-700">
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">Für neue Kontakte</p>
                        <p className="mt-1 break-all text-xs">{link}</p>
                        <p className="mt-2 text-[11px] text-zinc-500">
                          Über diesen Link kann sich ein neuer Kontakt direkt registrieren.
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <CopyLinkButton
                            value={link}
                            idleLabel="Link kopieren"
                            copiedLabel="Link kopiert"
                            className="rounded border border-orange-300/55 bg-white px-3 py-1 text-xs font-medium text-orange-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-orange-100 hover:text-orange-900 hover:ring-1 hover:ring-orange-400/70 hover:shadow-[0_12px_22px_rgba(249,115,22,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                          />
                        </div>
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

