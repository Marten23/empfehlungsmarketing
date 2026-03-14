import { SparklesIcon } from "@/app/empfehler/dashboard/components/icons";

type MotivationCardProps = {
  hints: string[];
};

export function MotivationCard({ hints }: MotivationCardProps) {
  return (
    <section className="rounded-3xl bg-gradient-to-br from-violet-400/10 via-violet-300/6 to-transparent p-5 ring-1 ring-violet-300/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <p className="inline-flex items-center gap-2.5 text-xs font-medium uppercase tracking-wide text-violet-200">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-violet-300/35 bg-violet-300/14 text-violet-100">
          <SparklesIcon className="h-4 w-4" />
        </span>
        Motivation
      </p>
      {hints.length === 0 ? (
        <p className="mt-3 text-sm text-violet-100/80">
          Deine Fortschritte erscheinen automatisch, sobald Daten vorliegen.
        </p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm text-violet-50">
          {hints.map((hint, index) => (
            <li
              key={hint}
              className="rounded-xl bg-violet-300/8 px-3 py-2 ring-1 ring-violet-300/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            >
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-300/20 text-xs font-semibold text-emerald-200">
                {index + 1}
              </span>
              {hint}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
