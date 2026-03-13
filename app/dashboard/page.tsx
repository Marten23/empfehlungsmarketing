import { getCurrentUser } from "@/lib/auth/auth";
import { logoutAction } from "@/app/dashboard/actions";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdvisorContext } from "@/lib/auth/advisor";
import { listDashboardReferrals } from "@/lib/queries/referrals";
import { listReferrersForAdvisor } from "@/lib/queries/referrers";
import { normalizeSupabaseError } from "@/lib/supabase/errors";

export default async function DashboardPage() {
  const { user, role } = await getCurrentUser();

  let referralCount = 0;
  let openCount = 0;
  let closingCount = 0;
  let pendingReferrerCount = 0;
  let openRedemptionCount = 0;
  let advisorContext: Awaited<ReturnType<typeof getCurrentAdvisorContext>> =
    null;
  let loadError: string | null = null;

  try {
    advisorContext = await getCurrentAdvisorContext();
    if (advisorContext) {
      const supabase = await createClient();
      const rows = await listDashboardReferrals(supabase, advisorContext.advisorId);
      referralCount = rows.length;
      openCount = rows.filter((row) => row.status === "neu").length;
      closingCount = rows.filter((row) => row.status === "abschluss").length;

      const referrerRows = await listReferrersForAdvisor(
        supabase,
        advisorContext.advisorId,
      );
      pendingReferrerCount = referrerRows.filter((row) => !row.is_active).length;

      const { count } = await supabase
        .from("reward_redemptions")
        .select("id", { count: "exact", head: true })
        .eq("advisor_id", advisorContext.advisorId)
        .eq("status", "offen");
      openRedemptionCount = count ?? 0;
    }
  } catch (error) {
    loadError = normalizeSupabaseError(error).message;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Ihr Berater-Cockpit</h1>
        <p className="text-sm text-zinc-600">
          Uebersicht fuer {advisorContext?.advisorName ?? "deinen Bereich"}.
        </p>
      </header>

      {loadError ? (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          Dashboard konnte nicht geladen werden: {loadError}
        </p>
      ) : null}

      {pendingReferrerCount > 0 ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-900">
            {pendingReferrerCount} neue Empfehler warten auf Freigabe.
          </p>
          <Link href="/berater/dashboard/referrers" className="mt-2 inline-block text-sm underline">
            Jetzt freigeben
          </Link>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-500">Empfehlungen gesamt</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">
            {referralCount}
          </p>
        </article>
        <article className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-500">Status neu</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">{openCount}</p>
        </article>
        <article className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-500">Status Abschluss</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">
            {closingCount}
          </p>
        </article>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="text-sm text-zinc-700">
          Offene Prämien-Einlösungen:{" "}
          <span className="font-semibold text-zinc-900">{openRedemptionCount}</span>
        </p>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="text-sm">
          <span className="font-medium">E-Mail:</span> {user?.email ?? "-"}
        </p>
        <p className="mt-1 text-sm">
          <span className="font-medium">Rolle:</span> {role ?? "nicht gesetzt"}
        </p>
      </section>

      <section className="flex flex-wrap gap-2">
        <Link
          href="/berater/dashboard/referrals"
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Empfehlungen bearbeiten
        </Link>
        <Link
          href="/berater/dashboard/referrers"
          className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900"
        >
          Empfehler-Links
        </Link>
        <Link
          href="/berater/dashboard/advisors"
          className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900"
        >
          Berater empfehlen
        </Link>
      </section>

      <form action={logoutAction}>
        <button
          type="submit"
          className="w-fit rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Logout
        </button>
      </form>
    </main>
  );
}
