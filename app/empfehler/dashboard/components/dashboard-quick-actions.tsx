import Link from "next/link";
import { ArrowUpRightIcon, BookIcon, GiftIcon, UsersIcon } from "@/app/empfehler/dashboard/components/icons";

export function DashboardQuickActions() {
  return (
    <section className="px-1">
      <div className="grid gap-2 sm:grid-cols-3">
      <Link
        href="/empfehler/praemien"
        className="group relative overflow-hidden rounded-xl bg-violet-400/10 px-4 py-3 text-violet-50 ring-1 ring-violet-300/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.015] hover:bg-violet-300/17 hover:ring-violet-200/50 hover:shadow-[0_18px_36px_rgba(26,16,40,0.48),0_0_0_1px_rgba(159,124,255,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1028]"
      >
        <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-violet-100/25 to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-violet-300/45 bg-violet-300/18 text-violet-100 shadow-[0_0_0_1px_rgba(255,255,255,0.06)] transition duration-300 group-hover:bg-violet-200/25 group-hover:text-violet-50">
          <GiftIcon className="h-4.5 w-4.5" />
        </span>
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-violet-200">
          Prämien
        </p>
        <p className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-violet-50">
          Alle Prämien ansehen
          <ArrowUpRightIcon className="h-3.5 w-3.5 shrink-0 text-violet-200 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-violet-100" />
        </p>
      </Link>

      <Link
        href="/empfehler/punktekonto"
        className="group relative overflow-hidden rounded-xl bg-violet-400/8 px-4 py-3 text-violet-50 ring-1 ring-violet-300/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.012] hover:bg-violet-300/13 hover:ring-emerald-200/45 hover:shadow-[0_18px_36px_rgba(26,16,40,0.44),0_0_0_1px_rgba(52,211,153,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1028]"
      >
        <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-emerald-100/24 to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-300/45 bg-emerald-300/16 text-emerald-200 shadow-[0_0_0_1px_rgba(255,255,255,0.06)] transition duration-300 group-hover:bg-emerald-200/22 group-hover:text-emerald-100">
          <BookIcon className="h-4.5 w-4.5" />
        </span>
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-emerald-200">
          Punktekonto
        </p>
        <p className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-violet-50">
          Gesamtes Punktekonto ansehen
          <ArrowUpRightIcon className="h-3.5 w-3.5 shrink-0 text-emerald-200 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-emerald-100" />
        </p>
      </Link>

      <Link
        href="/empfehler/empfehlungen"
        className="group relative overflow-hidden rounded-xl bg-violet-400/8 px-4 py-3 text-violet-50 ring-1 ring-violet-300/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.012] hover:bg-violet-300/13 hover:ring-violet-200/45 hover:shadow-[0_18px_36px_rgba(26,16,40,0.44),0_0_0_1px_rgba(159,124,255,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1028]"
      >
        <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-violet-100/24 to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-violet-300/45 bg-violet-300/18 text-violet-100 shadow-[0_0_0_1px_rgba(255,255,255,0.06)] transition duration-300 group-hover:bg-violet-200/25 group-hover:text-violet-50">
          <UsersIcon className="h-4.5 w-4.5" />
        </span>
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-violet-200">
          Empfehlungen
        </p>
        <p className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-violet-50">
          Meine Empfehlungen ansehen
          <ArrowUpRightIcon className="h-3.5 w-3.5 shrink-0 text-violet-200 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-violet-100" />
        </p>
      </Link>
      </div>
    </section>
  );
}
