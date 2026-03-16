import { SparklesIcon } from "@/app/empfehler/dashboard/components/icons";

type MotivationCardProps = {
  hints: string[];
};

export function MotivationCard({ hints }: MotivationCardProps) {
  return (
    <section className="rounded-2xl border border-violet-200/55 bg-white/82 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
      <p className="inline-flex items-center gap-2.5 text-xs font-medium uppercase tracking-wide text-violet-700">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-violet-300/45 bg-violet-100/80 text-violet-700">
          <SparklesIcon className="h-4 w-4" />
        </span>
        Motivation
      </p>
      {hints.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-600">
          Deine Fortschritte erscheinen automatisch, sobald Daten vorliegen.
        </p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm text-zinc-800">
          {hints.map((hint, index) => (
            <li
              key={hint}
              className="rounded-xl bg-violet-50/85 px-3 py-2 ring-1 ring-violet-200/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]"
            >
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">
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
