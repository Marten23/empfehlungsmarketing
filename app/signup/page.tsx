import Link from "next/link";
import { SignupForm } from "@/app/signup/signup-form";

export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-6 p-6">
      <div className="w-full max-w-sm space-y-2 text-center">
        <h1 className="text-2xl font-semibold">Signup</h1>
        <p className="text-sm text-zinc-600">
          Erstelle dein Konto fuer den Zugriff auf die App.
        </p>
      </div>

      <SignupForm />

      <p className="text-sm text-zinc-600">
        Bereits registriert?{" "}
        <Link href="/login" className="font-medium text-zinc-900 underline">
          Zum Login
        </Link>
      </p>
    </main>
  );
}

