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
    return "bg-emerald-100/95 text-emerald-800 ring-emerald-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]";
  if (statusLabel === "abgelehnt")
    return "bg-rose-100/90 text-rose-700 ring-rose-200";
  if (statusLabel === "in Prüfung")
    return "bg-orange-100/90 text-orange-700 ring-orange-200";
  return "bg-slate-200/80 text-slate-700 ring-slate-300";
}

export function RecentReferralsCard({ items }: RecentReferralsCardProps) {
  return (
    <section className="rounded-2xl border border-orange-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2.5 text-lg font-semibold text-zinc-900">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-orange-300/45 bg-orange-100/80 text-orange-700">
            <UsersIcon className="h-4 w-4" />
          </span>
          Meine Empfehlungen
        </h2>
        <Link
          href="/empfehler/empfehlungen"
          className="group inline-flex items-center gap-2 text-sm text-orange-700 underline decoration-orange-300/60 underline-offset-4 transition-all duration-300 hover:text-orange-900 hover:decoration-orange-500/90 hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.25)]"
        >
          Alle Empfehlungen ansehen
          <ArrowUpRightIcon className="h-3.5 w-3.5 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-600">
          Noch keine Empfehlungen vorhanden.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="group relative flex items-center justify-between overflow-hidden rounded-xl bg-orange-50/80 px-3 py-2 ring-1 ring-orange-200/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01] hover:bg-orange-50 hover:brightness-[1.04] hover:ring-orange-400/65 hover:shadow-[0_14px_26px_rgba(249,115,22,0.16)]"
            >
              <span className="pointer-events-none absolute inset-0 rounded-xl ring-0 ring-orange-200/0 transition-all duration-300 group-hover:ring-1 group-hover:ring-orange-200/35" />
              <div>
                <p className="text-sm font-medium text-zinc-900">
                  <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-200/70 text-xs font-semibold text-orange-800">
                    {(item.person || "?").slice(0, 1).toUpperCase()}
                  </span>
                  {item.person}
                </p>
                <p className="text-xs text-zinc-500">
                  {new Date(item.createdAt).toLocaleDateString("de-DE")}
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ring-1 ${statusBadgeClass(item.statusLabel)}`}
                >
                  {item.statusLabel}
                </span>
                <p className="mt-1 text-xs text-zinc-500">
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

