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
import { SparklesIcon, TrophyIcon } from "@/app/empfehler/dashboard/components/icons";

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
      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center p-6 md:p-8 text-zinc-900">
        <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_8%_4%,rgba(255,157,66,0.2),transparent_38%),radial-gradient(circle_at_92%_8%,rgba(96,165,250,0.18),transparent_38%),radial-gradient(circle_at_50%_120%,rgba(59,130,246,0.09),transparent_48%),linear-gradient(180deg,#fcfcff_0%,#f6f8ff_45%,#edf2ff_100%)]" />
        <div className="hex-honeycomb-bg pointer-events-none fixed inset-0 z-0 opacity-[0.1] [mask-image:linear-gradient(180deg,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0.1)_36%,rgba(0,0,0,0.02)_100%)]" />
        <section className="relative z-10 w-full max-w-3xl overflow-hidden rounded-3xl border border-zinc-200/85 bg-white/95 p-6 shadow-[0_20px_44px_rgba(15,23,42,0.1)] backdrop-blur-xl md:p-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-300/45 bg-orange-200/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-orange-800">
            <SparklesIcon className="h-3.5 w-3.5" />
            Einladung für Empfehler
          </span>
          <h1 className="mt-3 text-2xl font-semibold text-zinc-900">Empfehler-Einladung</h1>
          <p className="mt-3 rounded-xl border border-rose-300/70 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {lookupError}
          </p>
        </section>
      </main>
    );
  }

  if (!context) {
    return (
      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center p-6 md:p-8 text-zinc-900">
        <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_8%_4%,rgba(255,157,66,0.2),transparent_38%),radial-gradient(circle_at_92%_8%,rgba(96,165,250,0.18),transparent_38%),radial-gradient(circle_at_50%_120%,rgba(59,130,246,0.09),transparent_48%),linear-gradient(180deg,#fcfcff_0%,#f6f8ff_45%,#edf2ff_100%)]" />
        <div className="hex-honeycomb-bg pointer-events-none fixed inset-0 z-0 opacity-[0.1] [mask-image:linear-gradient(180deg,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0.1)_36%,rgba(0,0,0,0.02)_100%)]" />
        <section className="relative z-10 w-full max-w-3xl overflow-hidden rounded-3xl border border-zinc-200/85 bg-white/95 p-6 shadow-[0_20px_44px_rgba(15,23,42,0.1)] backdrop-blur-xl md:p-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-300/45 bg-orange-200/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-orange-800">
            <SparklesIcon className="h-3.5 w-3.5" />
            Einladung für Empfehler
          </span>
          <h1 className="mt-3 text-2xl font-semibold text-zinc-900">Empfehler-Einladung</h1>
          <p className="mt-3 rounded-xl border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-700">
            Dieser Empfehler-Einladungslink ist ungültig oder nicht mehr aktiv.
          </p>
        </section>
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
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center p-6 md:p-8 text-zinc-900">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_8%_4%,rgba(255,157,66,0.2),transparent_38%),radial-gradient(circle_at_92%_8%,rgba(96,165,250,0.18),transparent_38%),radial-gradient(circle_at_50%_120%,rgba(59,130,246,0.09),transparent_48%),linear-gradient(180deg,#fcfcff_0%,#f6f8ff_45%,#edf2ff_100%)]" />
      <div className="hex-honeycomb-bg pointer-events-none fixed inset-0 z-0 opacity-[0.1] [mask-image:linear-gradient(180deg,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0.1)_36%,rgba(0,0,0,0.02)_100%)]" />

      <section className="relative z-10 w-full max-w-5xl overflow-hidden rounded-3xl border border-zinc-200/85 bg-white/95 p-6 shadow-[0_20px_44px_rgba(15,23,42,0.1)] backdrop-blur-xl md:p-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_430px] lg:items-center">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-300/45 bg-orange-200/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-orange-800">
              <SparklesIcon className="h-3.5 w-3.5" />
              Einladung für Empfehler
            </span>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
              Als Empfehler eingeladen
            </h1>
            <p className="text-sm text-zinc-600 md:text-base">
              Sie wurden eingeladen, das Empfehlungsprogramm von{" "}
              <span className="font-medium">{context.advisor_name}</span> zu unterstützen.
            </p>
            <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/90 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                Ihr persönlicher Einladungscode
              </p>
              <p className="mt-1 inline-flex rounded-md border border-zinc-200 bg-white px-2 py-1 font-mono text-xs font-semibold text-zinc-800">
                {code}
              </p>
            </div>
            <p className="text-sm text-zinc-700">
              Nach der Registrierung erhalten Sie Ihr eigenes Dashboard mit Punkten,
              Transaktionen und Ihrem persönlichen Kontakt-Empfehlungslink.
            </p>
            <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Kurzablauf
              </p>
              <ol className="mt-2 space-y-1.5 text-sm text-zinc-700">
                <li>1. Konto als Empfehler anlegen</li>
                <li>2. E-Mail bestätigen</li>
                <li>3. Im Dashboard Empfehlungen einreichen und Punkte sammeln</li>
              </ol>
            </div>
          </div>

          <div className="rounded-2xl border border-orange-200/60 bg-white/92 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
            <p className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-orange-300/45 bg-orange-100 text-orange-700">
                <TrophyIcon className="h-4 w-4" />
              </span>
              Registrierung abschließen
            </p>
            <ReferrerInviteForm action={submitAction} initialState={initialState} />
          </div>
        </div>
      </section>
    </main>
  );
}
