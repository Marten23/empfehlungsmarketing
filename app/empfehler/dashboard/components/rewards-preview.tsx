import Link from "next/link";
import type { Reward } from "@/lib/types/domain";

type RewardsPreviewProps = {
  rewards: Reward[];
  pointsBalance: number;
};

export function RewardsPreview({ rewards, pointsBalance }: RewardsPreviewProps) {
  const preview = rewards.slice(0, 3);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">Belohnungen</h2>
        <Link
          href="/empfehler/praemien"
          className="text-sm font-medium text-zinc-800 underline"
        >
          Alle ansehen
        </Link>
      </div>

      {preview.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">
          Ihr Berater hat aktuell noch keine aktiven Belohnungen hinterlegt.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {preview.map((reward) => {
            const title = reward.title || reward.name || "Belohnung";
            const missing = Math.max(0, reward.points_cost - pointsBalance);
            return (
              <article
                key={reward.id}
                className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
              >
                <p className="font-medium text-zinc-900">{title}</p>
                <p className="mt-1 text-xs text-zinc-600">
                  Punktewert: {reward.points_cost}
                </p>
                <p className="mt-2 text-xs text-zinc-700">
                  {missing > 0
                    ? `Noch ${missing} Punkte fehlen`
                    : "Einloesung jetzt moeglich"}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
