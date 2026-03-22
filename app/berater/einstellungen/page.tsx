import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdvisorContext } from "@/lib/auth/advisor";
import { normalizeSupabaseError } from "@/lib/supabase/errors";
import { AdvisorAreaHeader } from "@/app/berater/components/advisor-area-header";
import { AdvisorBusinessImageUploader } from "@/app/berater/einstellungen/advisor-business-image-uploader";
import { PreviewDialogTrigger } from "@/app/berater/einstellungen/preview-dialog-trigger";
import { WelcomeTextField } from "@/app/berater/einstellungen/welcome-text-field";
import {
  SparklesIcon,
  TrophyIcon,
  UsersIcon,
} from "@/app/empfehler/dashboard/components/icons";

type PageProps = {
  searchParams: Promise<{
    settings_saved?: string;
    contact_saved?: string;
    avatar_saved?: string;
    presentation_saved?: string;
    video_saved?: string;
    video_removed?: string;
    video_url?: string;
    error?: string;
  }>;
};

const ADVISOR_IMAGE_BUCKET = "reward-images";
const ADVISOR_VIDEO_BUCKET = "advisor-videos";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

function toErrorMessage(error: unknown) {
  return encodeURIComponent(normalizeSupabaseError(error).message);
}

function getFileExtension(fileName: string): string {
  const parts = fileName.split(".");
  if (parts.length < 2) return "bin";
  const extension = parts.pop()?.toLowerCase() ?? "bin";
  return extension.replace(/[^a-z0-9]/g, "") || "bin";
}

function extractStoragePathFromUrl(
  url: string | null | undefined,
  bucketId: string,
) {
  if (!url) return null;
  const publicPrefix = `/storage/v1/object/public/${bucketId}/`;

  try {
    const parsed = new URL(url);
    const idx = parsed.pathname.indexOf(publicPrefix);
    if (idx === -1) return null;
    return decodeURIComponent(
      parsed.pathname.slice(idx + publicPrefix.length),
    );
  } catch {
    const idx = url.indexOf(publicPrefix);
    if (idx === -1) return null;
    return decodeURIComponent(url.slice(idx + publicPrefix.length));
  }
}

function redirectWithQuery(params: Record<string, string>): never {
  const query = new URLSearchParams(params);
  redirect(`/berater/einstellungen?${query.toString()}`);
}

function revalidateAdvisorSettingsArea() {
  revalidatePath("/berater/einstellungen");
  revalidatePath("/berater/dashboard");
  revalidatePath("/berater/dashboard/advisors");
  revalidatePath("/berater/dashboard/referrals");
  revalidatePath("/empfehler/dashboard");
}

async function ensureWelcomeVideoColumnsExist(
  supabase: Awaited<ReturnType<typeof createClient>>,
  advisorId: string,
) {
  const { error } = await supabase
    .from("advisor_settings")
    .select("welcome_video_url, show_welcome_video_on_referral_page, welcome_text")
    .eq("advisor_id", advisorId)
    .maybeSingle();

  if (error) {
    const code = (error as { code?: string }).code;
    if (code === "PGRST204") {
      redirectWithQuery({
        error:
          "Die Video-Felder fehlen noch in der Datenbank. Bitte Migration 025_advisor_referral_page_presentation.sql ausführen.",
      });
    }
    throw error;
  }
}

async function getCurrentAuthContext() {
  const supabase = await createClient();
  const advisorContext = await getCurrentAdvisorContext();
  if (!advisorContext) redirect("/berater/login");
  return { supabase, advisorContext };
}

async function saveGamificationSettingsAction(formData: FormData) {
  "use server";

  const { supabase, advisorContext } = await getCurrentAuthContext();

  const autoAwardRaw = String(
    formData.get("auto_award_points_on_referral_close") ?? "1",
  ).trim();
  const autoAward = autoAwardRaw === "1";

  const pointsRaw = Number(String(formData.get("points_per_successful_referral") ?? "").trim());
  const bronzeRaw = Number(String(formData.get("level_bronze_points") ?? "").trim());
  const silverRaw = Number(String(formData.get("level_silver_points") ?? "").trim());
  const goldRaw = Number(String(formData.get("level_gold_points") ?? "").trim());
  const platinumRaw = Number(String(formData.get("level_platinum_points") ?? "").trim());

  if (
    !Number.isFinite(pointsRaw) ||
    pointsRaw <= 0 ||
    !Number.isFinite(bronzeRaw) ||
    !Number.isFinite(silverRaw) ||
    !Number.isFinite(goldRaw) ||
    !Number.isFinite(platinumRaw) ||
    bronzeRaw <= 0 ||
    silverRaw <= bronzeRaw ||
    goldRaw <= silverRaw ||
    platinumRaw <= goldRaw
  ) {
    redirectWithQuery({
      error:
        "Bitte gültige Werte eintragen. Level-Schwellen müssen aufsteigend sein.",
    });
  }

  const { error } = await supabase.from("advisor_settings").upsert(
    {
      advisor_id: advisorContext.advisorId,
      auto_award_points_on_referral_close: autoAward,
      points_per_successful_referral: pointsRaw,
      level_bronze_points: bronzeRaw,
      level_silver_points: silverRaw,
      level_gold_points: goldRaw,
      level_platinum_points: platinumRaw,
    },
    { onConflict: "advisor_id" },
  );

  if (error) {
    redirectWithQuery({ error: toErrorMessage(error) });
  }

  revalidateAdvisorSettingsArea();
  redirectWithQuery({ settings_saved: "1" });
}

async function saveAdvisorContactSettingsAction(formData: FormData) {
  "use server";

  const { supabase, advisorContext } = await getCurrentAuthContext();

  const contactName = String(formData.get("contact_name") ?? "").trim();
  const contactPhone = String(formData.get("contact_phone") ?? "").trim();
  const contactEmail = String(formData.get("contact_email") ?? "")
    .trim()
    .toLowerCase();

  if (contactEmail && !/\S+@\S+\.\S+/.test(contactEmail)) {
    redirectWithQuery({ error: "Bitte eine gültige E-Mail-Adresse eintragen." });
  }

  const payload: {
    advisor_id: string;
    contact_name: string | null;
    contact_phone: string | null;
    contact_email: string | null;
    contact_avatar_url?: string | null;
  } = {
    advisor_id: advisorContext.advisorId,
    contact_name: contactName || null,
    contact_phone: contactPhone || null,
    contact_email: contactEmail || null,
  };

  if (formData.has("contact_avatar_url")) {
    const contactAvatarUrl = String(formData.get("contact_avatar_url") ?? "").trim();
    payload.contact_avatar_url = contactAvatarUrl || null;
  }

  const { error } = await supabase
    .from("advisor_settings")
    .upsert(payload, { onConflict: "advisor_id" });

  if (error) {
    redirectWithQuery({ error: toErrorMessage(error) });
  }

  revalidateAdvisorSettingsArea();
  redirectWithQuery({ contact_saved: "1" });
}

async function saveAdvisorPresentationSettingsAction(formData: FormData) {
  "use server";

  const { supabase, advisorContext } = await getCurrentAuthContext();
  await ensureWelcomeVideoColumnsExist(supabase, advisorContext.advisorId);

  const welcomeText = String(formData.get("welcome_text") ?? "").trim();
  const showVideo = String(formData.get("show_welcome_video_on_referral_page") ?? "") === "1";

  const { error } = await supabase.from("advisor_settings").upsert(
    {
      advisor_id: advisorContext.advisorId,
      welcome_text: welcomeText || null,
      show_welcome_video_on_referral_page: showVideo,
    },
    { onConflict: "advisor_id" },
  );

  if (error) {
    redirectWithQuery({ error: toErrorMessage(error) });
  }

  revalidateAdvisorSettingsArea();
  redirectWithQuery({ presentation_saved: "1" });
}

async function uploadAdvisorContactImageAction(formData: FormData) {
  "use server";

  const { supabase, advisorContext } = await getCurrentAuthContext();
  const imageFile = formData.get("contact_avatar_file");

  if (!(imageFile instanceof File) || imageFile.size === 0) {
    redirectWithQuery({ error: "Bitte eine Bilddatei auswählen." });
  }

  const file = imageFile;
  if (!file.type.startsWith("image/")) {
    redirectWithQuery({ error: "Nur Bilddateien sind erlaubt." });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    redirectWithQuery({ error: "Datei zu groß (maximal 5 MB)." });
  }

  try {
    const extension = getFileExtension(file.name);
    const filePath = `${advisorContext.advisorId}/contact-${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(ADVISOR_IMAGE_BUCKET)
      .upload(filePath, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from(ADVISOR_IMAGE_BUCKET).getPublicUrl(filePath);

    const { data: currentSettings } = await supabase
      .from("advisor_settings")
      .select("contact_avatar_url")
      .eq("advisor_id", advisorContext.advisorId)
      .maybeSingle();

    const previousUrl = (currentSettings as { contact_avatar_url?: string | null } | null)
      ?.contact_avatar_url;

    const { error: upsertError } = await supabase.from("advisor_settings").upsert(
      {
        advisor_id: advisorContext.advisorId,
        contact_avatar_url: publicUrl,
      },
      { onConflict: "advisor_id" },
    );
    if (upsertError) throw upsertError;

    const previousPath = extractStoragePathFromUrl(previousUrl, ADVISOR_IMAGE_BUCKET);
    if (previousPath) {
      await supabase.storage.from(ADVISOR_IMAGE_BUCKET).remove([previousPath]);
    }
  } catch (error) {
    redirectWithQuery({ error: toErrorMessage(error) });
  }

  revalidateAdvisorSettingsArea();
  redirectWithQuery({ avatar_saved: "1" });
}

async function uploadAdvisorWelcomeVideoAction(formData: FormData) {
  "use server";

  const { supabase, advisorContext } = await getCurrentAuthContext();
  await ensureWelcomeVideoColumnsExist(supabase, advisorContext.advisorId);
  const videoFile = formData.get("welcome_video_file");
  let uploadedVideoUrl: string | null = null;

  if (!(videoFile instanceof File) || videoFile.size === 0) {
    redirectWithQuery({ error: "Bitte eine Videodatei auswählen." });
  }

  const file = videoFile;
  if (!file.type.startsWith("video/")) {
    redirectWithQuery({ error: "Nur Videodateien sind erlaubt." });
  }
  if (file.size > MAX_VIDEO_BYTES) {
    redirectWithQuery({ error: "Video zu groß (maximal 50 MB)." });
  }

  try {
    const extension = getFileExtension(file.name);
    const filePath = `${advisorContext.advisorId}/welcome-video-${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(ADVISOR_VIDEO_BUCKET)
      .upload(filePath, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from(ADVISOR_VIDEO_BUCKET).getPublicUrl(filePath);
    uploadedVideoUrl = publicUrl;

    const { data: currentSettings } = await supabase
      .from("advisor_settings")
      .select("welcome_video_url")
      .eq("advisor_id", advisorContext.advisorId)
      .maybeSingle();

    const previousUrl = (currentSettings as { welcome_video_url?: string | null } | null)
      ?.welcome_video_url;

    const { error: upsertError } = await supabase.from("advisor_settings").upsert(
      {
        advisor_id: advisorContext.advisorId,
        welcome_video_url: publicUrl,
      },
      { onConflict: "advisor_id" },
    );
    if (upsertError) throw upsertError;

    const previousPath = extractStoragePathFromUrl(previousUrl, ADVISOR_VIDEO_BUCKET);
    if (previousPath) {
      await supabase.storage.from(ADVISOR_VIDEO_BUCKET).remove([previousPath]);
    }
  } catch (error) {
    redirectWithQuery({ error: toErrorMessage(error) });
  }

  revalidateAdvisorSettingsArea();
  redirectWithQuery({
    video_saved: "1",
    ...(uploadedVideoUrl ? { video_url: uploadedVideoUrl } : {}),
  });
}

async function removeAdvisorWelcomeVideoAction() {
  "use server";

  const { supabase, advisorContext } = await getCurrentAuthContext();
  await ensureWelcomeVideoColumnsExist(supabase, advisorContext.advisorId);

  try {
    const { data: currentSettings } = await supabase
      .from("advisor_settings")
      .select("welcome_video_url")
      .eq("advisor_id", advisorContext.advisorId)
      .maybeSingle();

    const previousUrl = (currentSettings as { welcome_video_url?: string | null } | null)
      ?.welcome_video_url;

    const { error: updateError } = await supabase
      .from("advisor_settings")
      .upsert(
        {
          advisor_id: advisorContext.advisorId,
          welcome_video_url: null,
          show_welcome_video_on_referral_page: false,
        },
        { onConflict: "advisor_id" },
      );
    if (updateError) throw updateError;

    const previousPath = extractStoragePathFromUrl(previousUrl, ADVISOR_VIDEO_BUCKET);
    if (previousPath) {
      await supabase.storage.from(ADVISOR_VIDEO_BUCKET).remove([previousPath]);
    }
  } catch (error) {
    redirectWithQuery({ error: toErrorMessage(error) });
  }

  revalidateAdvisorSettingsArea();
  redirectWithQuery({ video_removed: "1" });
}

export default async function AdvisorSettingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { supabase, advisorContext } = await getCurrentAuthContext();

  let pointsPerSuccessfulReferral = 100;
  let autoAwardPointsOnClose = true;
  let levelBronzePoints = 100;
  let levelSilverPoints = 200;
  let levelGoldPoints = 500;
  let levelPlatinumPoints = 1000;
  let contactName = "";
  let contactPhone = "";
  let contactEmail = "";
  let contactAvatarUrl = "";
  let welcomeText = "";
  let welcomeVideoUrl = "";
  let showWelcomeVideo = false;
  let referralPreviewPath: string | null = null;

  const { data: settingsRow, error: settingsError } = await supabase
    .from("advisor_settings")
    .select(
      "points_per_successful_referral, auto_award_points_on_referral_close, level_bronze_points, level_silver_points, level_gold_points, level_platinum_points, contact_name, contact_phone, contact_email, contact_avatar_url, welcome_text, welcome_video_url, show_welcome_video_on_referral_page",
    )
    .eq("advisor_id", advisorContext.advisorId)
    .maybeSingle();

  if (settingsError) {
    const code = (settingsError as { code?: string }).code;
    if (code !== "PGRST204") {
      redirectWithQuery({ error: toErrorMessage(settingsError) });
    }
  } else {
    const row = settingsRow as {
      points_per_successful_referral?: number | null;
      auto_award_points_on_referral_close?: boolean | null;
      level_bronze_points?: number | null;
      level_silver_points?: number | null;
      level_gold_points?: number | null;
      level_platinum_points?: number | null;
      contact_name?: string | null;
      contact_phone?: string | null;
      contact_email?: string | null;
      contact_avatar_url?: string | null;
      welcome_text?: string | null;
      welcome_video_url?: string | null;
      show_welcome_video_on_referral_page?: boolean | null;
    } | null;

    pointsPerSuccessfulReferral = row?.points_per_successful_referral ?? 100;
    autoAwardPointsOnClose = row?.auto_award_points_on_referral_close ?? true;
    levelBronzePoints = row?.level_bronze_points ?? 100;
    levelSilverPoints = row?.level_silver_points ?? 200;
    levelGoldPoints = row?.level_gold_points ?? 500;
    levelPlatinumPoints = row?.level_platinum_points ?? 1000;
    contactName = row?.contact_name ?? "";
    contactPhone = row?.contact_phone ?? "";
    contactEmail = row?.contact_email ?? "";
    contactAvatarUrl = row?.contact_avatar_url ?? "";
    welcomeText = row?.welcome_text ?? "";
    welcomeVideoUrl = row?.welcome_video_url ?? "";
    showWelcomeVideo = Boolean(row?.show_welcome_video_on_referral_page);
  }

  const { data: previewReferrer } = await supabase
    .from("referrers")
    .select("referral_slug, referral_code, invite_code")
    .eq("advisor_id", advisorContext.advisorId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const previewReferrerRow = previewReferrer as {
    referral_slug?: string | null;
    referral_code?: string | null;
    invite_code?: string | null;
  } | null;
  const previewCode =
    previewReferrerRow?.referral_slug ??
    previewReferrerRow?.referral_code ??
    previewReferrerRow?.invite_code ??
    null;
  if (previewCode) {
    referralPreviewPath = `/ref/${previewCode}`;
  }

  const inputClass =
    "h-9 rounded-xl border border-violet-300/55 bg-white px-3 py-1.5 text-sm text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-all duration-300 hover:border-violet-400/70 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200/80";
  const panelClass =
    "rounded-2xl border border-violet-200/65 bg-white/86 p-3 md:p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.94)]";
  const primaryButtonClass =
    "mt-1 inline-flex w-fit items-center rounded-xl border border-violet-300/50 bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-violet-500";

  const previewName = contactName || advisorContext.advisorName || "Berater";
  const previewPhone = contactPhone || "Telefon auf Anfrage";
  const previewEmail = contactEmail || "E-Mail auf Anfrage";
  const uploadedVideoUrlFromParams = params.video_url ?? "";
  const effectiveWelcomeVideoUrl = welcomeVideoUrl || uploadedVideoUrlFromParams;

  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-3 p-4 md:gap-4 md:p-6">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_35%,rgba(170,130,255,0.16),transparent_52%),radial-gradient(circle_at_15%_0%,rgba(126,87,255,0.26),transparent_42%),radial-gradient(circle_at_85%_8%,rgba(159,124,255,0.2),transparent_40%),linear-gradient(180deg,#1b1230_0%,#140d26_100%)]" />
      <div className="hex-honeycomb-bg pointer-events-none fixed inset-0 z-0 opacity-24" />

      <AdvisorAreaHeader active="einstellungen" />

      <section className="relative z-10 overflow-hidden rounded-3xl border border-violet-200/55 bg-violet-50/88 p-4 shadow-[0_24px_60px_rgba(5,3,12,0.38)] backdrop-blur-xl md:p-5">
        <span className="inline-flex items-center gap-2 rounded-full border border-violet-300/45 bg-violet-200/45 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-violet-800">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-300/35 text-violet-800">
            <SparklesIcon className="h-3.5 w-3.5" />
          </span>
          Einstellungen
        </span>
        <h1 className="mt-2 text-xl font-semibold text-zinc-900 md:text-2xl">
          Systemeinstellungen für Ihr Empfehlungsprogramm
        </h1>
        <p className="mt-1 text-sm text-zinc-700">
          Verwalten Sie Level-Schwellen, Punktevergabe und die persönliche Darstellung Ihrer Neukontakt-Linkseite.
        </p>
        <Link
          href="/berater/dashboard"
          className="mt-3 inline-flex items-center rounded-xl border border-violet-300/60 bg-white/85 px-3 py-1.5 text-sm font-semibold text-violet-800 transition-all duration-300 hover:-translate-y-0.5 hover:bg-violet-100"
        >
          Zurück zum Dashboard
        </Link>
      </section>

      {params.settings_saved === "1" ? (
        <p className="rounded-xl border border-emerald-300/70 bg-emerald-50/95 px-3 py-2 text-sm text-emerald-800">
          Gamification-Einstellungen gespeichert.
        </p>
      ) : null}
      {params.contact_saved === "1" ? (
        <p className="rounded-xl border border-emerald-300/70 bg-emerald-50/95 px-3 py-2 text-sm text-emerald-800">
          Beraterdarstellung für den Empfehler-Bereich gespeichert.
        </p>
      ) : null}
      {params.avatar_saved === "1" ? (
        <p className="rounded-xl border border-emerald-300/70 bg-emerald-50/95 px-3 py-2 text-sm text-emerald-800">
          Businessbild erfolgreich hochgeladen und gespeichert.
        </p>
      ) : null}
      {params.presentation_saved === "1" ? (
        <p className="rounded-xl border border-emerald-300/70 bg-emerald-50/95 px-3 py-2 text-sm text-emerald-800">
          Begrüßungstext und Video-Anzeige gespeichert.
        </p>
      ) : null}
      {params.video_saved === "1" ? (
        <p className="rounded-xl border border-emerald-300/70 bg-emerald-50/95 px-3 py-2 text-sm text-emerald-800">
          Begrüßungsvideo erfolgreich hochgeladen.
        </p>
      ) : null}
      {params.video_removed === "1" ? (
        <p className="rounded-xl border border-emerald-300/70 bg-emerald-50/95 px-3 py-2 text-sm text-emerald-800">
          Begrüßungsvideo entfernt.
        </p>
      ) : null}
      {params.error ? (
        <p className="rounded-xl border border-rose-300/70 bg-rose-50/95 px-3 py-2 text-sm text-rose-700">
          {decodeURIComponent(params.error)}
        </p>
      ) : null}

      <section className="relative z-10">
        <article className={panelClass}>
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-zinc-900">
            <UsersIcon className="h-4 w-4 text-violet-700" />
            Einstellungen Neukontakt-Linkseite
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Systematische Konfiguration in einem Panel: Profil, Levelregeln, Begrüßung und Video.
          </p>

          <div className="mt-4 grid gap-4">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
              <section className="rounded-2xl border border-violet-200/70 bg-violet-50/65 p-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-violet-700">Beraterprofil & Bild</h3>
                <form action={saveAdvisorContactSettingsAction} className="mt-2.5 grid gap-2">
                  <label className="grid gap-1 text-sm text-zinc-700">
                    Anzeigename
                    <input name="contact_name" defaultValue={contactName} placeholder="z. B. Max Mustermann" className={inputClass} />
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="grid gap-1 text-sm text-zinc-700">
                      Telefonnummer
                      <input name="contact_phone" defaultValue={contactPhone} placeholder="z. B. +49 151 12345678" className={inputClass} />
                    </label>
                    <label className="grid gap-1 text-sm text-zinc-700">
                      E-Mail-Adresse
                      <input type="email" name="contact_email" defaultValue={contactEmail} placeholder="z. B. beratung@tarvo.de" className={inputClass} />
                    </label>
                  </div>
                  <button type="submit" className={primaryButtonClass}>Beraterprofil speichern</button>
                </form>

                <div className="mt-3 rounded-xl border border-violet-200/70 bg-white/80 p-2.5">
                  <AdvisorBusinessImageUploader
                    action={uploadAdvisorContactImageAction}
                    currentImageUrl={contactAvatarUrl || null}
                    previewName={previewName}
                    compact
                  />
                </div>
              </section>

              <div className="grid gap-4 self-start">
                <section className="rounded-2xl border border-violet-200/70 bg-violet-50/65 p-2.5">
                  <h3 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-violet-700">
                    <TrophyIcon className="h-4 w-4 text-violet-700" />
                    Level & Punktevergabe
                  </h3>
                  <form action={saveGamificationSettingsAction} className="mt-2 grid gap-1.5">
                    <label className="grid gap-1 text-sm text-zinc-700">
                      Punktevergabe bei Abschluss
                      <select
                        name="auto_award_points_on_referral_close"
                        defaultValue={autoAwardPointsOnClose ? "1" : "0"}
                        className={inputClass}
                      >
                        <option value="1">Automatisch</option>
                        <option value="0">Manuell</option>
                      </select>
                    </label>

                    <label className="grid gap-1 text-sm text-zinc-700">
                      Punkte pro erfolgreichem Abschluss
                      <input
                        type="number"
                        min={1}
                        name="points_per_successful_referral"
                        defaultValue={pointsPerSuccessfulReferral}
                        className={inputClass}
                      />
                    </label>

                    <div className="grid gap-1.5 sm:grid-cols-2">
                      <label className="grid gap-1 text-sm text-zinc-700">
                        Bronze ab
                        <input type="number" min={1} name="level_bronze_points" defaultValue={levelBronzePoints} className={inputClass} />
                      </label>
                      <label className="grid gap-1 text-sm text-zinc-700">
                        Silber ab
                        <input type="number" min={2} name="level_silver_points" defaultValue={levelSilverPoints} className={inputClass} />
                      </label>
                      <label className="grid gap-1 text-sm text-zinc-700">
                        Gold ab
                        <input type="number" min={3} name="level_gold_points" defaultValue={levelGoldPoints} className={inputClass} />
                      </label>
                      <label className="grid gap-1 text-sm text-zinc-700">
                        Platin ab
                        <input type="number" min={4} name="level_platinum_points" defaultValue={levelPlatinumPoints} className={inputClass} />
                      </label>
                    </div>

                    <button type="submit" className={primaryButtonClass}>Level-Einstellungen speichern</button>
                  </form>
                </section>

                <section className="rounded-2xl border border-violet-200/70 bg-violet-50/65 p-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-violet-700">Vorschau-Link</h3>
                  <p className="mt-1 text-sm text-zinc-600">
                    Öffnen Sie die Neukontakt-Linkseite in einem separaten Fenster aus Kundensicht.
                  </p>
                  <div className="mt-4">
                    <PreviewDialogTrigger
                      previewPath={referralPreviewPath}
                      previewName={previewName}
                      previewPhone={previewPhone}
                      previewEmail={previewEmail}
                      contactAvatarUrl={contactAvatarUrl || null}
                      welcomeText={welcomeText}
                      showWelcomeVideo={showWelcomeVideo}
                      welcomeVideoUrl={effectiveWelcomeVideoUrl || null}
                    />
                  </div>
                </section>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <section className="rounded-2xl border border-violet-200/70 bg-violet-50/65 p-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-violet-700">Begrüßungstext & Video-Freigabe</h3>
                <form action={saveAdvisorPresentationSettingsAction} className="mt-2.5 grid gap-2">
                  <WelcomeTextField
                    name="welcome_text"
                    defaultValue={welcomeText}
                    maxLength={180}
                    rows={2}
                    label="Begrüßungstext"
                    placeholder="Hallo, ich freue mich auf Ihre Anfrage. Ich melde mich zeitnah persönlich bei Ihnen."
                  />

                  <label className="inline-flex items-start gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      name="show_welcome_video_on_referral_page"
                      value="1"
                      defaultChecked={showWelcomeVideo}
                      className="mt-1"
                    />
                    <span>
                      Begrüßungsvideo auf meiner Neukontakt-Linkseite anzeigen
                      {!effectiveWelcomeVideoUrl ? (
                        <span className="mt-0.5 block text-xs text-zinc-500">
                          Aktuell ist noch kein Video hinterlegt. Die Anzeige wird aktiv, sobald ein Video hochgeladen ist.
                        </span>
                      ) : null}
                    </span>
                  </label>

                  <button type="submit" className={primaryButtonClass}>Begrüßung speichern</button>
                </form>
              </section>

              <section className="rounded-2xl border border-violet-200/70 bg-violet-50/65 p-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-violet-700">Video hochladen</h3>
                <form action={uploadAdvisorWelcomeVideoAction} className="mt-2.5 grid gap-2">
                  <p className="rounded-lg border border-violet-200/70 bg-white/85 px-2.5 py-1.5 text-xs text-zinc-700">
                    Status: {effectiveWelcomeVideoUrl ? "Video vorhanden" : "Noch kein Video hochgeladen"}
                  </p>
                  {effectiveWelcomeVideoUrl ? (
                    <p className="break-all rounded-lg border border-violet-200/70 bg-white/85 px-2.5 py-1.5 text-[11px] text-zinc-600">
                      URL: {effectiveWelcomeVideoUrl}
                    </p>
                  ) : null}
                  <input
                    type="file"
                    name="welcome_video_file"
                    accept="video/*"
                    className="rounded-xl border border-violet-300/55 bg-white px-3 py-1.5 text-sm text-zinc-900 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-100 file:px-3 file:py-1 file:text-sm file:font-medium file:text-violet-800"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button type="submit" className="inline-flex w-fit items-center rounded-xl border border-violet-300/50 bg-white px-3 py-1.5 text-xs font-semibold text-violet-800 transition-all duration-300 hover:-translate-y-0.5 hover:bg-violet-100">Video hochladen</button>
                    {effectiveWelcomeVideoUrl ? (
                      <button
                        type="submit"
                        formAction={removeAdvisorWelcomeVideoAction}
                        className="inline-flex w-fit items-center rounded-xl border border-rose-300/60 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-rose-100"
                      >
                        Video entfernen
                      </button>
                    ) : null}
                  </div>
                </form>
              </section>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}


