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

type ReferrerRewardsPageProps = {
  searchParams: Promise<{ redeemed?: string; reason?: string; sort?: string }>;
};

export default async function ReferrerRewardsPage({
  searchParams,
}: ReferrerRewardsPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const referrerContext = await getCurrentReferrerContext(supabase);

  if (!referrerContext) {
    redirect("/empfehler/login");
  }

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
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Praemien</h1>
        <p className="text-sm text-zinc-600">
          Verfuegbare Praemien von {referrerContext.advisorName}
        </p>
        <Link href="/empfehler/dashboard" className="text-sm text-zinc-800 underline">
          Zurueck zum Dashboard
        </Link>
      </header>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="text-xs text-zinc-500">Verfuegbare Punkte</p>
        <p className="mt-1 text-3xl font-semibold text-zinc-900">{balance}</p>
      </section>

      {params.redeemed === "1" ? (
        <p className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Praemie erfolgreich eingeloest.
        </p>
      ) : null}
      {params.redeemed === "0" ? (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          Einloesung fehlgeschlagen.{params.reason ? ` Grund: ${params.reason}` : ""}
        </p>
      ) : null}
      {loadError ? (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          Daten konnten nicht vollstaendig geladen werden: {loadError}
        </p>
      ) : null}

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-zinc-700">
            Sortierung nach Punktewert:{" "}
            <span className="font-medium text-zinc-900">
              {sort === "asc" ? "aufsteigend" : "absteigend"}
            </span>
          </p>
          <Link
            href={`/empfehler/praemien?sort=${sort === "asc" ? "desc" : "asc"}`}
            className="rounded border border-zinc-300 px-3 py-1 text-sm text-zinc-800"
          >
            {sort === "asc" ? "Absteigend anzeigen" : "Aufsteigend anzeigen"}
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {sortedRewards.length === 0 ? (
          <article className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
            Aktuell sind keine aktiven Praemien verfuegbar.
          </article>
        ) : (
          sortedRewards.map((reward) => {
            const canRedeem = balance >= reward.points_cost;
            return (
              <article
                key={reward.id}
                className="rounded-lg border border-zinc-200 bg-white p-4"
              >
                {reward.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={reward.image_url}
                    alt={reward.title || reward.name || "Praemie"}
                    className="mb-3 h-40 w-full rounded object-cover"
                    style={{
                      objectPosition: `${reward.image_focus_x ?? 50}% ${reward.image_focus_y ?? 50}%`,
                    }}
                  />
                ) : null}
                <h2 className="text-lg font-semibold text-zinc-900">
                  {reward.title || reward.name}
                </h2>
                {reward.description ? (
                  <p className="mt-2 text-sm text-zinc-600">{reward.description}</p>
                ) : null}
                {reward.motivation_text ? (
                  <p className="mt-2 rounded bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                    {reward.motivation_text}
                  </p>
                ) : null}
                <p className="mt-3 text-sm font-medium text-zinc-900">
                  Punktewert: {reward.points_cost}
                </p>
                {reward.external_product_url ? (
                  <a
                    href={reward.external_product_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex text-sm text-zinc-800 underline"
                  >
                    Details ansehen
                  </a>
                ) : null}

                <div className="mt-4">
                  <RedeemForm
                    rewardId={reward.id}
                    rewardTitle={reward.title || reward.name || "Praemie"}
                    pointsCost={reward.points_cost}
                    canRedeem={canRedeem}
                  />
                  {!canRedeem ? (
                    <p className="mt-2 text-xs text-red-600">
                      Noch {Math.max(0, reward.points_cost - balance)} Punkte fehlen.
                    </p>
                  ) : null}
                </div>
              </article>
            );
          })
        )}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-medium text-zinc-900">Meine Einloesungen</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-zinc-500">
              <tr>
                <th className="px-2 py-2">Datum</th>
                <th className="px-2 py-2">Punkte</th>
                <th className="px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {redemptions.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-2 py-4 text-zinc-500">
                    Noch keine Einloesungen vorhanden.
                  </td>
                </tr>
              ) : (
                redemptions.map((row) => (
                  <tr key={row.id}>
                    <td className="px-2 py-2 text-zinc-700">
                      {new Date(row.created_at).toLocaleString("de-DE")}
                    </td>
                    <td className="px-2 py-2 text-zinc-700">
                      -{row.requested_points_cost}
                    </td>
                    <td className="px-2 py-2 text-zinc-700">{row.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
