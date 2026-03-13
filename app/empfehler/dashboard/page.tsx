import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentReferrerContext } from "@/lib/auth/referrer";
import {
  getPointsBalanceForReferrer,
  listPointsTransactionsForReferrer,
} from "@/lib/queries/points";
import { listReferralsForReferrer } from "@/lib/queries/referrals";
import { listActiveRewardsForAdvisor } from "@/lib/queries/rewards";
import { normalizeSupabaseError } from "@/lib/supabase/errors";
import { CopyLinkButton } from "@/app/dashboard/referrers/copy-link-button";
import { logoutAction } from "@/app/dashboard/actions";
import {
  buildMotivationHints,
  getAwardedPointsByReferral,
  getLevelProgress,
  getNextReward,
} from "@/app/empfehler/dashboard/gamification";
import { PointsOverviewCard } from "@/app/empfehler/dashboard/components/points-overview-card";
import { LevelCard } from "@/app/empfehler/dashboard/components/level-card";
import { MotivationCard } from "@/app/empfehler/dashboard/components/motivation-card";
import { RecommendationsTable } from "@/app/empfehler/dashboard/components/recommendations-table";
import { RewardsPreview } from "@/app/empfehler/dashboard/components/rewards-preview";

export default async function ReferrerDashboardPage() {
  const supabase = await createClient();
  const referrerContext = await getCurrentReferrerContext(supabase);

  if (!referrerContext) {
    redirect("/empfehler/login");
  }

  let pointsBalance = 0;
  let pointsRows: Awaited<
    ReturnType<typeof listPointsTransactionsForReferrer>
  > = [];
  let referralRows: Awaited<ReturnType<typeof listReferralsForReferrer>> = [];
  let rewards: Awaited<ReturnType<typeof listActiveRewardsForAdvisor>> = [];
  let loadError: string | null = null;
  let levelThresholds = {
    bronze: 100,
    silver: 200,
    gold: 500,
    platinum: 1000,
  };

  try {
    pointsBalance = await getPointsBalanceForReferrer(
      supabase,
      referrerContext.advisorId,
      referrerContext.referrerId,
    );
    pointsRows = await listPointsTransactionsForReferrer(
      supabase,
      referrerContext.advisorId,
      referrerContext.referrerId,
    );
    referralRows = await listReferralsForReferrer(
      supabase,
      referrerContext.advisorId,
      referrerContext.referrerId,
    );
    rewards = await listActiveRewardsForAdvisor(
      supabase,
      referrerContext.advisorId,
    );
    const { data: settingsRow, error: settingsError } = await supabase
      .from("advisor_settings")
      .select(
        "level_bronze_points, level_silver_points, level_gold_points, level_platinum_points",
      )
      .eq("advisor_id", referrerContext.advisorId)
      .maybeSingle();
    if (settingsError) {
      const code = (settingsError as { code?: string }).code;
      if (code !== "PGRST204") throw settingsError;
    } else {
      const row = settingsRow as {
        level_silver_points?: number | null;
        level_gold_points?: number | null;
        level_platinum_points?: number | null;
        level_bronze_points?: number | null;
      } | null;
      levelThresholds = {
        bronze: row?.level_bronze_points ?? 100,
        silver: row?.level_silver_points ?? 200,
        gold: row?.level_gold_points ?? 500,
        platinum: row?.level_platinum_points ?? 1000,
      };
    }
  } catch (error) {
    loadError = normalizeSupabaseError(error).message;
  }

  const appBase = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const contactReferralCode =
    referrerContext.referralSlug ??
    referrerContext.referralCode ??
    referrerContext.inviteCode ??
    referrerContext.referrerId;
  const contactReferralLink = `${appBase}/ref/${contactReferralCode}`;

  const referralNameById = new Map(
    referralRows.map((row) => {
      const fullName =
        row.contact_name ??
        [row.contact_first_name, row.contact_last_name]
          .filter(Boolean)
          .join(" ")
          .trim() ??
        "-";
      return [row.id, fullName || "-"] as const;
    }),
  );

  const awardedPointsByReferral = getAwardedPointsByReferral(pointsRows);
  const successfulReferralsCount = referralRows.filter(
    (row) => row.status === "abschluss",
  ).length;

  const levelProgress = getLevelProgress(pointsBalance, levelThresholds);
  const nextReward = getNextReward(rewards, pointsBalance);
  const hints = buildMotivationHints({
    pointsBalance,
    successfulReferralsCount,
    pointsToNextLevel: levelProgress.pointsToNextLevel,
    pointsToNextReward: nextReward?.pointsMissing ?? null,
  });

  function getBookingLabel(row: (typeof pointsRows)[number]) {
    if (row.transaction_type === "earn_referral_close" && row.referral_id) {
      const contactName =
        referralNameById.get(row.referral_id) ?? "Unbekannter Kontakt";
      return `Abschluss Neukunde: ${contactName}`;
    }
    return row.description ?? row.transaction_type;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Ihr Empfehler-Dashboard
        </h1>
        <p className="text-sm text-zinc-600">
          Willkommen zurueck. Hier sehen Sie Ihren Fortschritt fuer {" "}
          <span className="font-medium text-zinc-900">{referrerContext.advisorName}</span>.
        </p>
      </header>

      {loadError ? (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          Daten konnten nicht vollstaendig geladen werden: {loadError}
        </p>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <PointsOverviewCard pointsBalance={pointsBalance} nextReward={nextReward} />
        <LevelCard
          currentLevel={levelProgress.current}
          nextLevel={levelProgress.next}
          pointsToNextLevel={levelProgress.pointsToNextLevel}
          progressPercent={levelProgress.progressPercent}
          pointsInCurrentLevel={levelProgress.pointsInCurrentLevel}
          pointsNeededInLevel={levelProgress.pointsNeededInLevel}
        />
      </section>

      <MotivationCard hints={hints} />

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Kontakt-Empfehlungslink</h2>
        <p className="mt-2 break-all text-sm text-zinc-700">{contactReferralLink}</p>
        <div className="mt-3">
          <CopyLinkButton value={contactReferralLink} />
        </div>
      </section>

      <RecommendationsTable
        referrals={referralRows}
        awardedPointsByReferral={awardedPointsByReferral}
      />

      <RewardsPreview rewards={rewards} pointsBalance={pointsBalance} />

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Punktekonto</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-zinc-500">
              <tr>
                <th className="px-2 py-2">Datum</th>
                <th className="px-2 py-2">Buchung</th>
                <th className="px-2 py-2">Punkte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {pointsRows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-2 py-4 text-zinc-500">
                    Noch keine Buchungen vorhanden.
                  </td>
                </tr>
              ) : (
                pointsRows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-2 py-2 text-zinc-600">
                      {new Date(row.created_at).toLocaleString("de-DE")}
                    </td>
                    <td className="px-2 py-2 text-zinc-700">{getBookingLabel(row)}</td>
                    <td
                      className={`px-2 py-2 font-medium ${
                        row.points >= 0 ? "text-emerald-700" : "text-red-700"
                      }`}
                    >
                      {row.points > 0 ? `+${row.points}` : row.points}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex items-center justify-between gap-3">
        <Link
          href="/empfehler/praemien"
          className="inline-flex rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Zur Praemienseite
        </Link>

        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900"
          >
            Logout
          </button>
        </form>
      </section>
    </main>
  );
}
