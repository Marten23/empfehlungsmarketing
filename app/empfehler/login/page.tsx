import Link from "next/link";
import { LoginForm } from "@/app/login/login-form";

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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-6 p-6">
      <div className="w-full max-w-sm space-y-2 text-center">
        <h1 className="text-2xl font-semibold">Empfehler-Login</h1>
        <p className="text-sm text-zinc-600">
          Melden Sie sich an, um Ihre Punkte, Empfehlungen und Prämien einzusehen.
        </p>
      </div>

      {showRegistered ? (
        <p className="w-full max-w-sm rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Registrierung erfolgreich.
          {showCheckEmail
            ? " Bitte bestätigen Sie zuerst Ihre E-Mail und melden Sie sich danach an."
            : " Bitte melden Sie sich jetzt an."}
        </p>
      ) : null}

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
