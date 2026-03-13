import type { ReferrerLevel } from "@/app/empfehler/dashboard/gamification";
import { ProgressBar } from "@/app/empfehler/dashboard/components/progress-bar";

type LevelCardProps = {
  currentLevel: ReferrerLevel;
  nextLevel: ReferrerLevel | null;
  pointsToNextLevel: number;
  progressPercent: number;
  pointsInCurrentLevel: number;
  pointsNeededInLevel: number;
};

export function LevelCard({
  currentLevel,
  nextLevel,
  pointsToNextLevel,
  progressPercent,
  pointsInCurrentLevel,
  pointsNeededInLevel,
}: LevelCardProps) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Mein Level
      </p>
      <p className="mt-2 text-3xl font-semibold text-zinc-900">{currentLevel.label}</p>

      {nextLevel ? (
        <>
          <p className="mt-2 text-sm text-zinc-700">
            Noch {pointsToNextLevel} Punkte bis {nextLevel.label}
          </p>
          <div className="mt-3 space-y-2">
            <ProgressBar value={progressPercent} />
            <p className="text-xs text-zinc-500">
              {pointsInCurrentLevel} / {pointsNeededInLevel} Punkte bis zum naechsten
              Level
            </p>
          </div>
        </>
      ) : (
        <p className="mt-2 text-sm text-zinc-700">
          Du hast bereits das hoechste Level erreicht.
        </p>
      )}
    </section>
  );
}
