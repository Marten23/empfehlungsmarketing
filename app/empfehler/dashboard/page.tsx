import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentReferrerContext } from "@/lib/auth/referrer";
import {
  getPointsBalanceForReferrer,
  listPointsTransactionsForReferrer,
} from "@/lib/queries/points";
import { listReferralsForReferrer } from "@/lib/queries/referrals";
import { normalizeSupabaseError } from "@/lib/supabase/errors";
import { CopyLinkButton } from "@/app/dashboard/referrers/copy-link-button";
import { logoutAction } from "@/app/dashboard/actions";

export default async function ReferrerDashboardPage() {
  const supabase = await createClient();
  const referrerContext = await getCurrentReferrerContext(supabase);

  if (!referrerContext) {
    redirect("/empfehler/login");
  }

  let pointsBalance = 0;
  let pointsRows: Awaited<
    ReturnType<typeof listPointsTransactionsForReferrer>
  > = [];
  let referralRows: Awaited<ReturnType<typeof listReferralsForReferrer>> = [];
  let loadError: string | null = null;

  try {
    pointsBalance = await getPointsBalanceForReferrer(
      supabase,
      referrerContext.advisorId,
      referrerContext.referrerId,
    );
    pointsRows = await listPointsTransactionsForReferrer(
      supabase,
      referrerContext.advisorId,
      referrerContext.referrerId,
    );
    referralRows = await listReferralsForReferrer(
      supabase,
      referrerContext.advisorId,
      referrerContext.referrerId,
    );
  } catch (error) {
    loadError = normalizeSupabaseError(error).message;
  }

  const appBase = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const contactReferralCode =
    referrerContext.referralSlug ??
    referrerContext.referralCode ??
    referrerContext.inviteCode ??
    referrerContext.referrerId;
  const contactReferralLink = `${appBase}/ref/${contactReferralCode}`;

  const referralNameById = new Map(
    referralRows.map((row) => {
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

  function getBookingLabel(row: (typeof pointsRows)[number]) {
    if (row.transaction_type === "earn_referral_close" && row.referral_id) {
      const contactName = referralNameById.get(row.referral_id) ?? "Unbekannter Kontakt";
      return `Abschluss Neukunde: ${contactName}`;
    }
    return row.description ?? row.transaction_type;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Ihr Empfehler-Dashboard</h1>
        <p className="text-sm text-zinc-600">
          Berater: {referrerContext.advisorName}
        </p>
      </header>

      {loadError ? (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          Daten konnten nicht vollstaendig geladen werden: {loadError}
        </p>
      ) : null}

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="text-xs text-zinc-500">Aktueller Punktestand</p>
        <p className="mt-1 text-3xl font-semibold text-zinc-900">{pointsBalance}</p>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="text-sm font-medium text-zinc-900">Kontakt-Empfehlungslink</p>
        <p className="mt-2 break-all text-sm text-zinc-700">{contactReferralLink}</p>
        <div className="mt-2">
          <CopyLinkButton value={contactReferralLink} />
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-medium text-zinc-900">Punktekonto</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-zinc-500">
              <tr>
                <th className="px-2 py-2">Datum</th>
                <th className="px-2 py-2">Buchung</th>
                <th className="px-2 py-2">Punkte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {pointsRows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-2 py-4 text-zinc-500">
                    Noch keine Buchungen vorhanden.
                  </td>
                </tr>
              ) : (
                pointsRows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-2 py-2 text-zinc-600">
                      {new Date(row.created_at).toLocaleString("de-DE")}
                    </td>
                    <td className="px-2 py-2 text-zinc-700">
                      {getBookingLabel(row)}
                    </td>
                    <td
                      className={`px-2 py-2 font-medium ${
                        row.points >= 0 ? "text-emerald-700" : "text-red-700"
                      }`}
                    >
                      {row.points > 0 ? `+${row.points}` : row.points}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-medium text-zinc-900">Eigene Empfehlungen</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-zinc-500">
              <tr>
                <th className="px-2 py-2">Name</th>
                <th className="px-2 py-2">E-Mail</th>
                <th className="px-2 py-2">Telefon</th>
                <th className="px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {referralRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-2 py-4 text-zinc-500">
                    Noch keine Empfehlungen vorhanden.
                  </td>
                </tr>
              ) : (
                referralRows.map((row) => {
                  const fullName =
                    row.contact_name ??
                    [row.contact_first_name, row.contact_last_name]
                      .filter(Boolean)
                      .join(" ")
                      .trim() ??
                    "-";
                  return (
                    <tr key={row.id}>
                      <td className="px-2 py-2 text-zinc-700">{fullName || "-"}</td>
                      <td className="px-2 py-2 text-zinc-700">
                        {row.contact_email ?? "-"}
                      </td>
                      <td className="px-2 py-2 text-zinc-700">
                        {row.contact_phone ?? "-"}
                      </td>
                      <td className="px-2 py-2 text-zinc-700">{row.status}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-medium text-zinc-900">
          Praemien und Einloesungen
        </h2>
        <p className="mt-2 text-sm text-zinc-600">
          Hier koennen Sie Ihre verfuegbaren Praemien einloesen und den Status Ihrer Einloesungen verfolgen.
        </p>
        <Link
          href="/empfehler/praemien"
          className="mt-3 inline-flex rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Zur Praemienseite
        </Link>
      </section>

      <form action={logoutAction}>
        <button
          type="submit"
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Logout
        </button>
      </form>
    </main>
  );
}

