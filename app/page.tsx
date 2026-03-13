import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/auth";

export default async function HomePage() {
  const { user, role } = await getCurrentUser();
  const dashboardHref =
    role === "referrer" ? "/empfehler/dashboard" : "/berater/dashboard";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 p-6 md:p-10">
      <header className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
        <p className="text-sm font-semibold text-zinc-900">Empfehlungsmarketing</p>
        <nav className="flex items-center gap-2">
          <Link
            href="/berater/login"
            className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
          >
            Berater-Login
          </Link>
          <Link
            href="/empfehler/login"
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900"
          >
            Empfehler-Login
          </Link>
        </nav>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-zinc-900 md:text-4xl">
          Empfehlungsmarketing für Berater
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-zinc-600 md:text-base">
          Verwalten Sie Ihr Empfehlungsprogramm, steuern Sie Kontaktanfragen und
          geben Sie Ihren Empfehlern einen transparenten Bereich für Punkte und
          Prämien.
        </p>
        {user ? (
          <div className="mt-6">
            <Link
              href={dashboardHref}
              className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
            >
              Zum Dashboard
            </Link>
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-zinc-900">
          Der passende Zugang für Ihre Rolle
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border border-zinc-900 bg-zinc-900 p-6 text-white shadow-sm">
            <h3 className="text-lg font-semibold">Für Berater</h3>
            <p className="mt-2 text-sm text-zinc-200">
              Verwalten Sie Empfehlungen, Empfehler, Prämien und Ihr gesamtes
              Empfehlungsprogramm.
            </p>
            <Link
              href="/berater/login"
              className="mt-4 inline-flex rounded bg-white px-4 py-2 text-sm font-medium text-zinc-900"
            >
              Zum Berater-Login
            </Link>
          </article>

          <article className="rounded-xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-sm">
            <h3 className="text-lg font-semibold">Für Empfehler</h3>
            <p className="mt-2 text-sm text-zinc-600">
              Sehen Sie Ihre Punkte, Empfehlungen und Prämien in Ihrem
              persönlichen Bereich ein.
            </p>
            <Link
              href="/empfehler/login"
              className="mt-4 inline-flex rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900"
            >
              Zum Empfehler-Login
            </Link>
          </article>
        </div>
      </section>
    </main>
  );
}
