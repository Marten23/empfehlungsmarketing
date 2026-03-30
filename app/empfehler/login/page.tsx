import Link from "next/link";
import { LoginForm } from "@/app/login/login-form";
import { SparklesIcon, TrophyIcon } from "@/app/empfehler/dashboard/components/icons";

type ReferrerLoginPageProps = {
  searchParams: Promise<{
    registered?: string;
    check_email?: string;
  }>;
};

export default async function ReferrerLoginPage({
  searchParams,
}: ReferrerLoginPageProps) {
  const params = await searchParams;
  const showRegistered = params.registered === "1";
  const showCheckEmail = params.check_email === "1";
  const referrerInfo =
    "Sehen Sie Ihre Punkte, Empfehlungen und Prämien in Ihrem persönlichen Bereich und verfolgen Sie Ihren Fortschritt.";

  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center p-6 md:p-8">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_8%_4%,rgba(255,157,66,0.2),transparent_38%),radial-gradient(circle_at_92%_8%,rgba(96,165,250,0.18),transparent_38%),radial-gradient(circle_at_50%_120%,rgba(59,130,246,0.09),transparent_48%),linear-gradient(180deg,#fcfcff_0%,#f6f8ff_45%,#edf2ff_100%)]" />
      <div className="hex-honeycomb-bg pointer-events-none fixed inset-0 z-0 opacity-[0.1] [mask-image:linear-gradient(180deg,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0.1)_36%,rgba(0,0,0,0.02)_100%)]" />

      <section className="relative z-10 w-full max-w-5xl overflow-hidden rounded-3xl border border-zinc-200/85 bg-white/95 p-6 shadow-[0_20px_44px_rgba(15,23,42,0.1)] backdrop-blur-xl md:p-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-300/45 bg-orange-200/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-orange-800">
              <SparklesIcon className="h-3.5 w-3.5" />
              Empfehlerzugang
            </span>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
              Empfehler-Login
            </h1>
            <p className="max-w-xl text-sm text-zinc-700 md:text-base">{referrerInfo}</p>
            <p className="text-sm text-zinc-600">
              Sind Sie Berater?{" "}
              <Link href="/berater/login" className="font-medium text-orange-700 underline underline-offset-4">
                Zum Berater-Login
              </Link>
            </p>
            <p className="text-sm text-zinc-600">
              <Link href="/" className="font-medium text-orange-700 underline underline-offset-4">
                Zur Landingpage
              </Link>
            </p>
          </div>

          <div className="rounded-2xl border border-orange-200/60 bg-white/88 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
            <p className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-orange-300/45 bg-orange-100 text-orange-700">
                <TrophyIcon className="h-4 w-4" />
              </span>
              Zugang zum Empfehlerbereich
            </p>

            {showRegistered ? (
              <p className="mb-4 rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Registrierung erfolgreich.
                {showCheckEmail
                  ? " Bitte bestätigen Sie zuerst Ihre E-Mail und melden Sie sich danach an."
                  : " Bitte melden Sie sich jetzt an."}
              </p>
            ) : null}

            <LoginForm />

            <p className="mt-4 text-sm text-zinc-600">
              Noch kein Konto? Öffnen Sie Ihren persönlichen Einladungslink oder
              wenden Sie sich an Ihren Berater.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

