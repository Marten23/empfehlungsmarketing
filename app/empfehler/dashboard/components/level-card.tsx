import type { ReferrerLevel } from "@/app/empfehler/dashboard/gamification";
import { ProgressBar } from "@/app/empfehler/dashboard/components/progress-bar";
import { TrophyIcon } from "@/app/empfehler/dashboard/components/icons";

type LevelCardProps = {
  lifetimePoints: number;
  currentLevel: ReferrerLevel;
  nextLevel: ReferrerLevel | null;
  pointsToNextLevel: number;
  progressPercent: number;
  pointsInCurrentLevel: number;
  pointsNeededInLevel: number;
};

type LevelTheme = {
  surface: string;
  ring: string;
  iconWrap: string;
  iconColor: string;
  label: string;
  title: string;
  text: string;
  subtext: string;
};

const levelThemes: Record<ReferrerLevel["key"], LevelTheme> = {
  none: {
    surface: "bg-white/84",
    ring: "border-orange-200/55",
    iconWrap: "border-orange-300/45 bg-orange-100/80",
    iconColor: "text-orange-700",
    label: "text-orange-700",
    title: "text-zinc-900",
    text: "text-zinc-700",
    subtext: "text-zinc-500",
  },
  bronze: {
    surface: "bg-amber-50/92",
    ring: "border-amber-200/70",
    iconWrap: "border-amber-300/55 bg-amber-100/70",
    iconColor: "text-amber-700",
    label: "text-amber-700",
    title: "text-zinc-900",
    text: "text-zinc-700",
    subtext: "text-zinc-500",
  },
  silber: {
    surface: "bg-slate-50/92",
    ring: "border-slate-200/80",
    iconWrap: "border-slate-300/65 bg-slate-100/85",
    iconColor: "text-slate-700",
    label: "text-slate-700",
    title: "text-zinc-900",
    text: "text-zinc-700",
    subtext: "text-zinc-500",
  },
  gold: {
    surface: "bg-amber-50/95",
    ring: "border-amber-300/70",
    iconWrap: "border-amber-300/65 bg-amber-100/85",
    iconColor: "text-amber-700",
    label: "text-amber-700",
    title: "text-zinc-900",
    text: "text-zinc-700",
    subtext: "text-zinc-500",
  },
  platin: {
    surface: "bg-cyan-50/92",
    ring: "border-cyan-200/75",
    iconWrap: "border-cyan-300/65 bg-cyan-100/80",
    iconColor: "text-cyan-700",
    label: "text-cyan-700",
    title: "text-zinc-900",
    text: "text-zinc-700",
    subtext: "text-zinc-500",
  },
};

export function LevelCard({
  lifetimePoints,
  currentLevel,
  nextLevel,
  pointsToNextLevel,
  progressPercent,
  pointsInCurrentLevel,
  pointsNeededInLevel,
}: LevelCardProps) {
  const theme = levelThemes[currentLevel.key];

  return (
    <section
      className={`h-full rounded-2xl border ${theme.ring} ${theme.surface} p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]`}
    >
      <span
        className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${theme.iconWrap} ${theme.iconColor}`}
      >
        <TrophyIcon className="h-5 w-5" />
      </span>
      <p className={`mt-2 text-xs font-medium uppercase tracking-wide ${theme.label}`}>
        Mein Level
      </p>
      <p className={`mt-2 text-3xl font-semibold ${theme.title}`}>{currentLevel.label}</p>
      <p className={`mt-1 text-sm ${theme.text}`}>
        Gesammelte Punkte für Ihr Level: {lifetimePoints}
      </p>

      {nextLevel ? (
        <>
          <p className={`mt-2 text-sm ${theme.text}`}>
            Noch {pointsToNextLevel} Punkte bis {nextLevel.label}
          </p>
          <div className="mt-3 space-y-2">
            <ProgressBar value={progressPercent} />
            <p className={`text-xs ${theme.subtext}`}>
              {pointsInCurrentLevel} / {pointsNeededInLevel} Punkte bis zum nächsten
              Level
            </p>
          </div>
        </>
      ) : (
        <p className={`mt-2 text-sm ${theme.text}`}>
          Du hast bereits das höchste Level erreicht.
        </p>
      )}
    </section>
  );
}
