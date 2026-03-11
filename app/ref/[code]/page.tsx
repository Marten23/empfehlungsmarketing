import { createClient } from "@/lib/supabase/server";
import { findPublicReferrerByCodeOrSlug } from "@/lib/queries/referrers";
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

  let referrer: Awaited<ReturnType<typeof findPublicReferrerByCodeOrSlug>> =
    null;
  let lookupError: string | null = null;

  try {
    referrer = await findPublicReferrerByCodeOrSlug(supabase, code);
  } catch {
    lookupError = "Der Empfehlungslink konnte aktuell nicht geladen werden.";
  }

  if (lookupError) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-6 text-zinc-100">
        <h1 className="text-2xl font-semibold text-zinc-100">Empfehlungslink</h1>
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {lookupError}
        </p>
      </main>
    );
  }

  if (!referrer || !referrer.advisor || !referrer.advisor.is_active) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-6 text-zinc-100">
        <h1 className="text-2xl font-semibold text-zinc-100">Empfehlungslink</h1>
        <p className="rounded bg-zinc-100 px-3 py-2 text-sm text-zinc-700">
          Dieser Empfehlungslink ist ungueltig oder nicht mehr aktiv.
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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-6 text-zinc-100">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-100">Empfehlung einreichen</h1>
        <p className="text-sm text-zinc-300">
          Berater: <span className="font-medium">{referrer.advisor.name}</span>
        </p>
        <p className="text-sm text-zinc-300">
          Empfohlen von:{" "}
          <span className="font-medium">
            {referrer.first_name} {referrer.last_name}
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
