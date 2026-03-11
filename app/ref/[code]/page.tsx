import { createClient } from "@/lib/supabase/server";
import {
  getPublicLinkContext,
  type PublicLinkContext,
} from "@/lib/queries/public-referral";
import {
  type PublicReferralFormState,
  submitPublicReferral,
} from "@/app/ref/[code]/actions";
import { ReferralForm } from "@/app/ref/[code]/referral-form";

type RefCodePageProps = {
  params: Promise<{ code: string }>;
};

export default async function RefCodePage({ params }: RefCodePageProps) {
  const { code } = await params;
  const supabase = await createClient();

  let context: PublicLinkContext | null = null;
  let lookupError: string | null = null;

  try {
    context = await getPublicLinkContext(supabase, code);
  } catch {
    lookupError = "Der Empfehlungslink konnte aktuell nicht geladen werden.";
  }

  if (lookupError) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-6 text-zinc-900">
        <h1 className="text-2xl font-semibold text-zinc-900">Empfehlungslink</h1>
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {lookupError}
        </p>
      </main>
    );
  }

  if (!context) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-6 text-zinc-900">
        <h1 className="text-2xl font-semibold text-zinc-900">Empfehlungslink</h1>
        <p className="rounded bg-zinc-100 px-3 py-2 text-sm text-zinc-700">
          Dieser Empfehlungslink ist ungültig oder nicht mehr aktiv.
        </p>
      </main>
    );
  }

  const submitAction = submitPublicReferral.bind(null, code);
  const initialState: PublicReferralFormState = {
    success: false,
    message: null,
    error: null,
  };

  if (context.link_type === "advisor") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-6 text-zinc-900">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-zinc-900">
            Einladung fuer Berater
          </h1>
          <p className="text-sm text-zinc-600">
            Du wurdest von <span className="font-medium">{context.advisor_name}</span>{" "}
            eingeladen.
          </p>
        </header>

        <section className="rounded-lg border border-zinc-200 bg-white p-4 text-zinc-900 shadow-sm">
          <p className="text-sm text-zinc-700">
            In diesem Schritt kannst du dein Berater-Konto starten. Die
            Zuordnung der Einladung ist bereits ueber den Link hinterlegt.
          </p>
          <a
            href={`/signup?invite=${encodeURIComponent(code)}&invite_type=advisor`}
            className="mt-4 inline-flex rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          >
            Als Berater registrieren
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-6 text-zinc-900">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">Empfehlung einreichen</h1>
        <p className="text-sm text-zinc-600">
          Berater: <span className="font-medium">{context.advisor_name}</span>
        </p>
        <p className="text-sm text-zinc-600">
          Empfohlen von:{" "}
          <span className="font-medium">
            {context.referrer_first_name} {context.referrer_last_name}
          </span>
        </p>
      </header>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 text-zinc-900 shadow-sm">
        <ReferralForm
          action={submitAction}
          initialState={initialState}
        />
      </section>
    </main>
  );
}
