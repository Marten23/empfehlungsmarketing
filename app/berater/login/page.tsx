import Link from "next/link";
import { LoginForm } from "@/app/login/login-form";
import { SparklesIcon, UsersIcon } from "@/app/empfehler/dashboard/components/icons";

export default function AdvisorLoginPage() {
  const advisorInfo =
    "Verwalten Sie Empfehlungen, Empfehler, Punkte, Pr\u00e4mien und Einl\u00f6sungen zentral in Ihrem Cockpit.";

  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center p-6 md:p-8">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_35%,rgba(170,130,255,0.16),transparent_52%),radial-gradient(circle_at_15%_0%,rgba(126,87,255,0.26),transparent_42%),radial-gradient(circle_at_85%_8%,rgba(159,124,255,0.2),transparent_40%),linear-gradient(180deg,#1b1230_0%,#140d26_100%)]" />
      <div className="hex-honeycomb-bg pointer-events-none fixed inset-0 z-0 opacity-24" />

      <section className="relative z-10 w-full max-w-5xl overflow-hidden rounded-3xl border border-violet-200/55 bg-violet-50/90 p-6 shadow-[0_24px_60px_rgba(5,3,12,0.38)] backdrop-blur-xl md:p-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-300/45 bg-violet-200/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-violet-800">
              <SparklesIcon className="h-3.5 w-3.5" />
              Beraterzugang
            </span>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
              Berater-Login
            </h1>
            <p className="max-w-xl text-sm text-zinc-700 md:text-base">{advisorInfo}</p>
            <p className="text-sm text-zinc-600">
              Kein Beraterkonto?{" "}
              <Link href="/berater/signup" className="font-medium text-violet-700 underline underline-offset-4">
                Jetzt registrieren
              </Link>
            </p>
            <p className="text-sm text-zinc-600">
              Sind Sie Empfehler?{" "}
              <Link href="/empfehler/login" className="font-medium text-violet-700 underline underline-offset-4">
                Zum Empfehler-Login
              </Link>
            </p>
          </div>

          <div className="rounded-2xl border border-violet-200/60 bg-white/88 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
            <p className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-violet-300/45 bg-violet-100 text-violet-700">
                <UsersIcon className="h-4 w-4" />
              </span>
              Zugang zum Beraterbereich
            </p>
            <LoginForm />
          </div>
        </div>
      </section>
    </main>
  );
}
