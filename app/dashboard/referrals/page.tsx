import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdvisorContext } from "@/lib/auth/advisor";
import {
  listDashboardReferrals,
  type DashboardReferralRow,
} from "@/lib/queries/referrals";
import {
  awardManualReferralPointsAction,
} from "@/app/dashboard/referrals/actions";
import { normalizeSupabaseError } from "@/lib/supabase/errors";
import { ReferralStatusForm } from "@/app/dashboard/referrals/status-form";

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
    return "Fuer diese Empfehlung wurden bereits Punkte vergeben.";
  }
  if (reason === "status") {
    return "Punkte koennen nur bei Status 'abschluss' vergeben werden.";
  }
  if (reason === "not-found") {
    return "Empfehlung wurde nicht gefunden.";
  }
  if (reason === "ungueltige-punkte") {
    return "Bitte geben Sie eine gueltige Punktezahl ein.";
  }
  return reason;
}

function formatStatusReason(reason?: string) {
  if (!reason) return "";
  if (reason === "tenant") return "Status konnte nicht gespeichert werden.";
  if (reason === "locked") return "Status 'abschluss' ist final und kann nicht mehr geaendert werden.";
  if (reason === "not-found") return "Empfehlung wurde nicht gefunden.";
  return reason;
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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Empfehlungen</h1>
        <p className="text-sm text-zinc-600">
          Beraterbereich: {advisorContext.advisorName}
        </p>
        <Link href="/berater/dashboard" className="text-sm text-zinc-800 underline">
          Zurueck zum Dashboard
        </Link>
      </header>

      <section className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-600">
          Punktevergabe-Modus:{" "}
          <span className="font-semibold text-zinc-900">
            {autoAwardPointsOnClose
              ? `Automatisch (${defaultPoints} Punkte bei Abschluss)`
              : "Manuell durch Berater"}
          </span>
        </div>
        {params.saved === "1" ? (
          <p className="m-4 rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Status erfolgreich gespeichert.
          </p>
        ) : null}
        {params.saved === "0" ? (
          <p className="m-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            Status-Speicherung fehlgeschlagen.
            {params.sreason ? ` Grund: ${formatStatusReason(params.sreason)}` : ""}
          </p>
        ) : null}
        {params.awarded === "1" ? (
          <p className="m-4 rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Punkte wurden gutgeschrieben.
          </p>
        ) : null}
        {params.awarded === "0" ? (
          <p className="m-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            Punktevergabe fehlgeschlagen.
            {params.reason ? ` Grund: ${formatAwardReason(params.reason)}` : ""}
          </p>
        ) : null}
        {loadError ? (
          <p className="m-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            Empfehlungen konnten nicht geladen werden: {loadError}
          </p>
        ) : null}
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-600">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">E-Mail</th>
              <th className="px-4 py-3 font-medium">Telefon</th>
              <th className="px-4 py-3 font-medium">Notiz</th>
              <th className="px-4 py-3 font-medium">Empfehler</th>
              <th className="px-4 py-3 font-medium">Erstellt</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Punkte</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                  Noch keine Empfehlungen vorhanden.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className="px-4 py-3 text-zinc-900">
                    {renderContactName(row)}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    {row.contact_email ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    {row.contact_phone ?? "-"}
                  </td>
                  <td className="max-w-[320px] px-4 py-3 text-zinc-700">
                    <p className="line-clamp-3 whitespace-pre-wrap">
                      {row.contact_note ?? row.message ?? "-"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{renderReferrer(row)}</td>
                  <td className="px-4 py-3 text-zinc-700">
                    {new Date(row.created_at).toLocaleString("de-DE")}
                  </td>
                  <td className="px-4 py-3">
                    <ReferralStatusForm
                      referralId={row.id}
                      currentStatus={row.status}
                    />
                  </td>
                  <td className="px-4 py-3">
                    {row.awarded_points !== null ? (
                      <span className="text-xs font-medium text-emerald-700">
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
                          className="w-24 rounded border border-zinc-300 bg-white px-2 py-1 text-sm"
                        />
                        <button
                          type="submit"
                          className="rounded bg-zinc-900 px-3 py-1 text-xs font-medium text-white"
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
      </section>
    </main>
  );
}
