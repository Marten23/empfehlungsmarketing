import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdvisorContext } from "@/lib/auth/advisor";
import {
  listDashboardReferrals,
  type DashboardReferralRow,
} from "@/lib/queries/referrals";
import { awardManualReferralPointsAction } from "@/app/dashboard/referrals/actions";
import { normalizeSupabaseError } from "@/lib/supabase/errors";
import { ReferralStatusForm } from "@/app/dashboard/referrals/status-form";
import {
  ArrowUpRightIcon,
  BookIcon,
  SparklesIcon,
  UsersIcon,
} from "@/app/empfehler/dashboard/components/icons";
import { AdvisorAreaHeader } from "@/app/berater/components/advisor-area-header";

function renderContactName(row: DashboardReferralRow) {
  if (row.contact_name) return row.contact_name;

  const fullName = [row.contact_first_name, row.contact_last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || "-";
}

function renderReferrer(row: DashboardReferralRow) {
  if (!row.referrer) return "-";

  const name = `${row.referrer.first_name} ${row.referrer.last_name}`.trim();
  const identifier = row.referrer.referral_slug ?? row.referrer.referral_code;
  return identifier ? `${name} (${identifier})` : name;
}

type DashboardReferralsPageProps = {
  searchParams: Promise<{
    saved?: string;
    sreason?: string;
    awarded?: string;
    reason?: string;
  }>;
};

function formatAwardReason(reason?: string) {
  if (!reason) return "";
  if (reason === "already-awarded") {
    return "Für diese Empfehlung wurden bereits Punkte vergeben.";
  }
  if (reason === "status") {
    return "Punkte können nur bei Status 'abschluss' vergeben werden.";
  }
  if (reason === "not-found") {
    return "Empfehlung wurde nicht gefunden.";
  }
  if (reason === "ungueltige-punkte") {
    return "Bitte geben Sie eine gültige Punktezahl ein.";
  }
  return reason;
}

function formatStatusReason(reason?: string) {
  if (!reason) return "";
  if (reason === "tenant") return "Status konnte nicht gespeichert werden.";
  if (reason === "locked")
    return "Status 'abschluss' ist final und kann nicht mehr geändert werden.";
  if (reason === "not-found") return "Empfehlung wurde nicht gefunden.";
  return reason;
}

function statusLabel(status: DashboardReferralRow["status"]) {
  if (status === "neu") return "eingereicht";
  if (status === "kontaktiert" || status === "termin") return "in Prüfung";
  if (status === "abschluss") return "erfolgreich";
  if (status === "abgelehnt") return "abgelehnt";
  return status;
}

function statusBadgeClass(status: DashboardReferralRow["status"]) {
  if (status === "abschluss") return "bg-emerald-100 text-emerald-800 ring-emerald-200";
  if (status === "abgelehnt") return "bg-rose-100 text-rose-800 ring-rose-200";
  if (status === "kontaktiert" || status === "termin") {
    return "bg-amber-100 text-amber-800 ring-amber-200";
  }
  return "bg-cyan-100 text-cyan-800 ring-cyan-200";
}

export default async function DashboardReferralsPage({
  searchParams,
}: DashboardReferralsPageProps) {
  const params = await searchParams;
  const advisorContext = await getCurrentAdvisorContext();
  if (!advisorContext) {
    redirect("/berater/dashboard");
  }

  let rows: DashboardReferralRow[] = [];
  let loadError: string | null = null;
  let autoAwardPointsOnClose = true;
  let defaultPoints = 100;

  try {
    const supabase = await createClient();
    rows = await listDashboardReferrals(supabase, advisorContext.advisorId);

    const { data: settingsRow, error: settingsError } = await supabase
      .from("advisor_settings")
      .select("auto_award_points_on_referral_close, points_per_successful_referral")
      .eq("advisor_id", advisorContext.advisorId)
      .maybeSingle();

    if (settingsError) {
      const code = (settingsError as { code?: string }).code;
      if (code !== "PGRST204") throw settingsError;
    } else {
      autoAwardPointsOnClose =
        (settingsRow as { auto_award_points_on_referral_close?: boolean } | null)
          ?.auto_award_points_on_referral_close ?? true;
      defaultPoints =
        (settingsRow as { points_per_successful_referral?: number } | null)
          ?.points_per_successful_referral ?? 100;
    }
  } catch (error) {
    loadError = normalizeSupabaseError(error).message;
  }

  const totalCount = rows.length;
  const openCount = rows.filter(
    (row) => row.status === "neu" || row.status === "kontaktiert" || row.status === "termin",
  ).length;
  const successCount = rows.filter((row) => row.status === "abschluss").length;
  const rejectedCount = rows.filter((row) => row.status === "abgelehnt").length;

  return (
    <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 p-6">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_8%_4%,rgba(255,157,66,0.2),transparent_38%),radial-gradient(circle_at_92%_8%,rgba(96,165,250,0.18),transparent_38%),radial-gradient(circle_at_50%_120%,rgba(139,92,246,0.09),transparent_48%),linear-gradient(180deg,#fcfcff_0%,#f6f8ff_45%,#edf2ff_100%)]" />
      <div className="hex-honeycomb-bg pointer-events-none fixed inset-0 z-0 opacity-[0.1] [mask-image:linear-gradient(180deg,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0.1)_36%,rgba(0,0,0,0.02)_100%)]" />
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

      <AdvisorAreaHeader active="empfehlungen" />

      <section className="relative z-10 overflow-hidden rounded-3xl border border-zinc-200/85 bg-white/95 p-5 shadow-[0_20px_44px_rgba(15,23,42,0.1)] backdrop-blur-xl md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-300/45 bg-orange-200/45 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-orange-800">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-300/35 text-orange-800">
                <BookIcon className="h-3.5 w-3.5" />
              </span>
              Arbeitsbereich
            </span>
            <h1 className="text-2xl font-semibold text-zinc-900 md:text-3xl">Empfehlungen</h1>
            <p className="text-sm text-zinc-700 md:text-base">
              Hier verwalten Sie alle eingegangenen Kontakte und behalten den aktuellen Status im Blick.
            </p>
          </div>

          <div className="rounded-2xl border border-orange-200/65 bg-orange-50/92 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-orange-700">
              <SparklesIcon className="h-4 w-4" />
              Punktevergabe-Modus
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-800">
              {autoAwardPointsOnClose
                ? `Automatisch (${defaultPoints} Punkte bei Abschluss)`
                : "Manuell durch Berater"}
            </p>
            <p className="mt-1 text-xs text-zinc-600">Beraterbereich: {advisorContext.advisorName}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href="/berater/dashboard"
            className="inline-flex items-center gap-2 text-sm text-orange-700 underline decoration-orange-300/60 underline-offset-4 transition-all duration-300 hover:text-orange-900 hover:decoration-orange-500/90"
          >
            Zurück zum Dashboard
          </Link>
          <Link
            href="/berater/praemien"
            className="group inline-flex items-center gap-1 text-sm text-orange-700 underline decoration-orange-300/60 underline-offset-4 transition-all duration-300 hover:text-orange-900 hover:decoration-orange-500/90"
          >
            Zu Prämien & Einlösungen
            <ArrowUpRightIcon className="h-3.5 w-3.5 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </section>

      <section className="relative z-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-orange-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
          <p className="text-xs font-medium uppercase tracking-wide text-orange-700">Alle Empfehlungen</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">{totalCount}</p>
        </article>
        <article className="rounded-2xl border border-orange-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
          <p className="text-xs font-medium uppercase tracking-wide text-orange-700">Offen</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">{openCount}</p>
        </article>
        <article className="rounded-2xl border border-orange-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
          <p className="text-xs font-medium uppercase tracking-wide text-orange-700">Erfolgreich</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-700">{successCount}</p>
        </article>
        <article className="rounded-2xl border border-orange-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
          <p className="text-xs font-medium uppercase tracking-wide text-orange-700">Abgelehnt</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">{rejectedCount}</p>
        </article>
      </section>

      {params.saved === "1" ? (
        <p className="rounded-xl border border-emerald-300/70 bg-emerald-50/95 px-3 py-2 text-sm text-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          Status erfolgreich gespeichert.
        </p>
      ) : null}
      {params.saved === "0" ? (
        <p className="rounded-xl border border-rose-300/70 bg-rose-50/95 px-3 py-2 text-sm text-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          Status-Speicherung fehlgeschlagen.
          {params.sreason ? ` Grund: ${formatStatusReason(params.sreason)}` : ""}
        </p>
      ) : null}
      {params.awarded === "1" ? (
        <p className="rounded-xl border border-emerald-300/70 bg-emerald-50/95 px-3 py-2 text-sm text-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          Punkte wurden gutgeschrieben.
        </p>
      ) : null}
      {params.awarded === "0" ? (
        <p className="rounded-xl border border-rose-300/70 bg-rose-50/95 px-3 py-2 text-sm text-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          Punktevergabe fehlgeschlagen.
          {params.reason ? ` Grund: ${formatAwardReason(params.reason)}` : ""}
        </p>
      ) : null}
      {loadError ? (
        <p className="rounded-xl border border-rose-300/70 bg-rose-50/95 px-3 py-2 text-sm text-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          Empfehlungen konnten nicht geladen werden: {loadError}
        </p>
      ) : null}

      <section className="relative z-10 rounded-2xl border border-orange-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="inline-flex items-center gap-2.5 text-lg font-semibold text-zinc-900">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-orange-300/45 bg-orange-100/80 text-orange-700">
              <UsersIcon className="h-4 w-4" />
            </span>
            Vollständige Empfehlungsübersicht
          </h2>
          <span className="text-xs text-zinc-600">{rows.length} Einträge</span>
        </div>

        <div className="max-h-[680px] overflow-auto rounded-xl border border-orange-100/80 bg-orange-50/65">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-orange-100/90 text-left text-zinc-600 backdrop-blur">
              <tr>
                <th className="px-3 py-2">Empfohlene Person</th>
                <th className="px-3 py-2">Kontakt</th>
                <th className="px-3 py-2">Empfehler</th>
                <th className="px-3 py-2">Datum</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Notiz</th>
                <th className="px-3 py-2">Punkte</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-orange-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-zinc-500">
                    Noch keine Empfehlungen vorhanden.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="align-top transition-colors duration-200 hover:bg-orange-100/65">
                    <td className="px-3 py-3 font-medium text-zinc-900">{renderContactName(row)}</td>
                    <td className="px-3 py-3 text-zinc-700">
                      <p>{row.contact_email ?? "-"}</p>
                      <p className="text-xs text-zinc-500">{row.contact_phone ?? "-"}</p>
                    </td>
                    <td className="px-3 py-3 text-zinc-700">{renderReferrer(row)}</td>
                    <td className="px-3 py-3 text-zinc-700">{new Date(row.created_at).toLocaleString("de-DE")}</td>
                    <td className="px-3 py-3">
                      <div className="space-y-2">
                        <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ring-1 ${statusBadgeClass(row.status)}`}>
                          {statusLabel(row.status)}
                        </span>
                        <ReferralStatusForm referralId={row.id} currentStatus={row.status} />
                      </div>
                    </td>
                    <td className="max-w-[280px] px-3 py-3 text-zinc-700">
                      <p className="line-clamp-3 whitespace-pre-wrap">{row.contact_note ?? row.message ?? "-"}</p>
                    </td>
                    <td className="px-3 py-3">
                      {row.awarded_points !== null ? (
                        <span className="text-xs font-semibold text-emerald-700">
                          Bereits vergeben: +{row.awarded_points} Punkte
                        </span>
                      ) : !autoAwardPointsOnClose && row.status === "abschluss" ? (
                        <form action={awardManualReferralPointsAction} className="flex items-center gap-2">
                          <input type="hidden" name="referral_id" value={row.id} />
                          <input
                            type="number"
                            name="points"
                            min={1}
                            defaultValue={defaultPoints}
                            className="w-24 rounded-lg border border-orange-300/55 bg-white px-2 py-1 text-sm text-zinc-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                          />
                          <button
                            type="submit"
                            className="rounded-lg border border-orange-300/50 bg-orange-600 px-3 py-1 text-xs font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-500 hover:shadow-[0_12px_20px_rgba(249,115,22,0.2)]"
                          >
                            Gutschrift
                          </button>
                        </form>
                      ) : (
                        <span className="text-xs text-zinc-500">
                          {autoAwardPointsOnClose
                            ? row.status === "abschluss"
                              ? "Automatik aktiv (noch keine Buchung)"
                              : "Automatik aktiv"
                            : "Nur bei Status Abschluss"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

