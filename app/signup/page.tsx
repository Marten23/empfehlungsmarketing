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
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_35%,rgba(170,130,255,0.16),transparent_52%),radial-gradient(circle_at_15%_0%,rgba(126,87,255,0.26),transparent_42%),radial-gradient(circle_at_85%_8%,rgba(159,124,255,0.2),transparent_40%),linear-gradient(180deg,#1b1230_0%,#140d26_100%)]" />
      <div className="hex-honeycomb-bg pointer-events-none fixed inset-0 z-0 opacity-24" />

      <section className="relative z-10 w-full max-w-5xl overflow-hidden rounded-3xl border border-violet-200/55 bg-violet-50/90 p-6 shadow-[0_24px_60px_rgba(5,3,12,0.38)] backdrop-blur-xl md:p-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_440px] lg:items-center">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-300/45 bg-violet-200/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-violet-800">
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
                className="font-medium text-violet-700 underline underline-offset-4"
              >
                {isReferrerSignup ? "Zum Empfehler-Login" : "Zum Berater-Login"}
              </Link>
            </p>

            {!isReferrerSignup ? (
              <p className="text-sm text-zinc-600">
                Sind Sie Empfehler? Nutzen Sie Ihren persönlichen Einladungslink oder{" "}
                <Link
                  href="/empfehler/login"
                  className="font-medium text-violet-700 underline underline-offset-4"
                >
                  den Empfehler-Login
                </Link>
                .
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-violet-200/60 bg-white/88 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
            <p className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-violet-300/45 bg-violet-100 text-violet-700">
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
