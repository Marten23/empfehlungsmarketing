import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentReferrerContext } from "@/lib/auth/referrer";
import {
  listPointsTransactionsForReferrer,
  sumAvailablePoints,
  sumLifetimeLevelPoints,
} from "@/lib/queries/points";
import { listReferralsForReferrer } from "@/lib/queries/referrals";
import { normalizeSupabaseError } from "@/lib/supabase/errors";

function getTransactionTypeLabel(type: string) {
  if (type === "earn_referral_close") return "Empfehlung erfolgreich";
  if (type === "spend_reward_redemption") return "Praemie eingeloest";
  if (type === "manual_adjustment") return "Manuelle Anpassung";
  if (type === "reversal") return "Korrektur";
  return type;
}

export default async function ReferrerPointsAccountPage() {
  const supabase = await createClient();
  const referrerContext = await getCurrentReferrerContext(supabase);

  if (!referrerContext) {
    redirect("/empfehler/login");
  }

  let loadError: string | null = null;
  let pointsRows: Awaited<ReturnType<typeof listPointsTransactionsForReferrer>> = [];
  let availablePoints = 0;
  let lifetimeLevelPoints = 0;
  let referralNameById = new Map<string, string>();

  try {
    pointsRows = await listPointsTransactionsForReferrer(
      supabase,
      referrerContext.advisorId,
      referrerContext.referrerId,
    );
    availablePoints = sumAvailablePoints(pointsRows);
    lifetimeLevelPoints = sumLifetimeLevelPoints(pointsRows);

    const referrals = await listReferralsForReferrer(
      supabase,
      referrerContext.advisorId,
      referrerContext.referrerId,
    );
    referralNameById = new Map(
      referrals.map((row) => {
        const fullName =
          row.contact_name ??
          [row.contact_first_name, row.contact_last_name]
            .filter(Boolean)
            .join(" ")
            .trim() ??
          "-";
        return [row.id, fullName || "-"] as const;
      }),
    );
  } catch (error) {
    loadError = normalizeSupabaseError(error).message;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">Gesamtes Punktekonto</h1>
        <p className="text-sm text-zinc-600">
          Vollstaendige Buchungshistorie fuer Ihren Empfehler-Bereich.
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

      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-cyan-700">
            Verfuegbare Punkte
          </p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">{availablePoints}</p>
        </article>
        <article className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
            Gesammelte Punkte fuer Ihr Level
          </p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">{lifetimeLevelPoints}</p>
        </article>
      </section>

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
                <th className="px-2 py-2">Datum</th>
                <th className="px-2 py-2">Beschreibung</th>
                <th className="px-2 py-2">Buchungsart</th>
                <th className="px-2 py-2">Punkte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {pointsRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-2 py-6 text-zinc-500">
                    Noch keine Buchungen vorhanden.
                  </td>
                </tr>
              ) : (
                pointsRows.map((row) => {
                  const label =
                    row.transaction_type === "earn_referral_close" && row.referral_id
                      ? `Abschluss Neukunde: ${
                          referralNameById.get(row.referral_id) ?? "Unbekannter Kontakt"
                        }`
                      : row.description ?? getTransactionTypeLabel(row.transaction_type);

                  return (
                    <tr key={row.id}>
                      <td className="px-2 py-2 text-zinc-600">
                        {new Date(row.created_at).toLocaleString("de-DE")}
                      </td>
                      <td className="px-2 py-2 text-zinc-800">{label}</td>
                      <td className="px-2 py-2 text-zinc-600">
                        {getTransactionTypeLabel(row.transaction_type)}
                      </td>
                      <td
                        className={`px-2 py-2 font-semibold ${
                          row.points >= 0 ? "text-emerald-700" : "text-red-700"
                        }`}
                      >
                        {row.points > 0 ? `+${row.points}` : row.points}
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
