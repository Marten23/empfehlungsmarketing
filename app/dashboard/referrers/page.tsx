import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdvisorContext } from "@/lib/auth/advisor";
import { listReferrersForAdvisor } from "@/lib/queries/referrers";
import { normalizeSupabaseError } from "@/lib/supabase/errors";
import { CopyLinkButton } from "@/app/dashboard/referrers/copy-link-button";
import { approveReferrerAction } from "@/app/dashboard/referrers/actions";

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

  try {
    const supabase = await createClient();
    rows = await listReferrersForAdvisor(supabase, advisorContext.advisorId);
  } catch (error) {
    loadError = normalizeSupabaseError(error).message;
  }

  const appBase = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const pendingCount = rows.filter((row) => !row.is_active).length;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Empfehler und Kontakt-Links</h1>
        <p className="text-sm text-zinc-600">
          Hier sehen Sie alle persoenlichen Kontakt-Empfehlungslinks Ihrer
          Empfehler.
        </p>
        <Link href="/berater/dashboard" className="text-sm text-zinc-800 underline">
          Zurueck zum Dashboard
        </Link>
      </header>

      {pendingCount > 0 ? (
        <p className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {pendingCount} Empfehler warten auf Freigabe.
        </p>
      ) : null}

      {params.approved === "1" ? (
        <p className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Empfehler wurde freigegeben.
        </p>
      ) : null}
      {params.approved === "0" ? (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          Freigabe fehlgeschlagen.
          {params.reason ? ` Grund: ${params.reason}` : ""}
        </p>
      ) : null}

      <section className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        {loadError ? (
          <p className="m-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            Empfehler konnten nicht geladen werden: {loadError}
          </p>
        ) : null}
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-600">
            <tr>
              <th className="px-4 py-3 font-medium">Empfehler</th>
              <th className="px-4 py-3 font-medium">Kontakt</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Kontakt-Empfehlungslink</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                  Noch keine Empfehler vorhanden.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const shareCode =
                  row.referral_slug ?? row.referral_code ?? row.invite_code ?? row.id;
                const link = `${appBase}/ref/${shareCode}`;

                return (
                  <tr key={row.id} className="align-top">
                    <td className="px-4 py-3 text-zinc-900">
                      {getDisplayName(row.first_name, row.last_name)}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      <p>{row.email ?? "-"}</p>
                      <p className="mt-1 text-xs text-zinc-500">{row.phone ?? "-"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-1 text-xs font-medium ${
                          row.is_active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-zinc-100 text-zinc-700"
                        }`}
                      >
                        {row.is_active ? "Aktiv" : "In Pruefung"}
                      </span>
                      {!row.is_active ? (
                        <form action={approveReferrerAction} className="mt-2">
                          <input type="hidden" name="referrer_id" value={row.id} />
                          <button
                            type="submit"
                            className="rounded bg-zinc-900 px-3 py-1 text-xs font-medium text-white"
                          >
                            Freigeben
                          </button>
                        </form>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      <p className="break-all">{link}</p>
                      <div className="mt-2">
                        <CopyLinkButton value={link} />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
