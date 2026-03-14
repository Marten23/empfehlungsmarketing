import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentReferrerContext } from "@/lib/auth/referrer";
import { listReferralsForReferrer } from "@/lib/queries/referrals";
import { listPointsTransactionsForReferrer } from "@/lib/queries/points";
import { mapReferralStatusToUi, getAwardedPointsByReferral } from "@/app/empfehler/dashboard/gamification";
import { normalizeSupabaseError } from "@/lib/supabase/errors";

function getContactName(
  row: Awaited<ReturnType<typeof listReferralsForReferrer>>[number],
) {
  const fullName =
    row.contact_name ??
    [row.contact_first_name, row.contact_last_name].filter(Boolean).join(" ").trim();
  return fullName || "-";
}

function statusBadgeClass(statusLabel: string) {
  if (statusLabel === "erfolgreich") return "bg-emerald-100 text-emerald-700";
  if (statusLabel === "abgelehnt") return "bg-rose-100 text-rose-700";
  if (statusLabel === "in Pruefung") return "bg-amber-100 text-amber-700";
  return "bg-cyan-100 text-cyan-700";
}

export default async function ReferrerRecommendationsPage() {
  const supabase = await createClient();
  const referrerContext = await getCurrentReferrerContext(supabase);

  if (!referrerContext) {
    redirect("/empfehler/login");
  }

  let referrals: Awaited<ReturnType<typeof listReferralsForReferrer>> = [];
  let awardedPointsByReferral = new Map<string, number>();
  let loadError: string | null = null;

  try {
    referrals = await listReferralsForReferrer(
      supabase,
      referrerContext.advisorId,
      referrerContext.referrerId,
    );
    const pointsRows = await listPointsTransactionsForReferrer(
      supabase,
      referrerContext.advisorId,
      referrerContext.referrerId,
    );
    awardedPointsByReferral = getAwardedPointsByReferral(pointsRows);
  } catch (error) {
    loadError = normalizeSupabaseError(error).message;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">Meine Empfehlungen</h1>
        <p className="text-sm text-zinc-600">
          Vollstaendige Uebersicht Ihrer eingereichten Kontakte.
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/empfehler/dashboard" className="text-zinc-800 underline">
            Zurueck zum Dashboard
          </Link>
          <Link href="/empfehler/praemien" className="text-zinc-800 underline">
            Zu den Praemien
          </Link>
        </div>
      </header>

      {loadError ? (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          Daten konnten nicht geladen werden: {loadError}
        </p>
      ) : null}

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-zinc-500">
              <tr>
                <th className="px-2 py-2">Person</th>
                <th className="px-2 py-2">Datum</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Punkte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {referrals.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-2 py-6 text-zinc-500">
                    Noch keine Empfehlungen vorhanden.
                  </td>
                </tr>
              ) : (
                referrals.map((row) => {
                  const statusLabel = mapReferralStatusToUi(row.status);
                  const awarded = awardedPointsByReferral.get(row.id) ?? null;
                  return (
                    <tr key={row.id}>
                      <td className="px-2 py-2 text-zinc-800">{getContactName(row)}</td>
                      <td className="px-2 py-2 text-zinc-600">
                        {new Date(row.created_at).toLocaleDateString("de-DE")}
                      </td>
                      <td className="px-2 py-2">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${statusBadgeClass(statusLabel)}`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-zinc-700">
                        {awarded !== null ? (
                          <span className="font-semibold text-emerald-700">
                            +{awarded}
                          </span>
                        ) : row.status === "abschluss" ? (
                          <span className="text-zinc-500">in Bearbeitung</span>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
