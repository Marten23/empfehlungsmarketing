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
    <section className="rounded-2xl border border-orange-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2.5 text-lg font-semibold text-zinc-900">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-orange-300/45 bg-orange-100/80 text-orange-700">
            <BookIcon className="h-4 w-4" />
          </span>
          Letzte Buchungen
        </h2>
        <Link
          href="/empfehler/punktekonto"
          className="group inline-flex items-center gap-2 text-sm text-orange-700 underline decoration-orange-300/60 underline-offset-4 transition-all duration-300 hover:text-orange-900 hover:decoration-orange-500/90 hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.25)]"
        >
          Gesamtes Punktekonto ansehen
          <ArrowUpRightIcon className="h-3.5 w-3.5 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-600">Noch keine Buchungen vorhanden.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="group relative flex items-center justify-between overflow-hidden rounded-xl bg-orange-50/80 px-3 py-2 ring-1 ring-orange-200/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-50 hover:ring-orange-400/60 hover:brightness-[1.04] hover:shadow-[0_12px_24px_rgba(249,115,22,0.16)]"
            >
              <span className="pointer-events-none absolute inset-0 rounded-xl ring-0 ring-orange-200/0 transition-all duration-300 group-hover:ring-1 group-hover:ring-orange-200/40" />
              <div>
                <p className="text-sm font-medium text-zinc-900">{item.label}</p>
                <p className="text-xs text-zinc-500">
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

