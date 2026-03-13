import Link from "next/link";
import { LoginForm } from "@/app/login/login-form";

export default function AdvisorLoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-6 p-6">
      <div className="w-full max-w-sm space-y-2 text-center">
        <h1 className="text-2xl font-semibold">Berater-Login</h1>
        <p className="text-sm text-zinc-600">
          Melden Sie sich an, um Ihr Empfehlungsprogramm zu verwalten.
        </p>
      </div>

      <LoginForm />

      <p className="text-sm text-zinc-600">
        Noch kein Konto?{" "}
        <Link href="/signup" className="font-medium text-zinc-900 underline">
          Registrieren
        </Link>
      </p>
    </main>
  );
}
