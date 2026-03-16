import { createClient } from "@/lib/supabase/server";
import {
  getPublicReferrerInviteContext,
  type PublicReferrerInviteContext,
} from "@/lib/queries/public-referrer-invite";
import {
  type PublicReferrerInviteFormState,
  registerReferrerFromInvite,
} from "@/app/empfehler/[code]/actions";
import { ReferrerInviteForm } from "@/app/empfehler/[code]/referrer-invite-form";

type ReferrerInvitePageProps = {
  params: Promise<{ code: string }>;
};

export default async function ReferrerInvitePage({
  params,
}: ReferrerInvitePageProps) {
  const { code } = await params;
  const supabase = await createClient();

  let context: PublicReferrerInviteContext | null = null;
  let lookupError: string | null = null;

  try {
    context = await getPublicReferrerInviteContext(supabase, code);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    lookupError =
      message.includes("PGRST202") ||
      message.includes("get_public_referrer_invite_context")
        ? "Der Link ist noch nicht aktiv. Bitte zuerst die neue SQL-Migration ausführen."
        : "Der Empfehler-Einladungslink konnte aktuell nicht geladen werden.";
  }

  if (lookupError) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-6 text-zinc-900">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Empfehler-Einladung
        </h1>
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {lookupError}
        </p>
      </main>
    );
  }

  if (!context) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-6 text-zinc-900">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Empfehler-Einladung
        </h1>
        <p className="rounded bg-zinc-100 px-3 py-2 text-sm text-zinc-700">
          Dieser Empfehler-Einladungslink ist ungültig oder nicht mehr aktiv.
        </p>
      </main>
    );
  }

  const submitAction = registerReferrerFromInvite.bind(null, code);
  const initialState: PublicReferrerInviteFormState = {
    success: false,
    message: null,
    error: null,
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-6 text-zinc-900">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Als Empfehler eingeladen
        </h1>
        <p className="text-sm text-zinc-600">
          Sie wurden eingeladen, das Empfehlungsprogramm von{" "}
          <span className="font-medium">{context.advisor_name}</span> zu
          unterstützen.
        </p>
      </header>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 text-zinc-900 shadow-sm">
        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
          Ihr persönlicher Einladungscode
        </p>
        <p className="mt-1 inline-flex rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-xs font-semibold text-zinc-800">
          {code}
        </p>
        <p className="mb-4 text-sm text-zinc-700">
          Als Empfehler bringen Sie neue Kontakte ins System. Nach der Registrierung
          erhalten Sie Ihr eigenes Dashboard mit Punkten, Transaktionen und
          Ihrem persönlichen Kontakt-Empfehlungslink.
        </p>
        <ReferrerInviteForm action={submitAction} initialState={initialState} />
      </section>
    </main>
  );
}
