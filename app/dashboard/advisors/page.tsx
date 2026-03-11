import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdvisorContext } from "@/lib/auth/advisor";
import { normalizeSupabaseError } from "@/lib/supabase/errors";

type AdvisorGrowthRow = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

export default async function DashboardAdvisorsPage() {
  const advisorContext = await getCurrentAdvisorContext();

  if (!advisorContext) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 p-6">
        <h1 className="text-2xl font-semibold">Advisor Wachstum</h1>
        <p className="rounded bg-zinc-100 px-3 py-2 text-sm text-zinc-700">
          Kein Advisor-Kontext gefunden.
        </p>
      </main>
    );
  }

  const supabase = await createClient();
  let successfulInvites: AdvisorGrowthRow[] = [];
  let loadError: string | null = null;
  let advisorInviteCode: string | null = null;

  try {
    const { data: advisorRow, error: advisorError } = await supabase
      .from("advisors")
      .select("invite_code")
      .eq("id", advisorContext.advisorId)
      .maybeSingle();

    if (advisorError) {
      const code = (advisorError as { code?: string }).code;
      if (code !== "PGRST204") {
        throw advisorError;
      }
    } else {
      advisorInviteCode = (advisorRow as { invite_code?: string | null } | null)
        ?.invite_code ?? null;
    }

    // Compatible with both current schema and upcoming 007 extension.
    const { data: rows, error } = await supabase
      .from("advisors")
      .select("id, name, slug, is_active, referred_by_advisor_id")
      .eq("referred_by_advisor_id", advisorContext.advisorId)
      .eq("is_active", true);

    if (error) throw error;
    successfulInvites = (rows ?? []) as AdvisorGrowthRow[];
  } catch (error) {
    loadError = normalizeSupabaseError(error).message;
  }
  const effectiveCode = advisorInviteCode ?? advisorContext.advisorSlug;
  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/ref/${effectiveCode}`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Advisor Wachstum</h1>
        <p className="text-sm text-zinc-600">
          Vorbereitung fuer Berater-Empfehlungen und Belohnungslogik.
        </p>
        <Link href="/dashboard" className="text-sm text-zinc-800 underline">
          Zurueck zum Dashboard
        </Link>
      </header>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="text-sm text-zinc-600">Persoenlicher Empfehlungslink</p>
        <p className="mt-1 break-all text-sm font-medium text-zinc-900">
          {inviteLink || `/ref/${advisorContext.advisorSlug}`}
        </p>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="text-sm text-zinc-600">
          Erfolgreiche Berater-Empfehlungen (aktiv):{" "}
          <span className="font-semibold text-zinc-900">
            {successfulInvites.length}
          </span>
        </p>
        {loadError ? (
          <p className="mt-2 rounded bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
            Hinweis: Growth-Daten derzeit nicht vollstaendig verfuegbar: {loadError}
          </p>
        ) : null}
      </section>
    </main>
  );
}
