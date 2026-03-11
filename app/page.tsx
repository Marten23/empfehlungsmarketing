import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/auth";

export default async function HomePage() {
  const { user } = await getCurrentUser();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-3xl font-semibold">Empfehlungsmarketing App</h1>
      <p className="max-w-xl text-sm text-zinc-600">
        MVP fuer Empfehlungsmarketing mit Berater-Dashboard, Referrer-Links und
        Statusmanagement.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {user ? (
          <Link
            href="/dashboard"
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          >
            Zum Dashboard
          </Link>
        ) : (
          <>
            <Link
              href="/login"
              className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900"
            >
              Signup
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
