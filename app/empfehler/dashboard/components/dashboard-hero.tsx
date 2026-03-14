import { SparklesIcon } from "@/app/empfehler/dashboard/components/icons";

type DashboardHeroProps = {
  firstName: string;
  advisorName: string;
};

export function DashboardHero({ firstName, advisorName }: DashboardHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-300/12 via-violet-300/5 to-transparent px-3 py-3 ring-1 ring-violet-200/15">
      <div className="relative space-y-3">
        <span className="inline-flex items-center gap-2.5 rounded-full border border-violet-300/40 bg-violet-400/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-violet-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-300/20 text-violet-100">
            <SparklesIcon className="h-3 w-3" />
          </span>
          Willkommen zurück
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-violet-50 drop-shadow-[0_2px_8px_rgba(26,16,40,0.35)] md:text-4xl">
          Dein Empfehlungsbereich, {firstName}
        </h1>
        <p className="max-w-3xl text-sm text-violet-100/85 md:text-base">
          Du sammelst hier Punkte für erfolgreiche Empfehlungen bei{" "}
          <span className="font-semibold text-violet-50">{advisorName}</span>. Halte
          dein nächstes Ziel im Blick und löse Prämien ein, sobald du genug Punkte
          erreicht hast.
        </p>
      </div>
    </section>
  );
}
