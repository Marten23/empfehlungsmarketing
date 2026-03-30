import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentReferrerContext } from "@/lib/auth/referrer";
import { sumAvailablePoints, sumLifetimeLevelPoints } from "@/lib/queries/points";
import { listReferralsForReferrer } from "@/lib/queries/referrals";
import { listReferrersForAdvisor } from "@/lib/queries/referrers";
import { listActiveRewardsForAdvisor } from "@/lib/queries/rewards";
import { normalizeSupabaseError } from "@/lib/supabase/errors";
import { CopyLinkButton } from "@/app/dashboard/referrers/copy-link-button";
import {
  getLevelProgress,
  getNextReward,
} from "@/app/empfehler/dashboard/gamification";
import {
  BoltIcon,
  SparklesIcon,
  TrophyIcon,
} from "@/app/empfehler/dashboard/components/icons";
import type { PointsTransactionType } from "@/lib/types/domain";
import { ReferrerAreaHeader } from "@/app/empfehler/components/referrer-area-header";
import { getReferrerTheme } from "@/lib/ui/referrer-theme";
import { PodiumRanklist } from "@/app/empfehler/dashboard/components/podium-ranklist";
import { AdvisorBusinessImage } from "@/app/components/advisor-business-image";
import { ReferrerInbox } from "@/app/empfehler/dashboard/components/referrer-inbox";
import { buildWhatsAppShareUrlForFlow } from "@/lib/whatsapp/share";
import { InstagramInviteButton } from "@/app/components/instagram-invite-button";
import {
  deleteNotificationAction,
  markNotificationReadAction,
  submitSurveyResponseAction,
} from "@/app/empfehler/dashboard/actions";

type AdvisorBannerData = {
  displayName: string;
  subtitle: string | null;
  phone: string | null;
  email: string | null;
  avatarUrl: string | null;
};

type LeaderboardEntry = {
  referrerId: string;
  name: string;
  points: number;
  avatarUrl: string | null;
};

type ReferrerInboxNotification = {
  id: string;
  title: string;
  message: string | null;
  notificationType: "reward_survey" | "info";
  rewardSurveyId: string | null;
  isRead: boolean;
  createdAt: string;
};

type ReferrerInboxSurvey = {
  id: string;
  title: string;
  description: string | null;
  surveyType: "preset" | "open_budget";
  budgetLimitEur: number | null;
  options: Array<{ id: string; text: string }>;
};

function formatReferrerName(firstName: string, lastName: string) {
  const cleanFirst = firstName.trim() || "Empfehler";
  const cleanLast = lastName.trim();
  if (!cleanLast) return cleanFirst;
  return `${cleanFirst} ${cleanLast[0]}.`;
}

function formatPoints(points: number) {
  return new Intl.NumberFormat("de-DE").format(points);
}

function referralStatusLabel(status: string) {
  if (status === "neu") return "eingereicht";
  if (status === "kontaktiert" || status === "termin") return "in Prüfung";
  if (status === "abschluss") return "erfolgreich";
  if (status === "abgelehnt") return "abgelehnt";
  return status;
}

function referralStatusClass(status: string) {
  if (status === "abschluss") return "bg-emerald-100 text-emerald-800 ring-emerald-200";
  if (status === "abgelehnt") return "bg-rose-100 text-rose-700 ring-rose-200";
  if (status === "kontaktiert" || status === "termin") return "bg-amber-100 text-amber-800 ring-amber-200";
  return "bg-cyan-100 text-cyan-800 ring-cyan-200";
}

function StatChip({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] ${
        emphasis
          ? "border-orange-300/70 bg-orange-100/90"
          : "border-orange-200/70 bg-white/82"
      }`}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-orange-700">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-zinc-900">{value}</p>
    </div>
  );
}

type ReferrerDashboardPageProps = {
  searchParams: Promise<{ survey_saved?: string; survey_error?: string }>;
};

export default async function ReferrerDashboardPage({
  searchParams,
}: ReferrerDashboardPageProps) {
  const params = await searchParams;
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

  let advisorBanner: AdvisorBannerData = {
    displayName: referrerContext.advisorName,
    subtitle: "Ihr Ansprechpartner",
    phone: null,
    email: null,
    avatarUrl: null,
  };

  let availablePoints = 0;
  let lifetimeLevelPoints = 0;
  let recentReferrals: Array<{ id: string; name: string; status: string }> = [];
  let rewards: Awaited<ReturnType<typeof listActiveRewardsForAdvisor>> = [];
  let leaderboard: LeaderboardEntry[] = [];
  let inboxNotifications: ReferrerInboxNotification[] = [];
  let inboxSurveys: ReferrerInboxSurvey[] = [];
  let ordelyCooperationEnabled = false;
  let ordelyPromoCode = "REWARO50";
  let loadError: string | null = null;
  let levelThresholds = {
    bronze: 100,
    silver: 200,
    gold: 500,
    platinum: 1000,
  };

  try {
    const [rewardData, referrersData, ownPointsData, allPointsRows, referralData, notificationRows] =
      await Promise.all([
        listActiveRewardsForAdvisor(supabase, referrerContext.advisorId),
        listReferrersForAdvisor(supabase, referrerContext.advisorId),
        supabase
          .from("points_transactions")
          .select("points, transaction_type")
          .eq("advisor_id", referrerContext.advisorId)
          .eq("referrer_id", referrerContext.referrerId),
        supabase
          .rpc("get_referrer_leaderboard", {
            p_advisor_id: referrerContext.advisorId,
          }),
        listReferralsForReferrer(
          supabase,
          referrerContext.advisorId,
          referrerContext.referrerId,
        ),
        supabase
          .from("referrer_notifications")
          .select("id, title, message, notification_type, reward_survey_id, is_read, created_at")
          .eq("advisor_id", referrerContext.advisorId)
          .eq("referrer_id", referrerContext.referrerId)
          .eq("is_read", false)
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

    if (ownPointsData.error) throw ownPointsData.error;
    if (allPointsRows.error) throw allPointsRows.error;
    if (notificationRows.error) throw notificationRows.error;

    const ownPointsRows = (ownPointsData.data ?? []) as Array<{
      points: number | null;
      transaction_type: PointsTransactionType | null;
    }>;

    availablePoints = sumAvailablePoints(
      ownPointsRows.map((row) => ({ points: Number(row.points ?? 0) })),
    );

    lifetimeLevelPoints = sumLifetimeLevelPoints(
      ownPointsRows.map((row) => ({
        points: Number(row.points ?? 0),
        transaction_type: row.transaction_type ?? "manual_adjustment",
      })),
    );
    rewards = rewardData;
    recentReferrals = referralData.slice(0, 2).map((row) => ({
      id: row.id,
      name:
        row.contact_name ??
        [row.contact_first_name, row.contact_last_name]
          .filter(Boolean)
          .join(" ")
          .trim() ??
        "Kontakt",
      status: row.status,
    }));

    const pointsByReferrer = new Map<string, number>();
    for (const row of (allPointsRows.data ?? []) as Array<{
      referrer_id: string | null;
      total_points: number | null;
    }>) {
      const referrerId = String(row.referrer_id ?? "");
      if (!referrerId) continue;
      const points = Number(row.total_points ?? 0);
      pointsByReferrer.set(referrerId, points);
    }

    const profileIds = referrersData
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

    leaderboard = referrersData
      // Rangliste über alle Empfehler im Beraterprogramm (nicht nur aktive).
      .filter((row) => Boolean(row.id))
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

    inboxNotifications = ((notificationRows.data ?? []) as Array<{
      id: string;
      title: string;
      message: string | null;
      notification_type: "reward_survey" | "info" | null;
      reward_survey_id: string | null;
      is_read: boolean | null;
      created_at: string;
    }>).map((row) => ({
      id: row.id,
      title: row.title,
      message: row.message,
      notificationType: row.notification_type === "reward_survey" ? "reward_survey" : "info",
      rewardSurveyId: row.reward_survey_id,
      isRead: Boolean(row.is_read),
      createdAt: row.created_at,
    }));

    const surveyIds = Array.from(
      new Set(
        inboxNotifications
          .map((item) => item.rewardSurveyId)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    if (surveyIds.length > 0) {
      const [{ data: surveyRows, error: surveyError }, { data: optionRows, error: optionError }] =
        await Promise.all([
          supabase
            .from("reward_surveys")
            .select("id, title, description, survey_type, budget_limit_eur, is_active")
            .eq("advisor_id", referrerContext.advisorId)
            .eq("is_active", true)
            .in("id", surveyIds),
          supabase
            .from("reward_survey_options")
            .select("id, survey_id, option_text, sort_order")
            .eq("advisor_id", referrerContext.advisorId)
            .in("survey_id", surveyIds)
            .order("sort_order", { ascending: true }),
        ]);
      if (surveyError) throw surveyError;
      if (optionError) throw optionError;

      const optionsBySurvey = new Map<string, Array<{ id: string; text: string }>>();
      for (const row of (optionRows ?? []) as Array<{
        id: string;
        survey_id: string | null;
        option_text: string | null;
      }>) {
        const surveyId = String(row.survey_id ?? "");
        const text = String(row.option_text ?? "").trim();
        if (!surveyId || !text) continue;
        const arr = optionsBySurvey.get(surveyId) ?? [];
        arr.push({ id: row.id, text });
        optionsBySurvey.set(surveyId, arr);
      }

      inboxSurveys = ((surveyRows ?? []) as Array<{
        id: string;
        title: string;
        description: string | null;
        survey_type: "preset" | "open_budget" | null;
        budget_limit_eur: number | null;
      }>).map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        surveyType: row.survey_type === "open_budget" ? "open_budget" : "preset",
        budgetLimitEur: row.budget_limit_eur,
        options: optionsBySurvey.get(row.id) ?? [],
      }));
    }

    const { data: advisorCore, error: advisorCoreError } = await supabase
      .from("advisors")
      .select("name, owner_user_id, advisor_promo_code")
      .eq("id", referrerContext.advisorId)
      .maybeSingle();

    if (!advisorCoreError) {
      const ownerUserId = (advisorCore as { owner_user_id?: string | null } | null)
        ?.owner_user_id;

      if (advisorCore && typeof advisorCore.name === "string") {
        advisorBanner = {
          ...advisorBanner,
          displayName: advisorCore.name,
          subtitle: `Betreut durch ${advisorCore.name}`,
        };
      }
      const promoCode = String(
        (advisorCore as { advisor_promo_code?: string | null } | null)
          ?.advisor_promo_code ?? "",
      ).trim();
      if (promoCode) ordelyPromoCode = promoCode;

      if (ownerUserId) {
        const { data: ownerProfile } = await supabase
          .from("profiles")
          .select("full_name, phone, avatar_url")
          .eq("user_id", ownerUserId)
          .maybeSingle();

        if (ownerProfile) {
          const fullName = String(ownerProfile.full_name ?? "").trim();
          advisorBanner = {
            displayName: fullName || advisorBanner.displayName,
            subtitle: "Ihr Ansprechpartner",
            phone:
              typeof ownerProfile.phone === "string"
                ? ownerProfile.phone
                : null,
            email: advisorBanner.email,
            avatarUrl:
              typeof ownerProfile.avatar_url === "string"
                ? ownerProfile.avatar_url
                : null,
          };
        }
      }
    }

    const { data: settingsRow, error: settingsError } = await supabase
      .from("advisor_settings")
      .select(
        "level_bronze_points, level_silver_points, level_gold_points, level_platinum_points, contact_name, contact_phone, contact_email, contact_avatar_url, ordely_cooperation_enabled",
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
        contact_name?: string | null;
        contact_phone?: string | null;
        contact_email?: string | null;
        contact_avatar_url?: string | null;
        ordely_cooperation_enabled?: boolean | null;
      } | null;
      levelThresholds = {
        bronze: row?.level_bronze_points ?? 100,
        silver: row?.level_silver_points ?? 200,
        gold: row?.level_gold_points ?? 500,
        platinum: row?.level_platinum_points ?? 1000,
      };

      const contactName = String(row?.contact_name ?? "").trim();
      const contactPhone = String(row?.contact_phone ?? "").trim();
      const contactEmail = String(row?.contact_email ?? "").trim();
      const contactAvatar = String(row?.contact_avatar_url ?? "").trim();

      if (contactName) advisorBanner.displayName = contactName;
      if (contactPhone) advisorBanner.phone = contactPhone;
      if (contactEmail) advisorBanner.email = contactEmail;
      if (contactAvatar) advisorBanner.avatarUrl = contactAvatar;
      ordelyCooperationEnabled = Boolean(row?.ordely_cooperation_enabled);
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
  const referrerToContactWhatsAppUrl = buildWhatsAppShareUrlForFlow(
    "referrer_to_contact",
    contactReferralLink,
  );
  const ordelyPromoLink = "https://www.ordely.de";

  const levelProgress = getLevelProgress(lifetimeLevelPoints, levelThresholds);
  const nextReward = getNextReward(rewards, availablePoints);

  const myRankIndex = leaderboard.findIndex(
    (row) => row.referrerId === referrerContext.referrerId,
  );
  const myRank = myRankIndex >= 0 ? myRankIndex + 1 : null;

  const nextRewardTitle = nextReward?.reward?.title ?? "Prämie";
  const pointsToNextReward = nextReward?.pointsMissing ?? 0;
  const pointsToNextLevel = levelProgress.pointsToNextLevel;

  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-3 p-4 pb-8 md:gap-3 md:p-6">
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

      <ReferrerAreaHeader active="dashboard" />

      <section className="relative z-10 overflow-hidden rounded-3xl border border-zinc-200/85 bg-white/95 p-4 shadow-[0_20px_44px_rgba(15,23,42,0.1)] backdrop-blur-xl md:p-5">
        <div className="grid gap-4 xl:grid-cols-[1.55fr_0.9fr]">
          <div className="space-y-2.5">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-orange-300/50 bg-orange-100/85 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-orange-800">
                <SparklesIcon className="h-3.5 w-3.5" />
                Dein Überblick
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-zinc-900 md:text-3xl">
                Willkommen zurück, {referrerContext.firstName}
              </h1>
            </div>

            <div className="rounded-2xl border border-orange-300/65 bg-gradient-to-b from-orange-50/85 to-white p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.98),0_12px_24px_rgba(249,115,22,0.08)]">
              <div className="flex items-center justify-between gap-3">
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.11em] text-orange-800">
                  <SparklesIcon className="h-3.5 w-3.5" />
                  Dein persönlicher Empfehlungslink
                </p>
                <span className="rounded-full border border-orange-200/70 bg-white/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-orange-700">
                  Sofort teilbar
                </span>
              </div>
              <p className="mt-1.5 text-xs text-zinc-600">
                Teile diesen Link direkt mit neuen Kontakten.
              </p>
              <p className="mt-2 break-all rounded-xl border border-orange-300/60 bg-white px-3 py-2 font-mono text-xs text-zinc-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                {contactReferralLink}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <CopyLinkButton
                  value={contactReferralLink}
                  idleLabel="Link kopieren"
                  copiedLabel="Kopiert"
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-orange-300/55 bg-white px-4 text-sm font-semibold text-orange-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-100 hover:text-orange-900 hover:ring-1 hover:ring-orange-400/70"
                />
                <a
                  href={referrerToContactWhatsAppUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-orange-500 bg-orange-500 px-4 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(249,115,22,0.25)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-600 hover:ring-1 hover:ring-orange-400/70 hover:shadow-[0_12px_22px_rgba(249,115,22,0.28)]"
                >
                  Über WhatsApp einladen
                </a>
                <InstagramInviteButton
                  flow="referrer_to_contact"
                  inviteLink={contactReferralLink}
                  mode="dm_only"
                  label="Über Instagram einladen"
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-orange-300/55 bg-white px-4 text-sm font-semibold text-orange-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-100 hover:text-orange-900 hover:ring-1 hover:ring-orange-400/70"
                />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <StatChip
                label="Punkte"
                value={formatPoints(availablePoints)}
                emphasis
              />
              <StatChip
                label="Rang"
                value={myRank ? `#${myRank}` : "-"}
              />
              <StatChip label="Level" value={levelProgress.current.label} />
              <StatChip label="Nächste Prämie" value={nextRewardTitle} />
              <StatChip
                label="Es fehlen"
                value={`${formatPoints(pointsToNextReward)} Punkte`}
              />
            </div>

            <div className="rounded-xl border border-orange-200/70 bg-white/80 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
              <div className="flex items-center justify-between gap-3">
                <p className="inline-flex items-center gap-2 text-xs font-medium text-zinc-700">
                  <BoltIcon className="h-4 w-4 text-orange-700" />
                  Fortschritt zur nächsten Prämie
                </p>
                <p className="text-xs font-semibold text-orange-800">
                  {nextReward?.progressPercent ?? 0} %
                </p>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-orange-100">
                <div
                  className="h-full rounded-full bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.32)] transition-all"
                  style={{ width: `${nextReward?.progressPercent ?? 0}%` }}
                />
              </div>
            </div>

            {ordelyCooperationEnabled ? (
              <div className="max-w-[560px] rounded-2xl border border-orange-300/65 bg-gradient-to-b from-orange-50/85 to-white p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.96),0_10px_20px_rgba(249,115,22,0.08)]">
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.11em] text-orange-800">
                  <SparklesIcon className="h-3.5 w-3.5" />
                  Ordely Kooperation aktiv
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  <p className="text-sm font-semibold text-zinc-900">
                    Sichere dir 50 % auf dein erstes Jahr bei Ordely mit dem Code:
                  </p>
                  <span className="inline-flex items-center rounded-lg bg-orange-500 px-2.5 py-1 font-mono text-sm font-semibold text-white shadow-[0_8px_16px_rgba(249,115,22,0.25)]">
                    {ordelyPromoCode}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2.5">
                  <CopyLinkButton
                    value={ordelyPromoCode}
                    idleLabel="Code kopieren"
                    copiedLabel="Kopiert"
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-orange-300/55 bg-white px-3.5 text-sm font-semibold text-orange-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-100"
                  />
                  <a
                    href={ordelyPromoLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white shadow-[0_12px_22px_rgba(249,115,22,0.25)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-600"
                  >
                    Zu Ordely
                  </a>
                </div>
              </div>
            ) : null}

            <ReferrerInbox
              notifications={inboxNotifications}
              surveys={inboxSurveys}
              submitSurveyResponseAction={submitSurveyResponseAction}
              markNotificationReadAction={markNotificationReadAction}
              deleteNotificationAction={deleteNotificationAction}
            />
          </div>

          <aside className="overflow-hidden rounded-3xl border border-orange-200/70 bg-white/84 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
            <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-orange-700">
              Ihr Ansprechpartner
            </p>
            <AdvisorBusinessImage
              imageUrl={advisorBanner.avatarUrl}
              name={advisorBanner.displayName}
              ratio="portrait"
              className="mx-auto w-full max-w-[210px] rounded-2xl"
            />
              <div className="space-y-3 px-2 pt-4 text-center">
                <div>
                  <p className="text-lg font-semibold text-zinc-900">{advisorBanner.displayName}</p>
                </div>
              <div className="mx-auto h-px w-24 bg-orange-200/80" />
              <div className="space-y-1.5 text-sm">
                <p className="font-medium text-zinc-800">
                  {advisorBanner.phone ?? "Telefon auf Anfrage"}
                </p>
                <p className="text-zinc-600">{advisorBanner.email ?? "E-Mail auf Anfrage"}</p>
              </div>
            </div>
          </aside>
        </div>

        <div className="my-5 h-px bg-orange-200/70" />

          <div className="grid gap-4 xl:grid-cols-[0.86fr_1.14fr]">
            <div className="rounded-3xl border border-amber-200/35 bg-[radial-gradient(circle_at_50%_0%,rgba(255,230,170,0.18),transparent_42%),linear-gradient(165deg,rgba(34,28,22,0.95),rgba(17,14,12,0.96))] p-3 shadow-[inset_0_1px_0_rgba(255,240,210,0.14),0_24px_46px_rgba(10,8,6,0.58)] md:p-4">
              <div className="flex justify-center">
                <div className="inline-flex items-center gap-2 rounded-b-2xl rounded-t-xl border border-amber-300/35 bg-[linear-gradient(180deg,rgba(253,214,135,0.95),rgba(228,172,69,0.94))] px-4 py-1.5 shadow-[0_10px_24px_rgba(188,132,40,0.33)]">
                  <TrophyIcon className="h-4 w-4 text-white" />
                  <span className="text-xs font-semibold tracking-[0.2em] text-amber-950">RANGLISTE</span>
                </div>
              </div>

              <div className="mt-3">
                <PodiumRanklist
                  entries={leaderboard}
                  currentReferrerId={referrerContext.referrerId}
                />
              </div>
            </div>

            <aside className="rounded-3xl border border-orange-200/70 bg-white/84 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_16px_30px_rgba(10,6,20,0.2)]">
              <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <SparklesIcon className="h-4 w-4 text-orange-700" />
                Dein nächstes Ziel
              </h3>

              <div className="mt-3 space-y-3">
                <div className="rounded-2xl border border-orange-200/70 bg-orange-50/80 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                    Letzte Empfehlungen
                  </p>
                  <div className="mt-2 space-y-2">
                    {recentReferrals.length === 0 ? (
                      <p className="text-xs text-zinc-600">Noch keine Empfehlungen vorhanden.</p>
                    ) : (
                      recentReferrals.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between rounded-lg border border-orange-200/70 bg-white/88 px-2.5 py-1.5"
                        >
                          <p className="truncate pr-2 text-xs font-medium text-zinc-900">{entry.name}</p>
                          <span
                            className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold ring-1 ${referralStatusClass(entry.status)}`}
                          >
                            {referralStatusLabel(entry.status)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-orange-200/70 bg-orange-50/80 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                    Levelziel
                  </p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900">
                    {levelProgress.next ? `Nächstes Level: ${levelProgress.next.label}` : "Top-Level erreicht"}
                  </p>
                  <p className="mt-1 text-xs text-zinc-700">
                    {levelProgress.next
                      ? `Noch ${formatPoints(pointsToNextLevel)} Punkte bis ${levelProgress.next.label}`
                      : "Du bist bereits im höchsten Level."}
                  </p>
                </div>

              </div>
            </aside>
          </div>
        </section>

      {loadError ? (
        <p className="rounded-xl border border-rose-300/70 bg-rose-50/90 px-3 py-2 text-sm text-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          Daten konnten nicht vollständig geladen werden: {loadError}
        </p>
      ) : null}
      {params.survey_saved === "1" ? (
        <p className="rounded-xl border border-emerald-300/70 bg-emerald-50/90 px-3 py-2 text-sm text-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          Ihre Umfrage-Antwort wurde gespeichert.
        </p>
      ) : null}
      {params.survey_error ? (
        <p className="rounded-xl border border-rose-300/70 bg-rose-50/90 px-3 py-2 text-sm text-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          Umfrage konnte nicht gespeichert werden: {decodeURIComponent(params.survey_error)}
        </p>
      ) : null}

    </main>
  );
}

