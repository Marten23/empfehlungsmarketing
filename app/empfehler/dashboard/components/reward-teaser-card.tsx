import type { Reward } from "@/lib/types/domain";
import { ProgressBar } from "@/app/empfehler/dashboard/components/progress-bar";
import { GiftIcon, TargetIcon } from "@/app/empfehler/dashboard/components/icons";

type RewardTeaserCardProps = {
  nextReward:
    | {
        reward: Reward;
        pointsMissing: number;
        progressPercent: number;
      }
    | null;
  availablePoints: number;
};

export function RewardTeaserCard({
  nextReward,
  availablePoints,
}: RewardTeaserCardProps) {
  return (
    <section className="h-full rounded-2xl border border-zinc-200/85 bg-white/95 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
      <div className="inline-flex items-center gap-2">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-orange-300/45 bg-orange-100/80 text-orange-700">
          <GiftIcon className="h-5 w-5" />
        </span>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-orange-300/45 bg-orange-100/80 text-orange-700">
          <TargetIcon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-orange-700">
        Nächste Belohnung
      </p>

      {!nextReward ? (
        <p className="mt-3 text-sm text-zinc-600">
          Aktuell ist noch keine aktive Prämie verfügbar.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-lg font-semibold text-zinc-900">
            {nextReward.reward.title || nextReward.reward.name || "Belohnung"}
          </p>
          <p className="text-sm text-zinc-700">
            {nextReward.pointsMissing > 0
              ? `Noch ${nextReward.pointsMissing} Punkte bis zur nächsten Prämie`
              : "Du kannst diese Prämie jetzt einlösen."}
          </p>
          <ProgressBar value={nextReward.progressPercent} />
          <p className="text-xs text-zinc-500">
            {Math.max(0, availablePoints)} / {nextReward.reward.points_cost} Punkte
          </p>
        </div>
      )}
    </section>
  );
}
