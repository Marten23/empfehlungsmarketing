import type { Reward } from "@/lib/types/domain";
import { ProgressBar } from "@/app/empfehler/dashboard/components/progress-bar";

type PointsOverviewCardProps = {
  pointsBalance: number;
  nextReward:
    | {
        reward: Reward;
        pointsMissing: number;
        progressPercent: number;
      }
    | null;
};

export function PointsOverviewCard({
  pointsBalance,
  nextReward,
}: PointsOverviewCardProps) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Punktestand
      </p>
      <p className="mt-2 text-4xl font-semibold text-zinc-900">{pointsBalance}</p>
      <p className="text-sm text-zinc-600">Aktuelle Punkte</p>

      {nextReward ? (
        <div className="mt-5 space-y-2">
          <p className="text-sm text-zinc-700">
            {nextReward.pointsMissing > 0
              ? `Noch ${nextReward.pointsMissing} Punkte bis ${nextReward.reward.title || nextReward.reward.name || "zur naechsten Belohnung"}`
              : "Du hast die hoechste verfuegbare Belohnung bereits erreicht."}
          </p>
          <ProgressBar value={nextReward.progressPercent} />
          <p className="text-xs text-zinc-500">
            {Math.max(0, pointsBalance)} / {nextReward.reward.points_cost} Punkte
          </p>
        </div>
      ) : (
        <p className="mt-5 text-sm text-zinc-500">
          Aktuell sind noch keine aktiven Belohnungen verfuegbar.
        </p>
      )}
    </section>
  );
}
