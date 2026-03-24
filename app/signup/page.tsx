import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignupForm } from "@/app/signup/signup-form";
import { getPublicReferrerInviteContext } from "@/lib/queries/public-referrer-invite";
import { getPublicLinkContext } from "@/lib/queries/public-referral";
import {
  SparklesIcon,
  TrophyIcon,
  UsersIcon,
} from "@/app/empfehler/dashboard/components/icons";

type SignupPageProps = {
  searchParams: Promise<{
    invite?: string;
    invite_type?: string;
  }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const inviteCode = params.invite?.trim() ?? "";
  const inviteTypeFromQuery = params.invite_type?.trim() ?? "";
  const inviteType = inviteTypeFromQuery === "referrer" ? "referrer" : "advisor";

  let resolvedInviteCode = "";
  let resolvedInviteType: "advisor" | "referrer" = "advisor";
  let invitedAdvisorName: string | null = null;
  let inviteError: string | null = null;

  if (inviteCode) {
    const supabase = await createClient();

    if (inviteType === "referrer") {
      try {
        const context = await getPublicReferrerInviteContext(supabase, inviteCode);
        if (context) {
          resolvedInviteCode = inviteCode;
          resolvedInviteType = "referrer";
          invitedAdvisorName = context.advisor_name;
        } else {
          inviteError =
            "Der Empfehler-Einladungslink ist ungültig oder nicht mehr aktiv. Sie können stattdessen ein Berater-Konto erstellen.";
        }
      } catch {
        inviteError =
          "Der Empfehler-Einladungslink konnte nicht geprüft werden. Bitte nutzen Sie den Link erneut oder erstellen Sie ein Berater-Konto.";
      }
    } else {
      try {
        const context = await getPublicLinkContext(supabase, inviteCode);
        if (context && context.link_type === "advisor") {
          resolvedInviteCode = inviteCode;
          resolvedInviteType = "advisor";
          invitedAdvisorName = context.advisor_name;
        } else {
          inviteError =
            "Der Berater-Einladungslink ist ungültig oder nicht mehr aktiv. Sie können stattdessen ein Berater-Konto erstellen.";
        }
      } catch {
        inviteError =
          "Der Berater-Einladungslink konnte nicht geprüft werden. Bitte nutzen Sie den Link erneut oder erstellen Sie ein Berater-Konto.";
      }
    }
  }

  const isReferrerSignup =
    resolvedInviteType === "referrer" && resolvedInviteCode.length > 0;

  const title = isReferrerSignup
    ? "Willkommen im Empfehlungsprogramm"
    : "Berater-Konto erstellen";

  const subtitle = isReferrerSignup
    ? "Registrieren Sie sich, um Empfehlungen einzureichen, Punkte zu sammeln und Prämien einzulösen."
    : "Erstellen Sie Ihr Konto und starten Sie Ihr Empfehlungsprogramm.";

  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center p-6 md:p-8">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_8%_4%,rgba(255,157,66,0.2),transparent_38%),radial-gradient(circle_at_92%_8%,rgba(96,165,250,0.18),transparent_38%),radial-gradient(circle_at_50%_120%,rgba(139,92,246,0.09),transparent_48%),linear-gradient(180deg,#fcfcff_0%,#f6f8ff_45%,#edf2ff_100%)]" />
      <div className="hex-honeycomb-bg pointer-events-none fixed inset-0 z-0 opacity-[0.1] [mask-image:linear-gradient(180deg,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0.1)_36%,rgba(0,0,0,0.02)_100%)]" />

      <section className="relative z-10 w-full max-w-5xl overflow-hidden rounded-3xl border border-zinc-200/85 bg-white/95 p-6 shadow-[0_20px_44px_rgba(15,23,42,0.1)] backdrop-blur-xl md:p-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_440px] lg:items-center">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-300/45 bg-orange-200/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-orange-800">
              <SparklesIcon className="h-3.5 w-3.5" />
              {isReferrerSignup ? "Empfehler-Registrierung" : "Berater-Registrierung"}
            </span>

            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
              {title}
            </h1>
            <p className="max-w-xl text-sm text-zinc-700 md:text-base">{subtitle}</p>

            {isReferrerSignup && invitedAdvisorName ? (
              <p className="rounded-xl border border-emerald-300/50 bg-emerald-50/90 px-3 py-2 text-sm text-emerald-800">
                Sie wurden in das Empfehlungsprogramm von{" "}
                <span className="font-semibold">{invitedAdvisorName}</span> eingeladen.
              </p>
            ) : null}

            {inviteError ? (
              <p className="rounded-xl border border-amber-300/55 bg-amber-50/90 px-3 py-2 text-sm text-amber-800">
                {inviteError}
              </p>
            ) : null}

            <p className="text-sm text-zinc-600">
              Bereits registriert?{" "}
              <Link
                href={isReferrerSignup ? "/empfehler/login" : "/berater/login"}
                className="font-medium text-orange-700 underline underline-offset-4"
              >
                {isReferrerSignup ? "Zum Empfehler-Login" : "Zum Berater-Login"}
              </Link>
            </p>

            {!isReferrerSignup ? (
              <p className="text-sm text-zinc-600">
                Sind Sie Empfehler? Nutzen Sie Ihren persönlichen Einladungslink oder{" "}
                <Link
                  href="/empfehler/login"
                  className="font-medium text-orange-700 underline underline-offset-4"
                >
                  den Empfehler-Login
                </Link>
                .
              </p>
            ) : null}
            <p className="text-sm text-zinc-600">
              <Link href="/" className="font-medium text-orange-700 underline underline-offset-4">
                Zur Landingpage
              </Link>
            </p>
          </div>

          <div className="rounded-2xl border border-orange-200/60 bg-white/88 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
            <p className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-orange-300/45 bg-orange-100 text-orange-700">
                {isReferrerSignup ? (
                  <TrophyIcon className="h-4 w-4" />
                ) : (
                  <UsersIcon className="h-4 w-4" />
                )}
              </span>
              {isReferrerSignup
                ? "Zugang zum Empfehlerbereich vorbereiten"
                : "Neues Beraterkonto anlegen"}
            </p>

            <SignupForm
              inviteCode={resolvedInviteCode}
              inviteType={resolvedInviteType}
              advisorName={invitedAdvisorName}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
