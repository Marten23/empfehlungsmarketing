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
import { CopyLinkButton } from "@/app/dashboard/referrers/copy-link-button";
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
import { CopyIcon, SparklesIcon } from "@/app/empfehler/dashboard/components/icons";

function HexNode({
  size,
  left,
  top,
  toneClass,
  delayClass,
  pulseClass,
}: {
  size: string;
  left: string;
  top: string;
  toneClass: string;
  delayClass?: string;
  pulseClass?: string;
}) {
  return (
    <div
      className={`hex-node absolute ${pulseClass ?? "hex-pulse"} ${delayClass ?? ""} border ${toneClass} ${size}`}
      style={{ left, top }}
    />
  );
}

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
    return row.description ?? row.transaction_type;
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
      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 p-6">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_12%_8%,rgba(90,46,166,0.45),transparent_26%),radial-gradient(circle_at_88%_12%,rgba(159,124,255,0.3),transparent_30%),radial-gradient(circle_at_58%_82%,rgba(110,68,255,0.2),transparent_38%),linear-gradient(180deg,#1A1028_0%,#1f1231_52%,#150d24_100%)]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_25%_35%,rgba(159,124,255,0.08),transparent_42%),radial-gradient(circle_at_75%_30%,rgba(110,68,255,0.09),transparent_40%),radial-gradient(circle_at_52%_65%,rgba(159,124,255,0.06),transparent_45%)]" />
      <div className="hex-honeycomb-bg pointer-events-none fixed inset-0 z-0 opacity-40" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_12%_16%,rgba(159,124,255,0.22),transparent_26%),radial-gradient(circle_at_86%_18%,rgba(159,124,255,0.2),transparent_26%),radial-gradient(circle_at_20%_82%,rgba(110,68,255,0.18),transparent_24%),radial-gradient(circle_at_82%_76%,rgba(110,68,255,0.2),transparent_24%)]" />
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute right-[6%] top-[7%] h-[280px] w-[360px] opacity-90">
          <HexNode size="h-24 w-24" left="8%" top="8%" toneClass="border-violet-300/35 bg-violet-400/10" />
          <HexNode size="h-20 w-20" left="30%" top="10%" toneClass="border-[#9F7CFF]/70 bg-[#6E44FF]/30 shadow-[0_0_24px_rgba(110,68,255,0.45)]" delayClass="[animation-delay:1.2s]" />
          <HexNode size="h-24 w-24" left="51%" top="8%" toneClass="border-violet-300/35 bg-violet-400/10" delayClass="[animation-delay:2s]" />
          <HexNode size="h-20 w-20" left="19%" top="36%" toneClass="border-black/55 bg-black/45" delayClass="[animation-delay:1.7s]" />
          <HexNode size="h-24 w-24" left="40%" top="34%" toneClass="border-[#9F7CFF]/65 bg-[#6E44FF]/24 shadow-[0_0_20px_rgba(159,124,255,0.35)]" delayClass="[animation-delay:2.8s]" />
          <HexNode size="h-16 w-16" left="63%" top="40%" toneClass="border-violet-300/25 bg-violet-300/8" delayClass="[animation-delay:0.9s]" />
          <HexNode size="h-16 w-16" left="75%" top="24%" toneClass="border-black/50 bg-black/40" delayClass="[animation-delay:2.9s]" />
          <HexNode size="h-14 w-14" left="70%" top="53%" toneClass="border-violet-300/24 bg-violet-300/8" delayClass="[animation-delay:1.6s]" />
        </div>

        <div className="absolute left-[4%] top-[58%] h-[300px] w-[360px] opacity-80">
          <HexNode size="h-20 w-20" left="6%" top="18%" toneClass="border-violet-300/28 bg-violet-300/8" />
          <HexNode size="h-16 w-16" left="30%" top="14%" toneClass="border-black/50 bg-black/42" delayClass="[animation-delay:2.2s]" />
          <HexNode size="h-20 w-20" left="48%" top="26%" toneClass="border-violet-300/28 bg-violet-300/8" delayClass="[animation-delay:1.4s]" />
          <HexNode size="h-16 w-16" left="22%" top="47%" toneClass="border-violet-300/22 bg-violet-300/6" delayClass="[animation-delay:2.9s]" />
          <HexNode size="h-24 w-24" left="44%" top="48%" toneClass="border-[#9F7CFF]/65 bg-[#6E44FF]/24 shadow-[0_0_18px_rgba(110,68,255,0.35)]" delayClass="[animation-delay:0.8s]" />
          <HexNode size="h-16 w-16" left="67%" top="40%" toneClass="border-violet-300/24 bg-violet-300/7" delayClass="[animation-delay:3.1s]" />
          <HexNode size="h-14 w-14" left="60%" top="66%" toneClass="border-black/45 bg-black/38" delayClass="[animation-delay:1.7s]" />
        </div>

        <div className="hex-glow absolute left-[46%] top-[12%] h-28 w-28 rounded-full bg-violet-500/12 blur-3xl" />
        <div className="hex-glow absolute left-[56%] top-[62%] h-32 w-32 rounded-full bg-violet-400/10 blur-3xl [animation-delay:2.4s]" />
        <div className="absolute left-[68%] top-[58%] h-[240px] w-[280px] opacity-70">
          <HexNode size="h-16 w-16" left="8%" top="8%" toneClass="border-violet-300/26 bg-violet-300/8" />
          <HexNode size="h-20 w-20" left="30%" top="4%" toneClass="border-black/50 bg-black/42" delayClass="[animation-delay:2.1s]" />
          <HexNode size="h-16 w-16" left="54%" top="18%" toneClass="border-violet-300/24 bg-violet-300/7" delayClass="[animation-delay:3.2s]" />
          <HexNode size="h-14 w-14" left="26%" top="40%" toneClass="border-violet-300/22 bg-violet-300/6" delayClass="[animation-delay:0.9s]" />
          <HexNode size="h-16 w-16" left="52%" top="46%" toneClass="border-[#9F7CFF]/65 bg-[#6E44FF]/25 shadow-[0_0_16px_rgba(159,124,255,0.35)]" delayClass="[animation-delay:1.5s]" />
        </div>
      </div>

      <section className="relative z-10 overflow-hidden rounded-[38px] bg-[linear-gradient(120deg,rgba(46,26,71,0.94),rgba(26,16,40,0.94))] p-4 shadow-[0_36px_96px_rgba(8,4,16,0.55)] ring-1 ring-violet-300/28 backdrop-blur-xl md:p-6">
        <div className="pointer-events-none absolute -left-20 top-12 h-64 w-64 rounded-full bg-violet-500/28 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-8 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="pointer-events-none absolute right-8 top-8 hidden h-44 w-44 md:block">
          <div className="hex-node hex-pulse absolute left-12 top-10 h-24 w-24 border border-violet-300/35 bg-violet-300/10" />
          <div className="hex-node hex-pulse absolute left-0 top-16 h-16 w-16 border border-violet-300/30 bg-violet-300/8 [animation-delay:1.4s]" />
          <div className="hex-node hex-pulse absolute left-20 top-0 h-14 w-14 border border-violet-300/30 bg-violet-300/10 [animation-delay:2.4s]" />
          <div className="hex-node absolute left-28 top-[4.5rem] h-12 w-12 border border-violet-300/20 bg-violet-300/8" />
        </div>
        <div className="space-y-4">
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

      <section className="relative z-10 overflow-hidden rounded-[38px] bg-[linear-gradient(128deg,rgba(46,26,71,0.9),rgba(26,16,40,0.9))] px-5 py-6 shadow-[0_36px_96px_rgba(8,4,16,0.55)] ring-1 ring-violet-300/25 backdrop-blur-xl md:px-7 md:py-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(90,46,166,0.28),transparent_40%),radial-gradient(circle_at_78%_10%,rgba(159,124,255,0.16),transparent_34%),radial-gradient(circle_at_55%_84%,rgba(110,68,255,0.16),transparent_40%)]" />
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

          <div className="rounded-3xl bg-violet-400/6 px-1 py-1">
            <MotivationCard hints={hints} />
          </div>

          <div className="rounded-3xl bg-violet-400/8 px-4 py-4 ring-1 ring-violet-300/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <h2 className="inline-flex items-center gap-2.5 text-lg font-semibold text-violet-50">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-violet-300/35 bg-violet-300/12 text-violet-100">
                <CopyIcon className="h-4 w-4" />
              </span>
              Kontakt-Empfehlungslink
            </h2>
            <p className="mt-2 break-all text-sm text-violet-100/85">{contactReferralLink}</p>
            <div className="mt-3 inline-flex items-center gap-2.5 rounded-full border border-violet-300/35 bg-violet-300/12 px-3 py-1 text-xs text-violet-200">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-300/20">
                <SparklesIcon className="h-3.5 w-3.5" />
              </span>
              Link teilen und Punkte sammeln
            </div>
            <div className="mt-3">
              <CopyLinkButton
                value={contactReferralLink}
                className="rounded border border-violet-300/35 bg-violet-400/12 px-3 py-1 text-xs font-medium text-violet-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-violet-300/20 hover:text-violet-50 hover:ring-1 hover:ring-violet-200/45 hover:shadow-[0_12px_28px_rgba(26,16,40,0.36)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1028]"
              />
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-violet-300/40 to-transparent" />

          <div className="grid gap-6 xl:grid-cols-2">
            <RecentTransactionsCard items={recentTransactionItems} />
            <RecentReferralsCard items={recentReferralItems} />
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-violet-300/30 to-transparent" />
          <RewardsPreview rewards={rewards} pointsBalance={availablePoints} />
        </div>
      </section>

      <section className="relative z-10 flex items-center justify-between gap-3">
        <Link
          href="/empfehler/praemien"
          className="inline-flex rounded-xl bg-gradient-to-r from-violet-600 to-[#9F7CFF] px-4 py-2 text-sm font-medium text-white shadow-[0_12px_24px_rgba(110,68,255,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.03] hover:brightness-110 hover:shadow-[0_18px_36px_rgba(110,68,255,0.42)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1028]"
        >
          Zur Prämienseite
        </Link>

        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-xl border border-violet-300/30 bg-violet-400/10 px-4 py-2 text-sm font-medium text-violet-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-violet-300/18 hover:text-violet-50 hover:ring-1 hover:ring-violet-200/45 hover:shadow-[0_14px_30px_rgba(26,16,40,0.34)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1028]"
          >
            Abmelden
          </button>
        </form>
      </section>
      </main>
  );
}
