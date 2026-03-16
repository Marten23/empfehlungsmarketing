import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentReferrerContext } from "@/lib/auth/referrer";
import { getPointsBalanceForReferrer } from "@/lib/queries/points";
import {
  listActiveRewardsForAdvisor,
  listRewardRedemptionsForReferrer,
} from "@/lib/queries/rewards";
import { normalizeSupabaseError } from "@/lib/supabase/errors";
import { RedeemForm } from "@/app/empfehler/praemien/redeem-form";
import {
  ArrowUpRightIcon,
  GiftIcon,
  SparklesIcon,
  TrophyIcon,
} from "@/app/empfehler/dashboard/components/icons";
import { ReferrerAreaHeader } from "@/app/empfehler/components/referrer-area-header";
import { getReferrerTheme } from "@/lib/ui/referrer-theme";

type ReferrerRewardsPageProps = {
  searchParams: Promise<{ redeemed?: string; reason?: string; sort?: string }>;
};

function redemptionStatusBadgeClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "offen") return "bg-amber-100 text-amber-800 ring-amber-200";
  if (normalized === "bearbeitet" || normalized === "bestellt") {
    return "bg-indigo-100 text-indigo-700 ring-indigo-200";
  }
  if (normalized === "abgeschlossen") {
    return "bg-emerald-100 text-emerald-800 ring-emerald-200";
  }
  if (normalized === "abgelehnt") return "bg-rose-100 text-rose-700 ring-rose-200";
  return "bg-zinc-100 text-zinc-700 ring-zinc-200";
}

export default async function ReferrerRewardsPage({
  searchParams,
}: ReferrerRewardsPageProps) {
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

  let balance = 0;
  let rewards: Awaited<ReturnType<typeof listActiveRewardsForAdvisor>> = [];
  let redemptions: Awaited<ReturnType<typeof listRewardRedemptionsForReferrer>> =
    [];
  let loadError: string | null = null;

  try {
    balance = await getPointsBalanceForReferrer(
      supabase,
      referrerContext.advisorId,
      referrerContext.referrerId,
    );
    rewards = await listActiveRewardsForAdvisor(supabase, referrerContext.advisorId);
    redemptions = await listRewardRedemptionsForReferrer(
      supabase,
      referrerContext.advisorId,
      referrerContext.referrerId,
    );
  } catch (error) {
    loadError = normalizeSupabaseError(error).message;
  }

  const sort = params.sort === "desc" ? "desc" : "asc";
  const sortedRewards = [...rewards].sort((a, b) => {
    const byPoints = a.points_cost - b.points_cost;
    if (byPoints !== 0) return sort === "asc" ? byPoints : -byPoints;
    return (a.created_at ?? "").localeCompare(b.created_at ?? "");
  });

  return (
    <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 p-6">
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

      <ReferrerAreaHeader active="praemien" />

      <section className="relative z-10 overflow-hidden rounded-3xl border border-violet-200/55 bg-violet-50/88 p-5 shadow-[0_24px_60px_rgba(5,3,12,0.38)] backdrop-blur-xl md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-300/45 bg-violet-200/45 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-violet-800">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-300/35 text-violet-800">
                <GiftIcon className="h-3.5 w-3.5" />
              </span>
              Prämienbereich
            </span>
            <h1 className="text-2xl font-semibold text-zinc-900 md:text-3xl">Ihre Prämien</h1>
            <p className="text-sm text-zinc-700 md:text-base">
              Verfügbare Belohnungen von <span className="font-semibold text-zinc-900">{referrerContext.advisorName}</span>
            </p>
          </div>

          <div className="rounded-2xl border border-violet-200/65 bg-violet-50/92 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-violet-700">
              <TrophyIcon className="h-4 w-4" />
              Verfügbare Punkte
            </p>
            <p className="mt-1 text-3xl font-semibold text-zinc-900">{balance}</p>
            <p className="mt-1 text-xs text-zinc-600">Nur einlösbare Prämien werden aktiv angezeigt.</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href="/empfehler/dashboard"
            className="inline-flex items-center gap-2 text-sm text-violet-700 underline decoration-violet-300/60 underline-offset-4 transition-all duration-300 hover:text-violet-900 hover:decoration-violet-500/90"
          >
            Zurück zum Dashboard
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-300/40 bg-violet-100/80 px-3 py-1 text-xs text-violet-700">
            <SparklesIcon className="h-3.5 w-3.5" />
            {sortedRewards.filter((r) => r.points_cost <= balance).length} Prämien aktuell einlösbar
          </span>
        </div>
      </section>

      {params.redeemed === "1" ? (
        <p className="rounded-xl border border-emerald-300/65 bg-emerald-50/95 px-3 py-2 text-sm text-emerald-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          Prämie erfolgreich eingelöst.
        </p>
      ) : null}
      {params.redeemed === "0" ? (
        <p className="rounded-xl border border-rose-300/70 bg-rose-50/95 px-3 py-2 text-sm text-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          Einlösung fehlgeschlagen.{params.reason ? ` Grund: ${params.reason}` : ""}
        </p>
      ) : null}
      {loadError ? (
        <p className="rounded-xl border border-rose-300/70 bg-rose-50/95 px-3 py-2 text-sm text-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          Daten konnten nicht vollständig geladen werden: {loadError}
        </p>
      ) : null}

      <section className="relative z-10 rounded-2xl border border-violet-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-zinc-700">
            Sortierung nach Punktewert: <span className="font-medium text-zinc-900">{sort === "asc" ? "aufsteigend" : "absteigend"}</span>
          </p>
          <Link
            href={`/empfehler/praemien?sort=${sort === "asc" ? "desc" : "asc"}`}
            className="group inline-flex items-center gap-2 rounded-lg border border-violet-300/55 bg-white px-3 py-1.5 text-sm font-medium text-violet-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-violet-100 hover:text-violet-900 hover:ring-1 hover:ring-violet-300/65"
          >
            {sort === "asc" ? "Absteigend anzeigen" : "Aufsteigend anzeigen"}
            <ArrowUpRightIcon className="h-3.5 w-3.5 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </section>

      <section className="relative z-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sortedRewards.length === 0 ? (
          <article className="rounded-2xl border border-violet-200/55 bg-white/82 p-4 text-sm text-zinc-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
            Aktuell sind keine aktiven Prämien verfügbar.
          </article>
        ) : (
          sortedRewards.map((reward) => {
            const canRedeem = balance >= reward.points_cost;
            const title = reward.title || reward.name || "Belohnung";

            return (
              <article
                key={reward.id}
                className="group relative overflow-hidden rounded-2xl border border-violet-200/70 bg-violet-50/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] transition-all duration-300 hover:-translate-y-1 hover:bg-violet-100 hover:ring-1 hover:ring-violet-400/60 hover:shadow-[0_18px_36px_rgba(76,29,149,0.22)]"
              >
                {reward.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={reward.image_url}
                    alt={title}
                    className="mb-3 h-40 w-full rounded-xl object-cover"
                    style={{
                      objectPosition: `${reward.image_focus_x ?? 50}% ${reward.image_focus_y ?? 50}%`,
                    }}
                  />
                ) : (
                  <div className="mb-3 flex h-40 w-full items-center justify-center rounded-xl border border-violet-200/70 bg-violet-100/70 text-violet-700">
                    <GiftIcon className="h-8 w-8" />
                  </div>
                )}

                <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
                {reward.description ? (
                  <p className="mt-2 line-clamp-3 text-sm text-zinc-700">{reward.description}</p>
                ) : null}
                {reward.motivation_text ? (
                  <p className="mt-2 rounded-lg border border-violet-200/60 bg-violet-100/70 px-3 py-2 text-sm text-violet-800">
                    {reward.motivation_text}
                  </p>
                ) : null}

                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-900">Punktewert: {reward.points_cost}</p>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
                      canRedeem
                        ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
                        : "bg-amber-100 text-amber-800 ring-amber-200"
                    }`}
                  >
                    {canRedeem ? "Einlösung möglich" : `Noch ${Math.max(0, reward.points_cost - balance)} Punkte`}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  {reward.external_product_url ? (
                    <a
                      href={reward.external_product_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-violet-700 underline decoration-violet-300/60 underline-offset-4 transition-all duration-300 hover:text-violet-900 hover:decoration-violet-500/90"
                    >
                      Details ansehen
                      <ArrowUpRightIcon className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <span className="text-sm text-zinc-500">Kein externer Link</span>
                  )}
                  <RedeemForm
                    rewardId={reward.id}
                    rewardTitle={title}
                    pointsCost={reward.points_cost}
                    canRedeem={canRedeem}
                  />
                </div>
              </article>
            );
          })
        )}
      </section>

      <section className="relative z-10 rounded-2xl border border-violet-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
        <h2 className="text-sm font-medium text-zinc-900">Meine Einlösungen</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-zinc-500">
              <tr>
                <th className="px-2 py-2">Datum</th>
                <th className="px-2 py-2">Punkte</th>
                <th className="px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-100">
              {redemptions.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-2 py-4 text-zinc-500">
                    Noch keine Einlösungen vorhanden.
                  </td>
                </tr>
              ) : (
                redemptions.map((row) => (
                  <tr key={row.id}>
                    <td className="px-2 py-2 text-zinc-700">
                      {new Date(row.created_at).toLocaleString("de-DE")}
                    </td>
                    <td className="px-2 py-2 font-medium text-rose-700">-{row.requested_points_cost}</td>
                    <td className="px-2 py-2">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ring-1 ${redemptionStatusBadgeClass(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}


