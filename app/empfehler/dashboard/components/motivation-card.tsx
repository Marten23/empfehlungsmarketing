type MotivationCardProps = {
  hints: string[];
};

export function MotivationCard({ hints }: MotivationCardProps) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Motivation
      </p>
      {hints.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-600">
          Deine Fortschritte erscheinen automatisch, sobald Daten vorliegen.
        </p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm text-zinc-700">
          {hints.map((hint) => (
            <li key={hint} className="rounded bg-zinc-50 px-3 py-2">
              {hint}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
