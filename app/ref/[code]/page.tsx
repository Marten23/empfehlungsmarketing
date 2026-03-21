import { createClient } from "@/lib/supabase/server";
import {
  getPublicLinkContext,
  type PublicLinkContext,
} from "@/lib/queries/public-referral";
import {
  type PublicReferralFormState,
  submitPublicReferral,
} from "@/app/ref/[code]/actions";
import { ReferralForm } from "@/app/ref/[code]/referral-form";
import { AdvisorIntroPanel } from "@/app/ref/[code]/advisor-intro-panel";

type RefCodePageProps = {
  params: Promise<{ code: string }>;
};

type AdvisorPresentation = {
  displayName: string;
  businessName: string;
  phone: string | null;
  email: string | null;
  imageUrl: string | null;
  welcomeText: string | null;
  welcomeVideoUrl: string | null;
  showWelcomeVideo: boolean;
};

export default async function RefCodePage({ params }: RefCodePageProps) {
  const { code } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let context: PublicLinkContext | null = null;
  let lookupError: string | null = null;

  try {
    context = await getPublicLinkContext(supabase, code);
  } catch {
    lookupError = "Der Empfehlungslink konnte aktuell nicht geladen werden.";
  }

  if (lookupError) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-6 text-zinc-900">
        <h1 className="text-2xl font-semibold text-zinc-900">Empfehlungslink</h1>
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {lookupError}
        </p>
      </main>
    );
  }

  if (!context) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-6 text-zinc-900">
        <h1 className="text-2xl font-semibold text-zinc-900">Empfehlungslink</h1>
        <p className="rounded bg-zinc-100 px-3 py-2 text-sm text-zinc-700">
          Dieser Empfehlungslink ist ungültig oder nicht mehr aktiv.
        </p>
      </main>
    );
  }

  if (context.link_type === "advisor") {
    const signupHref = `/signup?invite=${encodeURIComponent(code)}&invite_type=advisor`;
    const switchAccountHref = `/auth/start-advisor-signup?invite=${encodeURIComponent(code)}&invite_type=advisor`;

    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-6 text-zinc-900">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-zinc-900">
            Einladung für Berater
          </h1>
          <p className="text-sm text-zinc-600">
            Du wurdest von <span className="font-medium">{context.advisor_name}</span>{" "}
            eingeladen.
          </p>
        </header>

        <section className="rounded-lg border border-zinc-200 bg-white p-4 text-zinc-900 shadow-sm">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">
            Ihr persönlicher Einladungscode
          </p>
          <p className="mt-1 inline-flex rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-xs font-semibold text-zinc-800">
            {code}
          </p>
          <p className="mt-3 text-sm text-zinc-700">
            In diesem Schritt kannst du dein Berater-Konto starten. Die
            Zuordnung der Einladung ist bereits über den Link hinterlegt.
          </p>
          {user ? (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-zinc-600">
                Du bist aktuell eingeloggt. Für eine neue Berater-Registrierung
                wirst du zuerst abgemeldet.
              </p>
              <a
                href={switchAccountHref}
                className="inline-flex rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
              >
                Abmelden und als Berater registrieren
              </a>
            </div>
          ) : (
            <a
              href={signupHref}
              className="mt-4 inline-flex rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
            >
              Als Berater registrieren
            </a>
          )}
        </section>
      </main>
    );
  }

  const submitAction = submitPublicReferral.bind(null, code);
  const initialState: PublicReferralFormState = {
    success: false,
    message: null,
    error: null,
  };

  const presentation: AdvisorPresentation = {
    displayName: context.advisor_name,
    businessName: context.advisor_name,
    phone: null,
    email: null,
    imageUrl: null,
    welcomeText: null,
    welcomeVideoUrl: null,
    showWelcomeVideo: false,
  };

  try {
    const { data: advisorCore } = await supabase
      .from("advisors")
      .select("name, owner_user_id")
      .eq("id", context.advisor_id)
      .maybeSingle();

    const ownerUserId = (advisorCore as { owner_user_id?: string | null } | null)
      ?.owner_user_id;
    const advisorName = (advisorCore as { name?: string | null } | null)?.name;
    if (advisorName) {
      presentation.businessName = advisorName;
      presentation.displayName = advisorName;
    }

    if (ownerUserId) {
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("full_name, phone, avatar_url")
        .eq("user_id", ownerUserId)
        .maybeSingle();

      if (ownerProfile) {
        const fullName = String(ownerProfile.full_name ?? "").trim();
        if (fullName) presentation.displayName = fullName;
        if (typeof ownerProfile.phone === "string") presentation.phone = ownerProfile.phone;
        if (typeof ownerProfile.avatar_url === "string") presentation.imageUrl = ownerProfile.avatar_url;
      }
    }

    const { data: settingsRow } = await supabase
      .from("advisor_settings")
      .select("contact_name, contact_phone, contact_email, contact_avatar_url, welcome_text, welcome_video_url, show_welcome_video_on_referral_page")
      .eq("advisor_id", context.advisor_id)
      .maybeSingle();

    const settings = settingsRow as {
      contact_name?: string | null;
      contact_phone?: string | null;
      contact_email?: string | null;
      contact_avatar_url?: string | null;
      welcome_text?: string | null;
      welcome_video_url?: string | null;
      show_welcome_video_on_referral_page?: boolean | null;
    } | null;

    const cName = String(settings?.contact_name ?? "").trim();
    const cPhone = String(settings?.contact_phone ?? "").trim();
    const cEmail = String(settings?.contact_email ?? "").trim();
    const cAvatar = String(settings?.contact_avatar_url ?? "").trim();
    const welcomeText = String(settings?.welcome_text ?? "").trim();
    const welcomeVideoUrl = String(settings?.welcome_video_url ?? "").trim();
    const showVideo = Boolean(settings?.show_welcome_video_on_referral_page) && Boolean(welcomeVideoUrl);

    if (cName) presentation.displayName = cName;
    if (cPhone) presentation.phone = cPhone;
    if (cEmail) presentation.email = cEmail;
    if (cAvatar) presentation.imageUrl = cAvatar;
    if (welcomeText) presentation.welcomeText = welcomeText;
    if (welcomeVideoUrl) presentation.welcomeVideoUrl = welcomeVideoUrl;
    presentation.showWelcomeVideo = showVideo;
  } catch {
    // Fallback remains with base context data.
  }

  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-4 p-4 md:p-6">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_35%,rgba(170,130,255,0.16),transparent_52%),radial-gradient(circle_at_15%_0%,rgba(126,87,255,0.26),transparent_42%),radial-gradient(circle_at_85%_8%,rgba(159,124,255,0.2),transparent_40%),linear-gradient(180deg,#1b1230_0%,#140d26_100%)]" />
      <div className="hex-honeycomb-bg pointer-events-none fixed inset-0 z-0 opacity-22" />

      <section className="relative z-10 overflow-hidden rounded-3xl border border-violet-200/60 bg-violet-50/88 p-4 shadow-[0_28px_70px_rgba(5,3,12,0.35)] backdrop-blur-xl md:p-5">
        <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <AdvisorIntroPanel
            displayName={presentation.displayName}
            imageUrl={presentation.imageUrl}
            phone={presentation.phone}
            email={presentation.email}
            welcomeVideoUrl={presentation.welcomeVideoUrl}
            showWelcomeVideo={presentation.showWelcomeVideo}
          />

          <div className="rounded-2xl border border-violet-200/70 bg-white/86 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
            <span className="inline-flex items-center rounded-full border border-violet-300/45 bg-violet-200/45 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-violet-800">
              Persönliche Empfehlung
            </span>
            <h1 className="mt-2 text-xl font-semibold text-zinc-900 md:text-2xl">
              Kontaktanfrage an {presentation.businessName}
            </h1>
            <p className="mt-1 text-sm text-zinc-700">
              Empfohlen von {context.referrer_first_name} {context.referrer_last_name}
            </p>
            {presentation.welcomeText ? (
              <p className="mt-3 rounded-xl border border-violet-200/70 bg-violet-50/70 px-3 py-2 text-sm text-zinc-700">
                {presentation.welcomeText}
              </p>
            ) : null}
            <div className="mt-3">
              <ReferralForm action={submitAction} initialState={initialState} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
