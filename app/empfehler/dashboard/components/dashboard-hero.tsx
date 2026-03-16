import { SparklesIcon } from "@/app/empfehler/dashboard/components/icons";

type DashboardHeroProps = {
  firstName: string;
  advisorName: string;
};

export function DashboardHero({ firstName, advisorName }: DashboardHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-violet-200/65 bg-violet-50/88 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
      <div className="relative space-y-3">
        <span className="inline-flex items-center gap-2.5 rounded-full border border-violet-300/45 bg-violet-200/55 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-violet-800">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-300/40 text-violet-800">
            <SparklesIcon className="h-3 w-3" />
          </span>
          Willkommen zurück
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
          Dein Empfehlungsbereich, {firstName}
        </h1>
        <p className="max-w-3xl text-sm text-zinc-700 md:text-base">
          Du sammelst hier Punkte für erfolgreiche Empfehlungen bei{" "}
          <span className="font-semibold text-zinc-900">{advisorName}</span>. Halte
          dein nächstes Ziel im Blick und löse Prämien ein, sobald du genug Punkte
          erreicht hast.
        </p>
      </div>
    </section>
  );
}
