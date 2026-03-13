import Link from "next/link";
import { SignupForm } from "@/app/signup/signup-form";

type SignupPageProps = {
  searchParams: Promise<{
    invite?: string;
    invite_type?: string;
  }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const inviteCode = params.invite?.trim() ?? "";
  const inviteType = params.invite_type?.trim() ?? "";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-6 p-6">
      <div className="w-full max-w-sm space-y-2 text-center">
        <h1 className="text-2xl font-semibold">Signup</h1>
        <p className="text-sm text-zinc-600">
          Erstelle dein Konto fuer den Zugriff auf die App.
        </p>
        {inviteCode ? (
          <p className="rounded bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            Einladung erkannt ({inviteType || "invite"}): {inviteCode}
          </p>
        ) : null}
      </div>

      <SignupForm
        defaultInviteCode={inviteCode}
        defaultInviteType={inviteType}
      />

      <p className="text-sm text-zinc-600">
        Bereits registriert?{" "}
        <Link href="/berater/login" className="font-medium text-zinc-900 underline">
          Zum Login
        </Link>
      </p>
    </main>
  );
}
