import type { Reward } from "@/lib/types/domain";
import { ProgressBar } from "@/app/empfehler/dashboard/components/progress-bar";
import { BoltIcon } from "@/app/empfehler/dashboard/components/icons";

type PointsOverviewCardProps = {
  availablePoints: number;
  nextReward:
    | {
        reward: Reward;
        pointsMissing: number;
        progressPercent: number;
      }
    | null;
};

export function PointsOverviewCard({
  availablePoints,
  nextReward,
}: PointsOverviewCardProps) {
  return (
    <section className="h-full rounded-2xl bg-gradient-to-br from-violet-300/12 via-violet-400/6 to-transparent p-4 ring-1 ring-violet-300/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.11)]">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-violet-300/35 bg-violet-300/15 text-violet-100">
        <BoltIcon className="h-5 w-5" />
      </span>
      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-violet-200">
        Verfügbare Punkte
      </p>
      <p className="mt-2 text-5xl font-semibold tracking-tight text-violet-50 drop-shadow-[0_4px_14px_rgba(26,16,40,0.35)]">
        {availablePoints}
      </p>
      <p className="text-sm text-violet-100/80">Aktuell einlösbar</p>

      {nextReward ? (
        <div className="mt-5 space-y-2">
          <p className="text-sm text-violet-100/85">
            {nextReward.pointsMissing > 0
              ? `Noch ${nextReward.pointsMissing} Punkte bis ${nextReward.reward.title || nextReward.reward.name || "zur nächsten Belohnung"}`
              : "Du hast die höchste verfügbare Belohnung bereits erreicht."}
          </p>
          <ProgressBar value={nextReward.progressPercent} />
          <p className="text-xs text-violet-200/75">
            {Math.max(0, availablePoints)} / {nextReward.reward.points_cost} Punkte
          </p>
        </div>
      ) : (
        <p className="mt-5 text-sm text-violet-100/80">
          Aktuell sind noch keine aktiven Belohnungen verfügbar.
        </p>
      )}
    </section>
  );
}
