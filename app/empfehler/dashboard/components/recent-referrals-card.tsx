import Link from "next/link";
import { ArrowUpRightIcon, UsersIcon } from "@/app/empfehler/dashboard/components/icons";

type RecentReferralItem = {
  id: string;
  person: string;
  createdAt: string;
  statusLabel: string;
  awardedPoints: number | null;
};

type RecentReferralsCardProps = {
  items: RecentReferralItem[];
};

function statusBadgeClass(statusLabel: string) {
  if (statusLabel === "erfolgreich")
    return "bg-emerald-100/90 text-emerald-800 ring-emerald-200";
  if (statusLabel === "abgelehnt")
    return "bg-rose-100/90 text-rose-700 ring-rose-200";
  if (statusLabel === "in Prüfung")
    return "bg-indigo-100/90 text-indigo-700 ring-indigo-200";
  return "bg-slate-200/80 text-slate-700 ring-slate-300";
}

export function RecentReferralsCard({ items }: RecentReferralsCardProps) {
  return (
    <section className="rounded-2xl bg-gradient-to-br from-violet-300/9 via-violet-300/5 to-transparent p-4 ring-1 ring-violet-300/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2.5 text-lg font-semibold text-violet-50">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-300/35 bg-emerald-300/12 text-emerald-200">
            <UsersIcon className="h-4 w-4" />
          </span>
          Meine Empfehlungen
        </h2>
        <Link
          href="/empfehler/empfehlungen"
          className="group inline-flex items-center gap-2 text-sm text-emerald-200 underline decoration-emerald-300/50 underline-offset-4 transition-all duration-300 hover:text-emerald-100 hover:decoration-emerald-200/80"
        >
          Alle Empfehlungen ansehen
          <ArrowUpRightIcon className="h-3.5 w-3.5 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-violet-100/80">
          Noch keine Empfehlungen vorhanden.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="group relative flex items-center justify-between overflow-hidden rounded-xl bg-violet-400/8 px-3 py-2 ring-1 ring-violet-300/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01] hover:brightness-[1.08] hover:ring-violet-200/40 hover:shadow-[0_14px_34px_rgba(26,16,40,0.38)]"
            >
              <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-emerald-100/22 to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
              <span className="pointer-events-none absolute inset-0 rounded-xl ring-0 ring-violet-200/0 transition-all duration-300 group-hover:ring-1 group-hover:ring-violet-200/35" />
              <div>
                <p className="text-sm font-medium text-violet-50">
                  <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-300/15 text-xs font-semibold text-violet-100">
                    {(item.person || "?").slice(0, 1).toUpperCase()}
                  </span>
                  {item.person}
                </p>
                <p className="text-xs text-violet-200/75">
                  {new Date(item.createdAt).toLocaleDateString("de-DE")}
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ring-1 ${statusBadgeClass(item.statusLabel)}`}
                >
                  {item.statusLabel}
                </span>
                <p className="mt-1 text-xs text-violet-200/75">
                  {item.awardedPoints !== null ? `+${item.awardedPoints} Punkte` : "-"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
