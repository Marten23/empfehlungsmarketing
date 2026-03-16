import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdvisorContext } from "@/lib/auth/advisor";
import { listReferrersForAdvisor } from "@/lib/queries/referrers";
import { listDashboardReferrals } from "@/lib/queries/referrals";
import { normalizeSupabaseError } from "@/lib/supabase/errors";
import { CopyLinkButton } from "@/app/dashboard/referrers/copy-link-button";
import { approveReferrerAction } from "@/app/dashboard/referrers/actions";
import {
  ArrowUpRightIcon,
  BookIcon,
  SparklesIcon,
  UsersIcon,
} from "@/app/empfehler/dashboard/components/icons";

function getDisplayName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}

type DashboardReferrersPageProps = {
  searchParams: Promise<{ approved?: string; reason?: string }>;
};

export default async function DashboardReferrersPage({
  searchParams,
}: DashboardReferrersPageProps) {
  const params = await searchParams;
  const advisorContext = await getCurrentAdvisorContext();
  if (!advisorContext) {
    redirect("/berater/dashboard");
  }

  let loadError: string | null = null;
  let rows: Awaited<ReturnType<typeof listReferrersForAdvisor>> = [];
  const referralStatsByReferrer = new Map<
    string,
    { total: number; successful: number }
  >();

  try {
    const supabase = await createClient();
    rows = await listReferrersForAdvisor(supabase, advisorContext.advisorId);

    const referralRows = await listDashboardReferrals(
      supabase,
      advisorContext.advisorId,
    );
    for (const referral of referralRows) {
      const prev = referralStatsByReferrer.get(referral.referrer_id) ?? {
        total: 0,
        successful: 0,
      };
      prev.total += 1;
      if (referral.status === "abschluss") prev.successful += 1;
      referralStatsByReferrer.set(referral.referrer_id, prev);
    }
  } catch (error) {
    loadError = normalizeSupabaseError(error).message;
  }

  const appBase = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const pendingCount = rows.filter((row) => !row.is_active).length;
  const activeCount = rows.filter((row) => row.is_active).length;
  const withSuccessCount = rows.filter((row) => {
    const stats = referralStatsByReferrer.get(row.id);
    return (stats?.successful ?? 0) > 0;
  }).length;

  return (
    <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 p-6">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_35%,rgba(170,130,255,0.16),transparent_52%),radial-gradient(circle_at_15%_0%,rgba(126,87,255,0.26),transparent_42%),radial-gradient(circle_at_85%_8%,rgba(159,124,255,0.2),transparent_40%),linear-gradient(180deg,#1b1230_0%,#140d26_100%)]" />
      <div className="hex-honeycomb-bg pointer-events-none fixed inset-0 z-0 opacity-24" />
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute left-[5%] top-[20%] h-[220px] w-[260px] opacity-72">
          <div className="hex-node absolute left-0 top-8 h-14 w-14 border border-[#b788ff]/70 bg-[#6E44FF]/18" />
          <div className="hex-node absolute left-14 top-0 h-20 w-20 border border-[#c79bff]/80 bg-[#8d63ff]/24" />
          <div className="hex-node absolute left-30 top-12 h-14 w-14 border border-[#d2adff]/85 bg-[#a374ff]/26" />
        </div>
        <div className="absolute right-[6%] top-[58%] h-[230px] w-[280px] opacity-72">
          <div className="hex-node absolute left-4 top-4 h-16 w-16 border border-[#b788ff]/70 bg-[#6E44FF]/18" />
          <div className="hex-node absolute left-24 top-0 h-20 w-20 border border-[#c79bff]/80 bg-[#8d63ff]/24" />
          <div className="hex-node absolute left-44 top-14 h-14 w-14 border border-[#d2adff]/85 bg-[#a374ff]/26" />
        </div>
      </div>

      <section className="relative z-10 overflow-hidden rounded-3xl border border-violet-200/50 bg-violet-50/86 p-5 shadow-[0_24px_60px_rgba(5,3,12,0.36)] backdrop-blur-xl md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-300/45 bg-violet-200/45 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-violet-800">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-300/35 text-violet-800">
                <UsersIcon className="h-3.5 w-3.5" />
              </span>
              Empfehler-Verwaltung
            </span>
            <h1 className="text-2xl font-semibold text-zinc-900 md:text-3xl">Empfehler</h1>
            <p className="text-sm text-zinc-700 md:text-base">
              Verwalten Sie Ihre Empfehler und behalten Sie AktivitÃ¤t,
              Empfehlungen und Status im Blick.
            </p>
          </div>

          <div className="rounded-2xl border border-violet-200/65 bg-violet-50/92 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-violet-700">
              <SparklesIcon className="h-4 w-4" />
              Hinweis
            </p>
            <p className="mt-1 max-w-xs text-sm text-zinc-700">
              Ãœber den Kontakt-Empfehlungslink kÃ¶nnen Empfehler neue Kontakte
              direkt erfassen.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href="/berater/dashboard"
            className="inline-flex items-center gap-2 text-sm text-violet-700 underline decoration-violet-300/60 underline-offset-4 transition-all duration-300 hover:text-violet-900 hover:decoration-violet-500/90"
          >
            ZurÃ¼ck zum Dashboard
          </Link>
          <Link
            href="/berater/empfehlungen"
            className="group inline-flex items-center gap-1 text-sm text-violet-700 underline decoration-violet-300/60 underline-offset-4 transition-all duration-300 hover:text-violet-900 hover:decoration-violet-500/90"
          >
            Zu Empfehlungen
            <ArrowUpRightIcon className="h-3.5 w-3.5 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </section>

      <section className="relative z-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-violet-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
          <p className="text-xs font-medium uppercase tracking-wide text-violet-700">Empfehler gesamt</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">{rows.length}</p>
        </article>
        <article className="rounded-2xl border border-violet-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
          <p className="text-xs font-medium uppercase tracking-wide text-violet-700">Aktive Empfehler</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-700">{activeCount}</p>
        </article>
        <article className="rounded-2xl border border-violet-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
          <p className="text-xs font-medium uppercase tracking-wide text-violet-700">Neue Empfehler</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">{pendingCount}</p>
        </article>
        <article className="rounded-2xl border border-violet-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
          <p className="text-xs font-medium uppercase tracking-wide text-violet-700">Mit Erfolgen</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">{withSuccessCount}</p>
        </article>
      </section>

      {pendingCount > 0 ? (
        <p className="rounded-xl border border-amber-300/70 bg-amber-50/95 px-3 py-2 text-sm text-amber-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          {pendingCount} Empfehler warten auf Freigabe.
        </p>
      ) : null}

      {params.approved === "1" ? (
        <p className="rounded-xl border border-emerald-300/70 bg-emerald-50/95 px-3 py-2 text-sm text-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          Empfehler wurde freigegeben.
        </p>
      ) : null}
      {params.approved === "0" ? (
        <p className="rounded-xl border border-rose-300/70 bg-rose-50/95 px-3 py-2 text-sm text-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          Freigabe fehlgeschlagen.
          {params.reason ? ` Grund: ${params.reason}` : ""}
        </p>
      ) : null}

      <section className="relative z-10 rounded-2xl border border-violet-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="inline-flex items-center gap-2.5 text-lg font-semibold text-zinc-900">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-violet-300/45 bg-violet-100/80 text-violet-700">
              <BookIcon className="h-4 w-4" />
            </span>
            Empfehler-Ãœbersicht
          </h2>
          <span className="text-xs text-zinc-600">{rows.length} EintrÃ¤ge</span>
        </div>

        {loadError ? (
          <p className="mb-3 rounded-xl border border-rose-300/70 bg-rose-50/95 px-3 py-2 text-sm text-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            Empfehler konnten nicht geladen werden: {loadError}
          </p>
        ) : null}

        <div className="max-h-[640px] overflow-auto rounded-xl border border-violet-100/80 bg-violet-50/65">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-violet-100/90 text-left text-zinc-600 backdrop-blur">
              <tr>
                <th className="px-3 py-2">Empfehler</th>
                <th className="px-3 py-2">Kontakt</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Empfehlungen</th>
                <th className="px-3 py-2">Erfolgreich</th>
                <th className="px-3 py-2">Kontakt-Empfehlungslink</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-zinc-500">
                    Noch keine Empfehler vorhanden.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const shareCode =
                    row.referral_slug ??
                    row.referral_code ??
                    row.invite_code ??
                    row.id;
                  const link = `${appBase}/ref/${shareCode}`;
                  const stats = referralStatsByReferrer.get(row.id) ?? {
                    total: 0,
                    successful: 0,
                  };

                  return (
                    <tr
                      key={row.id}
                      className="align-top transition-colors duration-200 hover:bg-violet-100/65"
                    >
                      <td className="px-3 py-3 font-medium text-zinc-900">
                        {getDisplayName(row.first_name, row.last_name)}
                      </td>
                      <td className="px-3 py-3 text-zinc-700">
                        <p>{row.email ?? "-"}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {row.phone ?? "-"}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ring-1 ${
                            row.is_active
                              ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
                              : "bg-zinc-100 text-zinc-700 ring-zinc-200"
                          }`}
                        >
                          {row.is_active ? "Aktiv" : "In PrÃ¼fung"}
                        </span>
                        {!row.is_active ? (
                          <form action={approveReferrerAction} className="mt-2">
                            <input
                              type="hidden"
                              name="referrer_id"
                              value={row.id}
                            />
                            <button
                              type="submit"
                              className="rounded-lg border border-violet-300/50 bg-violet-600 px-3 py-1 text-xs font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-violet-500 hover:shadow-[0_10px_18px_rgba(76,29,149,0.25)]"
                            >
                              Freigeben
                            </button>
                          </form>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-zinc-900">{stats.total}</td>
                      <td className="px-3 py-3">
                        <span className="font-semibold text-emerald-700">
                          {stats.successful}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-zinc-700">
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">Für neue Kontakte</p>
                        <p className="mt-1 break-all text-xs">{link}</p>
                        <p className="mt-2 text-[11px] text-zinc-500">Kontakt-Code:</p>
                        <p className="mt-1 inline-flex rounded-md border border-violet-200/80 bg-violet-50 px-2 py-1 font-mono text-xs font-semibold text-violet-800">
                          {shareCode}
                        </p>
                        <p className="mt-2 text-[11px] text-zinc-500">
                          Über diesen Link kann sich ein neuer Kontakt direkt registrieren.
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <CopyLinkButton
                            value={link}
                            idleLabel="Link kopieren"
                            copiedLabel="Link kopiert"
                            className="rounded border border-violet-300/55 bg-white px-3 py-1 text-xs font-medium text-violet-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-violet-100 hover:text-violet-900 hover:ring-1 hover:ring-violet-400/70 hover:shadow-[0_12px_22px_rgba(76,29,149,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                          />
                          <CopyLinkButton
                            value={shareCode}
                            idleLabel="Code kopieren"
                            copiedLabel="Code kopiert"
                            className="rounded border border-violet-300/45 bg-violet-100/80 px-3 py-1 text-xs font-medium text-violet-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-violet-200/90 hover:ring-1 hover:ring-violet-400/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

