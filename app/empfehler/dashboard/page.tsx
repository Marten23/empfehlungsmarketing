import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentReferrerContext } from "@/lib/auth/referrer";
import {
  listPointsTransactionsForReferrer,
  sumAvailablePoints,
  sumLifetimeLevelPoints,
} from "@/lib/queries/points";
import { listReferralsForReferrer } from "@/lib/queries/referrals";
import { listActiveRewardsForAdvisor } from "@/lib/queries/rewards";
import { normalizeSupabaseError } from "@/lib/supabase/errors";
import { normalizeGermanUmlauts } from "@/lib/text/normalize-de";
import { LinkToolCard } from "@/app/components/link-tool-card";
import { logoutAction } from "@/app/dashboard/actions";
import {
  buildMotivationHints,
  getAwardedPointsByReferral,
  getLevelProgress,
  mapReferralStatusToUi,
  getNextReward,
} from "@/app/empfehler/dashboard/gamification";
import { DashboardHero } from "@/app/empfehler/dashboard/components/dashboard-hero";
import { DashboardQuickActions } from "@/app/empfehler/dashboard/components/dashboard-quick-actions";
import { PointsOverviewCard } from "@/app/empfehler/dashboard/components/points-overview-card";
import { LevelCard } from "@/app/empfehler/dashboard/components/level-card";
import { RewardTeaserCard } from "@/app/empfehler/dashboard/components/reward-teaser-card";
import { MotivationCard } from "@/app/empfehler/dashboard/components/motivation-card";
import { RecentTransactionsCard } from "@/app/empfehler/dashboard/components/recent-transactions-card";
import { RecentReferralsCard } from "@/app/empfehler/dashboard/components/recent-referrals-card";
import { RewardsPreview } from "@/app/empfehler/dashboard/components/rewards-preview";
import { CopyIcon } from "@/app/empfehler/dashboard/components/icons";

export default async function ReferrerDashboardPage() {
  const supabase = await createClient();
  const referrerContext = await getCurrentReferrerContext(supabase);

  if (!referrerContext) {
    redirect("/empfehler/login");
  }

  let availablePoints = 0;
  let lifetimeLevelPoints = 0;
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
    pointsRows = await listPointsTransactionsForReferrer(
      supabase,
      referrerContext.advisorId,
      referrerContext.referrerId,
    );
    availablePoints = sumAvailablePoints(pointsRows);
    lifetimeLevelPoints = sumLifetimeLevelPoints(pointsRows);
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

  const levelProgress = getLevelProgress(lifetimeLevelPoints, levelThresholds);
  const nextReward = getNextReward(rewards, availablePoints);
  const hints = buildMotivationHints({
    availablePoints,
    lifetimeLevelPoints,
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
    return normalizeGermanUmlauts(row.description ?? row.transaction_type);
  }

  const recentTransactionItems = pointsRows.slice(0, 5).map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    label: getBookingLabel(row),
    points: row.points,
  }));

  const recentReferralItems = referralRows.slice(0, 5).map((row) => {
    const fullName =
      row.contact_name ??
      [row.contact_first_name, row.contact_last_name]
        .filter(Boolean)
        .join(" ")
        .trim() ??
      "-";

    return {
      id: row.id,
      person: fullName || "-",
      createdAt: row.created_at,
      statusLabel: mapReferralStatusToUi(row.status),
      awardedPoints: awardedPointsByReferral.get(row.id) ?? null,
    };
  });

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
        <div className="space-y-4">
          <div className="flex justify-end">
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-xl border border-white/55 bg-white/88 px-3 py-1.5 text-xs font-semibold text-zinc-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-violet-50 hover:text-zinc-900 hover:ring-1 hover:ring-violet-300/55 hover:shadow-[0_14px_30px_rgba(76,29,149,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Abmelden
              </button>
            </form>
          </div>
          <DashboardHero
            firstName={referrerContext.firstName}
            advisorName={referrerContext.advisorName}
          />
          <DashboardQuickActions />
        </div>
      </section>

      {loadError ? (
        <p className="rounded-xl border border-rose-300/70 bg-rose-50/90 px-3 py-2 text-sm text-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          Daten konnten nicht vollständig geladen werden: {loadError}
        </p>
      ) : null}

      <section className="relative z-10 overflow-hidden rounded-3xl border border-violet-200/55 bg-violet-50/84 px-5 py-6 shadow-[0_24px_60px_rgba(5,3,12,0.35)] backdrop-blur-xl md:px-7 md:py-7">
        <div className="relative space-y-8">
          <div className="grid gap-6 xl:grid-cols-3">
            <PointsOverviewCard availablePoints={availablePoints} nextReward={nextReward} />
            <LevelCard
              lifetimePoints={lifetimeLevelPoints}
              currentLevel={levelProgress.current}
              nextLevel={levelProgress.next}
              pointsToNextLevel={levelProgress.pointsToNextLevel}
              progressPercent={levelProgress.progressPercent}
              pointsInCurrentLevel={levelProgress.pointsInCurrentLevel}
              pointsNeededInLevel={levelProgress.pointsNeededInLevel}
            />
            <RewardTeaserCard nextReward={nextReward} availablePoints={availablePoints} />
          </div>

          <MotivationCard hints={hints} />

          <LinkToolCard
            title="Kontakt-Empfehlungslink"
            audienceLabel="Für neue Kontakte"
            helperText="Diesen Link teilen Sie mit neuen Kontakten, damit Empfehlungen sauber erfasst werden."
            link={contactReferralLink}
            code={contactReferralCode}
            icon={CopyIcon}
          />

          <div className="h-px bg-violet-300/35" />

          <div className="grid gap-6 xl:grid-cols-2">
            <RecentTransactionsCard items={recentTransactionItems} />
            <RecentReferralsCard items={recentReferralItems} />
          </div>

          <div className="h-px bg-violet-300/30" />
          <RewardsPreview rewards={rewards} pointsBalance={availablePoints} />
        </div>
      </section>

      <section className="relative z-10 flex items-center justify-between gap-3">
        <Link
          href="/empfehler/praemien"
          className="inline-flex rounded-xl border border-violet-300/40 bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(91,61,200,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-violet-500 hover:brightness-110 hover:shadow-[0_20px_34px_rgba(91,61,200,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200/90 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1028]"
        >
          Zur Prämienseite
        </Link>
      </section>
    </div>
  );
}

