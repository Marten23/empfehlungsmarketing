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

type AdvisorBannerData = {
  displayName: string;
  subtitle: string | null;
  phone: string | null;
  avatarUrl: string | null;
};

type LeaderboardEntry = {
  referrerId: string;
  name: string;
  points: number;
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "B";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

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
          ? "border-violet-300/70 bg-violet-100/90"
          : "border-violet-200/70 bg-white/82"
      }`}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-violet-700">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-zinc-900">{value}</p>
    </div>
  );
}

export default async function ReferrerDashboardPage() {
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
    avatarUrl: null,
  };

  let availablePoints = 0;
  let lifetimeLevelPoints = 0;
  let recentReferrals: Array<{ id: string; name: string; status: string }> = [];
  let rewards: Awaited<ReturnType<typeof listActiveRewardsForAdvisor>> = [];
  let leaderboard: LeaderboardEntry[] = [];
  let loadError: string | null = null;
  let levelThresholds = {
    bronze: 100,
    silver: 200,
    gold: 500,
    platinum: 1000,
  };

  try {
    const [rewardData, referrersData, ownPointsData, allPointsRows, referralData] =
      await Promise.all([
        listActiveRewardsForAdvisor(supabase, referrerContext.advisorId),
        listReferrersForAdvisor(supabase, referrerContext.advisorId),
        supabase
          .from("points_transactions")
          .select("points, transaction_type")
          .eq("advisor_id", referrerContext.advisorId)
          .eq("referrer_id", referrerContext.referrerId),
        supabase
          .from("points_transactions")
          .select("referrer_id, points, transaction_type")
          .eq("advisor_id", referrerContext.advisorId),
        listReferralsForReferrer(
          supabase,
          referrerContext.advisorId,
          referrerContext.referrerId,
        ),
      ]);

    if (ownPointsData.error) throw ownPointsData.error;
    if (allPointsRows.error) throw allPointsRows.error;

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
    for (const row of allPointsRows.data ?? []) {
      const referrerId = String(row.referrer_id ?? "");
      if (!referrerId) continue;
      const points = Number(row.points ?? 0);
      // Leaderboard auf Gesamtpunkte (verdiente Punkte), nicht auf Saldo.
      if (points <= 0) continue;
      pointsByReferrer.set(referrerId, (pointsByReferrer.get(referrerId) ?? 0) + points);
    }

    leaderboard = referrersData
      .filter((row) => row.is_active || row.id === referrerContext.referrerId)
      .map((row) => ({
        referrerId: row.id,
        name: formatReferrerName(row.first_name, row.last_name),
        points: pointsByReferrer.get(row.id) ?? 0,
      }))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return a.name.localeCompare(b.name, "de-DE");
      });

    const { data: advisorCore, error: advisorCoreError } = await supabase
      .from("advisors")
      .select("name, owner_user_id")
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

  const levelProgress = getLevelProgress(lifetimeLevelPoints, levelThresholds);
  const nextReward = getNextReward(rewards, availablePoints);

  const myRankIndex = leaderboard.findIndex(
    (row) => row.referrerId === referrerContext.referrerId,
  );
  const myRank = myRankIndex >= 0 ? myRankIndex + 1 : null;
  const rowAhead = myRankIndex > 0 ? leaderboard[myRankIndex - 1] : null;
  const myLeaderboardEntry = myRankIndex >= 0 ? leaderboard[myRankIndex] : null;

  const nextRewardTitle = nextReward?.reward?.title ?? "Prämie";
  const pointsToNextReward = nextReward?.pointsMissing ?? 0;
  const pointsToNextLevel = levelProgress.pointsToNextLevel;

  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 p-4 pb-8 md:gap-5 md:p-6">
      <div className={`pointer-events-none fixed inset-0 z-0 ${referrerTheme.backgroundClass}`} />
      <div
        className={`${referrerTheme.honeycombClass} ${referrerTheme.honeycombOpacityClass} pointer-events-none fixed inset-0 z-0`}
      />
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

      <ReferrerAreaHeader active="dashboard" />

      <section className="relative z-10 overflow-hidden rounded-3xl border border-violet-200/60 bg-violet-50/88 p-4 shadow-[0_28px_70px_rgba(5,3,12,0.4)] backdrop-blur-xl md:p-6">
        <div className="grid gap-5 xl:grid-cols-[1.55fr_0.9fr]">
          <div className="space-y-4">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-violet-300/50 bg-violet-100/85 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-violet-800">
                <SparklesIcon className="h-3.5 w-3.5" />
                Dein Überblick
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-zinc-900 md:text-3xl">
                Willkommen zurück, {referrerContext.firstName}
              </h1>
            </div>

            <div className="rounded-2xl border border-violet-200/70 bg-white/82 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">
                Dein persönlicher Empfehlungslink
              </p>
              <p className="mt-1 break-all rounded-lg border border-violet-200/70 bg-violet-50/70 px-2.5 py-1.5 font-mono text-[11px] text-zinc-700">
                {contactReferralLink}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <CopyLinkButton
                  value={contactReferralLink}
                  idleLabel="Link kopieren"
                  copiedLabel="Link kopiert"
                  className="rounded-lg border border-violet-300/55 bg-white px-3 py-1.5 text-xs font-medium text-violet-800 transition-all duration-300 hover:-translate-y-0.5 hover:bg-violet-100 hover:ring-1 hover:ring-violet-300/70"
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

            <div className="rounded-xl border border-violet-200/70 bg-white/80 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
              <div className="flex items-center justify-between gap-3">
                <p className="inline-flex items-center gap-2 text-xs font-medium text-zinc-700">
                  <BoltIcon className="h-4 w-4 text-violet-700" />
                  Fortschritt zur nächsten Prämie
                </p>
                <p className="text-xs font-semibold text-violet-800">
                  {nextReward?.progressPercent ?? 0} %
                </p>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-violet-100">
                <div
                  className="h-full rounded-full bg-violet-500 shadow-[0_0_12px_rgba(126,87,255,0.45)] transition-all"
                  style={{ width: `${nextReward?.progressPercent ?? 0}%` }}
                />
              </div>
            </div>
          </div>

          <aside className="overflow-hidden rounded-3xl border border-violet-200/70 bg-white/84 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
            <div className="relative h-52 bg-[radial-gradient(circle_at_24%_14%,rgba(143,98,255,0.35),transparent_46%),linear-gradient(180deg,rgba(109,69,221,0.24),rgba(109,69,221,0.04))]">
              {advisorBanner.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={advisorBanner.avatarUrl}
                  alt={advisorBanner.displayName}
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="inline-flex h-24 w-24 items-center justify-center rounded-full border border-violet-300/70 bg-violet-100/90 text-2xl font-semibold text-violet-800">
                    {getInitials(advisorBanner.displayName)}
                  </span>
                </div>
              )}
            </div>
              <div className="space-y-3 px-4 py-4 text-center">
                <div>
                  <p className="text-lg font-semibold text-zinc-900">{advisorBanner.displayName}</p>
                </div>
              <div className="mx-auto h-px w-24 bg-violet-200/80" />
              <div className="space-y-1.5 text-sm">
                <p className="font-medium text-zinc-800">
                  {advisorBanner.phone ?? "Telefon auf Anfrage"}
                </p>
                <p className="text-zinc-600">E-Mail über den Beraterbereich</p>
              </div>
            </div>
          </aside>
        </div>

        <div className="my-5 h-px bg-violet-200/70" />

          <div className="grid gap-4 xl:grid-cols-[0.86fr_1.14fr]">
            <div className="rounded-3xl border border-violet-300/60 bg-[linear-gradient(160deg,rgba(62,33,110,0.92),rgba(38,20,70,0.9))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_24px_46px_rgba(16,8,30,0.45)] md:p-4">
              <div className="mx-auto inline-flex items-center gap-2 rounded-b-2xl rounded-t-xl border border-fuchsia-300/45 bg-[linear-gradient(180deg,rgba(246,97,176,0.9),rgba(214,45,141,0.92))] px-4 py-1.5 shadow-[0_10px_24px_rgba(214,45,141,0.3)]">
                <TrophyIcon className="h-4 w-4 text-white" />
                <span className="text-xs font-semibold tracking-[0.2em] text-white">LEADERBOARD</span>
              </div>

              <div className="mt-3 space-y-2">
                {leaderboard.length === 0 ? (
                  <div className="rounded-xl border border-violet-300/35 bg-violet-900/35 px-3 py-2 text-xs text-violet-100/85">
                    Noch keine Ranglistendaten vorhanden.
                  </div>
                ) : (
                  leaderboard.slice(0, 8).map((entry, index) => {
                    const rank = index + 1;
                    const isTop3 = rank <= 3;
                    const isCurrent = entry.referrerId === referrerContext.referrerId;
                    const medal =
                      rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;

                    return (
                      <div
                        key={entry.referrerId}
                        className={`rounded-xl border px-3 py-2 ${
                          isTop3
                            ? "border-fuchsia-300/45 bg-violet-900/40"
                            : "border-violet-300/30 bg-violet-950/25"
                        } ${isCurrent ? "ring-1 ring-fuchsia-300/55" : ""}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex min-w-[38px] items-center justify-center gap-1 text-sm font-semibold text-violet-100">
                            {medal ? <span className="text-base leading-none">{medal}</span> : null}
                            <span>{rank}</span>
                          </div>
                          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
                            {entry.name}
                            {isCurrent ? (
                              <span className="ml-2 text-[11px] font-medium text-fuchsia-200/95">
                                Du
                              </span>
                            ) : null}
                          </p>
                          <p className="text-sm font-semibold text-fuchsia-100">
                            {formatPoints(entry.points)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {myRank && myRank > 8 ? (
                <div className="mx-auto mt-3 max-w-md rounded-2xl border border-fuchsia-300/45 bg-violet-950/45 px-4 py-2.5 text-center shadow-[0_18px_32px_rgba(14,8,27,0.45)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-fuchsia-200/90">
                    Dein Platz
                  </p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {myRank}. {formatPoints(myLeaderboardEntry?.points ?? availablePoints)} Punkte
                  </p>
                  {rowAhead ? (
                    <p className="mt-1 text-xs text-violet-100/85">
                      Vor dir: {myRank - 1}. {rowAhead.name} · {formatPoints(rowAhead.points)} Punkte
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <aside className="rounded-3xl border border-violet-200/70 bg-white/84 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_16px_30px_rgba(10,6,20,0.2)]">
              <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <SparklesIcon className="h-4 w-4 text-violet-700" />
                Dein nächstes Ziel
              </h3>

              <div className="mt-3 space-y-3">
                <div className="rounded-2xl border border-violet-200/70 bg-violet-50/80 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                    Letzte Empfehlungen
                  </p>
                  <div className="mt-2 space-y-2">
                    {recentReferrals.length === 0 ? (
                      <p className="text-xs text-zinc-600">Noch keine Empfehlungen vorhanden.</p>
                    ) : (
                      recentReferrals.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between rounded-lg border border-violet-200/70 bg-white/88 px-2.5 py-1.5"
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

                <div className="rounded-2xl border border-violet-200/70 bg-violet-50/80 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
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

    </main>
  );
}

