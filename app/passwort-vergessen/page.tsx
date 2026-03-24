import Link from "next/link";
import { SparklesIcon } from "@/app/empfehler/dashboard/components/icons";
import { ForgotPasswordForm } from "@/app/passwort-vergessen/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center p-6 md:p-8">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_8%_4%,rgba(255,157,66,0.2),transparent_38%),radial-gradient(circle_at_92%_8%,rgba(96,165,250,0.18),transparent_38%),radial-gradient(circle_at_50%_120%,rgba(139,92,246,0.09),transparent_48%),linear-gradient(180deg,#fcfcff_0%,#f6f8ff_45%,#edf2ff_100%)]" />
      <div className="hex-honeycomb-bg pointer-events-none fixed inset-0 z-0 opacity-[0.1] [mask-image:linear-gradient(180deg,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0.1)_36%,rgba(0,0,0,0.02)_100%)]" />

      <section className="relative z-10 w-full max-w-xl overflow-hidden rounded-3xl border border-zinc-200/85 bg-white/95 p-6 shadow-[0_20px_44px_rgba(15,23,42,0.1)] backdrop-blur-xl md:p-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-orange-300/45 bg-orange-200/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-orange-800">
          <SparklesIcon className="h-3.5 w-3.5" />
          Passwort zurücksetzen
        </span>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
          Passwort vergessen?
        </h1>
        <p className="mt-2 text-sm text-zinc-700 md:text-base">
          Geben Sie Ihre E-Mail-Adresse ein. Sie erhalten einen Link, um Ihr Passwort sicher zu ändern.
        </p>

        <div className="mt-6 rounded-2xl border border-orange-200/60 bg-white/88 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
          <ForgotPasswordForm />
        </div>

        <p className="mt-4 text-sm text-zinc-600">
          Zurück zum{" "}
          <Link
            href="/berater/login"
            className="font-medium text-orange-700 underline underline-offset-4"
          >
            Berater-Login
          </Link>{" "}
          oder{" "}
          <Link
            href="/empfehler/login"
            className="font-medium text-orange-700 underline underline-offset-4"
          >
            Empfehler-Login
          </Link>
          .
        </p>
      </section>
    </main>
  );
}

