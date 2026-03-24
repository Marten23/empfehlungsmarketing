import Link from "next/link";
import { ArrowUpRightIcon, BookIcon, GiftIcon, UsersIcon } from "@/app/empfehler/dashboard/components/icons";

export function DashboardQuickActions() {
  return (
    <section className="px-1">
      <div className="grid gap-2 sm:grid-cols-3">
        <Link
          href="/empfehler/praemien"
          className="group relative overflow-hidden rounded-xl bg-white/88 px-4 py-3 text-zinc-900 ring-1 ring-orange-200/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.015] hover:bg-orange-50 hover:ring-orange-400/70 hover:shadow-[0_18px_36px_rgba(249,115,22,0.18),0_0_0_1px_rgba(251,146,60,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-orange-100/70 to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-orange-300/45 bg-orange-100/80 text-orange-700 shadow-[0_0_0_1px_rgba(255,255,255,0.2)] transition duration-300 group-hover:bg-orange-200/70 group-hover:text-orange-900">
            <GiftIcon className="h-4.5 w-4.5" />
          </span>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-orange-700">
            Prämien
          </p>
          <p className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-zinc-900">
            Alle Prämien ansehen
            <ArrowUpRightIcon className="h-3.5 w-3.5 shrink-0 text-orange-700 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-orange-900" />
          </p>
        </Link>

        <Link
          href="/empfehler/punktekonto"
          className="group relative overflow-hidden rounded-xl bg-white/88 px-4 py-3 text-zinc-900 ring-1 ring-orange-200/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.012] hover:bg-orange-50 hover:ring-orange-400/70 hover:shadow-[0_18px_36px_rgba(249,115,22,0.18),0_0_0_1px_rgba(251,146,60,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-orange-100/75 to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-orange-300/45 bg-orange-100/80 text-orange-700 shadow-[0_0_0_1px_rgba(255,255,255,0.2)] transition duration-300 group-hover:bg-orange-200/70 group-hover:text-orange-900">
            <BookIcon className="h-4.5 w-4.5" />
          </span>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-orange-700">
            Punktekonto
          </p>
          <p className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-zinc-900">
            Gesamtes Punktekonto ansehen
            <ArrowUpRightIcon className="h-3.5 w-3.5 shrink-0 text-orange-700 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-orange-900" />
          </p>
        </Link>

        <Link
          href="/empfehler/empfehlungen"
          className="group relative overflow-hidden rounded-xl bg-white/88 px-4 py-3 text-zinc-900 ring-1 ring-orange-200/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.012] hover:bg-orange-50 hover:ring-orange-400/70 hover:shadow-[0_18px_36px_rgba(249,115,22,0.18),0_0_0_1px_rgba(251,146,60,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-orange-100/70 to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-orange-300/45 bg-orange-100/80 text-orange-700 shadow-[0_0_0_1px_rgba(255,255,255,0.2)] transition duration-300 group-hover:bg-orange-200/70 group-hover:text-orange-900">
            <UsersIcon className="h-4.5 w-4.5" />
          </span>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-orange-700">
            Empfehlungen
          </p>
          <p className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-zinc-900">
            Meine Empfehlungen ansehen
            <ArrowUpRightIcon className="h-3.5 w-3.5 shrink-0 text-orange-700 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-orange-900" />
          </p>
        </Link>
      </div>
    </section>
  );
}
