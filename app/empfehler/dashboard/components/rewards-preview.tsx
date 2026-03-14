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
    <section className="rounded-2xl bg-gradient-to-br from-violet-300/9 via-violet-300/5 to-transparent p-4 ring-1 ring-violet-300/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2.5 text-lg font-semibold text-violet-50">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-violet-300/35 bg-violet-300/12 text-violet-100">
            <GiftIcon className="h-4 w-4" />
          </span>
          Prämien-Vorschau
        </h2>
        <Link
          href="/empfehler/praemien"
          className="group inline-flex items-center gap-2 text-sm font-medium text-violet-200 underline decoration-violet-300/50 underline-offset-4 transition-all duration-300 hover:text-violet-100 hover:decoration-violet-200/80"
        >
          Alle ansehen
          <ArrowUpRightIcon className="h-3.5 w-3.5 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>

      {preview.length === 0 ? (
        <p className="mt-3 text-sm text-violet-100/80">
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
                className="group relative overflow-hidden rounded-xl bg-violet-400/8 p-3 ring-1 ring-violet-300/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.015] hover:brightness-[1.1] hover:ring-violet-200/45 hover:shadow-[0_18px_40px_rgba(26,16,40,0.45),0_0_0_1px_rgba(159,124,255,0.2)]"
              >
                <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-violet-100/24 to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
                <span className="pointer-events-none absolute inset-0 rounded-xl ring-0 ring-violet-200/0 transition-all duration-300 group-hover:ring-1 group-hover:ring-violet-200/35" />
                <p className="inline-flex items-center gap-2.5 font-medium text-violet-50">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-emerald-300/35 bg-emerald-300/12 text-emerald-200 transition duration-300 group-hover:bg-emerald-200/20 group-hover:text-emerald-100">
                    <SparklesIcon className="h-3.5 w-3.5" />
                  </span>
                  {title}
                </p>
                <p className="mt-1 text-xs text-violet-200/75">
                  Punktewert: {reward.points_cost}
                </p>
                <p className="mt-2 text-xs text-violet-100/85">
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
