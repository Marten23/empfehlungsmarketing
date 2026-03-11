import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdvisorContext } from "@/lib/auth/advisor";
import {
  listDashboardReferrals,
  type DashboardReferralRow,
} from "@/lib/queries/referrals";
import { updateReferralStatusAction } from "@/app/dashboard/referrals/actions";
import type { ReferralStatus } from "@/lib/types/domain";
import { normalizeSupabaseError } from "@/lib/supabase/errors";

const statuses: ReferralStatus[] = [
  "neu",
  "kontaktiert",
  "termin",
  "abschluss",
  "abgelehnt",
];

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

export default async function DashboardReferralsPage() {
  const advisorContext = await getCurrentAdvisorContext();
  if (!advisorContext) {
    redirect("/dashboard");
  }

  let rows: DashboardReferralRow[] = [];
  let loadError: string | null = null;

  try {
    const supabase = await createClient();
    rows = await listDashboardReferrals(supabase, advisorContext.advisorId);
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
        <Link href="/dashboard" className="text-sm text-zinc-800 underline">
          Zurueck zum Dashboard
        </Link>
      </header>

      <section className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
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
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
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
                    <form
                      action={updateReferralStatusAction}
                      className="flex items-center gap-2"
                    >
                      <input type="hidden" name="referral_id" value={row.id} />
                      <select
                        name="status"
                        defaultValue={row.status}
                        className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm"
                      >
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded bg-zinc-900 px-3 py-1 text-xs font-medium text-white"
                      >
                        Speichern
                      </button>
                    </form>
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
