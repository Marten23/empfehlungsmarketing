import { getCurrentUser } from "@/lib/auth/auth";
import { logoutAction } from "@/app/dashboard/actions";

export default async function DashboardPage() {
  const { user, role } = await getCurrentUser();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-zinc-600">
          Auth ist aktiv. Dashboard-UI kommt im naechsten Schritt.
        </p>
      </header>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="text-sm">
          <span className="font-medium">User ID:</span> {user?.id}
        </p>
        <p className="mt-1 text-sm">
          <span className="font-medium">E-Mail:</span> {user?.email ?? "-"}
        </p>
        <p className="mt-1 text-sm">
          <span className="font-medium">Rolle (vorbereitet):</span>{" "}
          {role ?? "nicht gesetzt"}
        </p>
      </section>

      <form action={logoutAction}>
        <button
          type="submit"
          className="w-fit rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Logout
        </button>
      </form>
    </main>
  );
}

