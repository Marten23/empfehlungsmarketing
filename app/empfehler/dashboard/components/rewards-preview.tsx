import Link from "next/link";
import type { Reward } from "@/lib/types/domain";
import { ArrowUpRightIcon, GiftIcon, SparklesIcon } from "@/app/empfehler/dashboard/components/icons";

type RewardsPreviewProps = {
  rewards: Reward[];
  pointsBalance: number;
};

export function RewardsPreview({ rewards, pointsBalance }: RewardsPreviewProps) {
  const preview = rewards.slice(0, 3);

  return (
    <section className="rounded-2xl border border-orange-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2.5 text-lg font-semibold text-zinc-900">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-orange-300/45 bg-orange-100/80 text-orange-700">
            <GiftIcon className="h-4 w-4" />
          </span>
          Prämien-Vorschau
        </h2>
        <Link
          href="/empfehler/praemien"
          className="group inline-flex items-center gap-2 text-sm font-medium text-orange-700 underline decoration-orange-300/60 underline-offset-4 transition-all duration-300 hover:text-orange-900 hover:decoration-orange-500/90 hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.25)]"
        >
          Alle ansehen
          <ArrowUpRightIcon className="h-3.5 w-3.5 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>

      {preview.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-600">
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
                className="group relative overflow-hidden rounded-xl bg-orange-50/80 p-3 ring-1 ring-orange-200/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.015] hover:bg-orange-100 hover:ring-orange-500/75 hover:shadow-[0_18px_36px_rgba(249,115,22,0.22),0_0_0_1px_rgba(251,146,60,0.24)]"
              >
                <span className="pointer-events-none absolute inset-0 rounded-xl ring-0 ring-orange-200/0 transition-all duration-300 group-hover:ring-1 group-hover:ring-orange-200/40" />
                <p className="inline-flex items-center gap-2.5 font-medium text-zinc-900 transition-colors duration-300 group-hover:text-orange-950">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-orange-300/45 bg-orange-100/80 text-orange-700 transition duration-300 group-hover:bg-orange-300/70 group-hover:text-orange-950 group-hover:shadow-[0_0_12px_rgba(59,130,246,0.28)]">
                    <SparklesIcon className="h-3.5 w-3.5" />
                  </span>
                  {title}
                </p>
                <p className="mt-1 text-xs text-zinc-500 transition-colors duration-300 group-hover:text-orange-700">
                  Punktewert: {reward.points_cost}
                </p>
                <p className="mt-2 text-xs text-zinc-700 transition-colors duration-300 group-hover:text-orange-800">
                  {missing > 0
                    ? `Noch ${missing} Punkte fehlen`
                    : "Einlösung jetzt möglich"}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

