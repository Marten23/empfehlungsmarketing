import type { Referral } from "@/lib/types/domain";
import { mapReferralStatusToUi } from "@/app/empfehler/dashboard/gamification";

type RecommendationsTableProps = {
  referrals: Referral[];
  awardedPointsByReferral: Map<string, number>;
};

function getContactName(row: Referral) {
  const fullName =
    row.contact_name ??
    [row.contact_first_name, row.contact_last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
  return fullName || "-";
}

export function RecommendationsTable({
  referrals,
  awardedPointsByReferral,
}: RecommendationsTableProps) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">Meine Empfehlungen</h2>
      <div className="mt-4 overflow-x-auto">
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
                const awarded = awardedPointsByReferral.get(row.id) ?? null;
                return (
                  <tr key={row.id}>
                    <td className="px-2 py-2 text-zinc-800">{getContactName(row)}</td>
                    <td className="px-2 py-2 text-zinc-600">
                      {new Date(row.created_at).toLocaleDateString("de-DE")}
                    </td>
                    <td className="px-2 py-2 text-zinc-700">
                      {mapReferralStatusToUi(row.status)}
                    </td>
                    <td className="px-2 py-2 text-zinc-700">
                      {awarded !== null ? (
                        <span className="font-medium text-emerald-700">+{awarded}</span>
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
  );
}
