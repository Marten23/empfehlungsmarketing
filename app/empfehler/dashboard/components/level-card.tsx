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
    surface: "from-violet-300/10 via-violet-300/5 to-transparent",
    ring: "ring-violet-300/22",
    iconWrap: "border-violet-300/35 bg-violet-300/10",
    iconColor: "text-violet-100",
    label: "text-violet-200",
    title: "text-violet-50",
    text: "text-violet-100/85",
    subtext: "text-violet-200/75",
  },
  bronze: {
    surface: "from-amber-300/14 via-amber-200/7 to-transparent",
    ring: "ring-amber-200/28",
    iconWrap: "border-violet-300/45 bg-violet-300/14",
    iconColor: "text-violet-100",
    label: "text-violet-200",
    title: "text-violet-50",
    text: "text-violet-100/85",
    subtext: "text-violet-200/75",
  },
  silber: {
    surface: "from-slate-200/16 via-slate-100/8 to-transparent",
    ring: "ring-slate-200/35",
    iconWrap: "border-violet-200/55 bg-violet-200/18",
    iconColor: "text-violet-50",
    label: "text-violet-100",
    title: "text-violet-50",
    text: "text-violet-100/85",
    subtext: "text-violet-200/75",
  },
  gold: {
    surface: "from-amber-300/18 via-amber-200/9 to-transparent",
    ring: "ring-amber-200/38",
    iconWrap: "border-emerald-300/55 bg-emerald-300/16",
    iconColor: "text-emerald-200",
    label: "text-emerald-200",
    title: "text-violet-50",
    text: "text-violet-100/85",
    subtext: "text-violet-200/75",
  },
  platin: {
    surface: "from-cyan-200/16 via-violet-200/8 to-transparent",
    ring: "ring-cyan-200/36",
    iconWrap: "border-emerald-200/60 bg-emerald-200/18",
    iconColor: "text-emerald-100",
    label: "text-emerald-100",
    title: "text-violet-50",
    text: "text-violet-100/85",
    subtext: "text-violet-200/75",
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
      className={`h-full rounded-2xl bg-gradient-to-br ${theme.surface} p-4 ring-1 ${theme.ring} shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]`}
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
