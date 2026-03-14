import Link from "next/link";
import { ArrowUpRightIcon, BookIcon } from "@/app/empfehler/dashboard/components/icons";

type RecentTransactionItem = {
  id: string;
  createdAt: string;
  label: string;
  points: number;
};

type RecentTransactionsCardProps = {
  items: RecentTransactionItem[];
};

export function RecentTransactionsCard({ items }: RecentTransactionsCardProps) {
  return (
    <section className="rounded-2xl bg-gradient-to-br from-violet-300/9 via-violet-300/5 to-transparent p-4 ring-1 ring-violet-300/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2.5 text-lg font-semibold text-violet-50">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-violet-300/35 bg-violet-300/14 text-violet-100">
            <BookIcon className="h-4 w-4" />
          </span>
          Letzte Buchungen
        </h2>
        <Link
          href="/empfehler/punktekonto"
          className="group inline-flex items-center gap-2 text-sm text-violet-200 underline decoration-violet-300/50 underline-offset-4 transition-all duration-300 hover:text-violet-100 hover:decoration-violet-200/80"
        >
          Gesamtes Punktekonto ansehen
          <ArrowUpRightIcon className="h-3.5 w-3.5 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-violet-100/80">Noch keine Buchungen vorhanden.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="group relative flex items-center justify-between overflow-hidden rounded-xl bg-violet-400/8 px-3 py-2 ring-1 ring-violet-300/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:-translate-y-0.5 hover:brightness-[1.08] hover:shadow-[0_12px_30px_rgba(26,16,40,0.34)]"
            >
              <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-violet-100/22 to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
              <span className="pointer-events-none absolute inset-0 rounded-xl ring-0 ring-violet-200/0 transition-all duration-300 group-hover:ring-1 group-hover:ring-violet-200/40" />
              <div>
                <p className="text-sm font-medium text-violet-50">{item.label}</p>
                <p className="text-xs text-violet-200/75">
                  {new Date(item.createdAt).toLocaleString("de-DE")}
                </p>
              </div>
              <span
                className={`rounded-md px-2 py-1 text-sm font-semibold ${
                  item.points >= 0
                    ? "bg-emerald-100/90 text-emerald-800 ring-1 ring-emerald-200/70"
                    : "bg-rose-100/90 text-rose-700 ring-1 ring-rose-200/70"
                }`}
              >
                {item.points > 0 ? `+${item.points}` : item.points}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
