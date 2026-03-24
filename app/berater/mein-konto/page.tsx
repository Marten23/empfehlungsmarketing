import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import path from "node:path";
import { promises as fs } from "node:fs";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdvisorContext } from "@/lib/auth/advisor";
import { normalizeSupabaseError } from "@/lib/supabase/errors";
import { AdvisorAreaHeader } from "@/app/berater/components/advisor-area-header";
import { DeleteAccountButton } from "@/app/components/delete-account-button";
import { SparklesIcon, UsersIcon } from "@/app/empfehler/dashboard/components/icons";
import { PresetAvatarPicker } from "@/app/empfehler/mein-konto/components/preset-avatar-picker";
import { requireAdvisorAppAccess } from "@/lib/auth/require-advisor-app-access";

type PageProps = {
  searchParams: Promise<{
    saved?: string;
    error?: string;
    email_saved?: string;
    email_error?: string;
    password_saved?: string;
    password_error?: string;
    avatar_saved?: string;
    avatar_error?: string;
  }>;
};

type PresetImageGroup = {
  key: string;
  label: string;
  images: string[];
};

const MAX_PRESET_IMAGES_PER_GROUP = 15;

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "B";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function toErrorMessage(error: unknown) {
  return encodeURIComponent(normalizeSupabaseError(error).message);
}

function redirectWithQuery(params: Record<string, string>): never {
  const query = new URLSearchParams(params);
  redirect(`/berater/mein-konto?${query.toString()}`);
}

function revalidateAdvisorArea() {
  revalidatePath("/berater/dashboard");
  revalidatePath("/berater/empfehlungen");
  revalidatePath("/berater/praemien");
  revalidatePath("/berater/dashboard/referrers");
  revalidatePath("/berater/dashboard/advisors");
  revalidatePath("/berater/mein-konto");
}

async function getCurrentAuthContext() {
  const supabase = await createClient();
  const advisorContext = await getCurrentAdvisorContext();
  if (!advisorContext) redirect("/berater/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/berater/login");

  return { supabase, advisorContext, user };
}

async function updateAdvisorProfileAction(formData: FormData) {
  "use server";

  const { supabase, user } = await getCurrentAuthContext();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!fullName) {
    redirectWithQuery({ error: "Bitte Name eingeben." });
  }

  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: user.id,
        full_name: fullName,
        phone: phone || null,
      },
      { onConflict: "user_id" },
    );

  if (error) {
    redirectWithQuery({ error: toErrorMessage(error) });
  }

  revalidateAdvisorArea();
  redirectWithQuery({ saved: "1" });
}

async function applyPresetAvatarAction(formData: FormData) {
  "use server";

  const { supabase, user } = await getCurrentAuthContext();

  const presetImage = String(formData.get("preset_avatar") ?? "").trim();
  if (!presetImage.startsWith("/images/")) {
    redirectWithQuery({ avatar_error: "Bitte ein Preset-Bild auswählen." });
  }

  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: user.id,
        avatar_url: presetImage,
      },
      { onConflict: "user_id" },
    );

  if (error) {
    redirectWithQuery({ avatar_error: toErrorMessage(error) });
  }

  revalidateAdvisorArea();
  redirectWithQuery({ avatar_saved: "1" });
}

async function updateAdvisorEmailAction(formData: FormData) {
  "use server";

  const { supabase } = await getCurrentAuthContext();
  const email = String(formData.get("new_email") ?? "").trim().toLowerCase();

  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    redirectWithQuery({ email_error: "Bitte eine gültige E-Mail eingeben." });
  }

  const { error } = await supabase.auth.updateUser({ email });
  if (error) {
    redirectWithQuery({ email_error: toErrorMessage(error) });
  }

  revalidateAdvisorArea();
  redirectWithQuery({ email_saved: "1" });
}

async function updateAdvisorPasswordAction(formData: FormData) {
  "use server";

  const { supabase } = await getCurrentAuthContext();
  const password = String(formData.get("new_password") ?? "");
  const passwordRepeat = String(formData.get("new_password_repeat") ?? "");

  if (password.length < 6) {
    redirectWithQuery({ password_error: "Das Passwort muss mindestens 6 Zeichen haben." });
  }
  if (password !== passwordRepeat) {
    redirectWithQuery({ password_error: "Passwörter stimmen nicht überein." });
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirectWithQuery({ password_error: toErrorMessage(error) });
  }

  redirectWithQuery({ password_saved: "1" });
}

async function deleteAdvisorAccountAction() {
  "use server";

  const { supabase } = await getCurrentAuthContext();
  const { error } = await supabase.rpc("delete_my_advisor_account");
  if (error) {
    redirectWithQuery({ error: toErrorMessage(error) });
  }

  await supabase.auth.signOut();
  redirect("/berater/login?deleted=1");
}

async function listPresetImagesByGroup(): Promise<PresetImageGroup[]> {
  try {
    const imagesDir = path.join(process.cwd(), "public", "images");
    const entries = await fs.readdir(imagesDir, { withFileTypes: true });

    const isImageFile = (name: string) => /\.(png|jpg|jpeg|webp|gif|avif)$/i.test(name);
    const toLabel = (value: string) => {
      if (!value) return "Allgemein";
      return value.charAt(0).toUpperCase() + value.slice(1);
    };

    const groups: PresetImageGroup[] = [];
    const rootImages = entries
      .filter((entry) => entry.isFile() && isImageFile(entry.name))
      .map((entry) => `/images/${entry.name}`)
      .slice(0, MAX_PRESET_IMAGES_PER_GROUP);

    if (rootImages.length > 0) {
      groups.push({ key: "allgemein", label: "Allgemein", images: rootImages });
    }

    const folderEntries = entries.filter((entry) => entry.isDirectory());
    for (const folder of folderEntries) {
      const folderPath = path.join(imagesDir, folder.name);
      const folderItems = await fs.readdir(folderPath, { withFileTypes: true });
      const folderImages = folderItems
        .filter((item) => item.isFile() && isImageFile(item.name))
        .map((item) => `/images/${folder.name}/${item.name}`)
        .slice(0, MAX_PRESET_IMAGES_PER_GROUP);

      if (folderImages.length > 0) {
        groups.push({
          key: folder.name.toLowerCase(),
          label: toLabel(folder.name),
          images: folderImages,
        });
      }
    }

    return groups;
  } catch {
    return [] as PresetImageGroup[];
  }
}

export default async function AdvisorAccountPage({ searchParams }: PageProps) {
  await requireAdvisorAppAccess();
  const params = await searchParams;
  const { supabase, advisorContext, user } = await getCurrentAuthContext();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, avatar_url")
    .eq("user_id", user.id)
    .maybeSingle();

  const fullName =
    (profile as { full_name?: string | null } | null)?.full_name?.trim() ||
    advisorContext.advisorName ||
    "Berater";
  const phone = (profile as { phone?: string | null } | null)?.phone ?? "";
  const avatarUrl = (profile as { avatar_url?: string | null } | null)?.avatar_url ?? "";
  const presetImageGroups = await listPresetImagesByGroup();

  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 p-6">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_8%_4%,rgba(255,157,66,0.2),transparent_38%),radial-gradient(circle_at_92%_8%,rgba(96,165,250,0.18),transparent_38%),radial-gradient(circle_at_50%_120%,rgba(139,92,246,0.09),transparent_48%),linear-gradient(180deg,#fcfcff_0%,#f6f8ff_45%,#edf2ff_100%)]" />
      <div className="hex-honeycomb-bg pointer-events-none fixed inset-0 z-0 opacity-[0.1] [mask-image:linear-gradient(180deg,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0.1)_36%,rgba(0,0,0,0.02)_100%)]" />

      <AdvisorAreaHeader active="mein-konto" />

      <section className="relative z-10 overflow-hidden rounded-3xl border border-zinc-200/85 bg-white/95 p-5 shadow-[0_20px_44px_rgba(15,23,42,0.1)] backdrop-blur-xl md:p-6">
        <div className="grid items-center gap-4 md:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-300/45 bg-orange-200/45 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-orange-800">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-300/35 text-orange-800">
                <UsersIcon className="h-3.5 w-3.5" />
              </span>
              Mein Konto
            </span>
            <h1 className="text-2xl font-semibold text-zinc-900 md:text-3xl">Kontoeinstellungen</h1>
            <p className="text-sm text-zinc-700 md:text-base">
              Profil, E-Mail, Passwort und Profilbild für Ihren Beraterbereich.
            </p>
            <Link
              href="/berater/dashboard"
              className="inline-flex items-center rounded-xl border border-orange-300/60 bg-white/85 px-3 py-1.5 text-sm font-semibold text-orange-800 transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-100"
            >
              Zurück zum Dashboard
            </Link>
          </div>

          <div className="flex justify-center md:justify-end">
            <PresetAvatarPicker
              groups={presetImageGroups}
              avatarUrl={avatarUrl}
              initials={getInitials(fullName)}
              action={applyPresetAvatarAction}
            />
          </div>
        </div>
      </section>

      {params.saved === "1" ? (
        <p className="rounded-xl border border-emerald-300/70 bg-emerald-50/95 px-3 py-2 text-sm text-emerald-800">
          Profil erfolgreich gespeichert.
        </p>
      ) : null}
      {params.avatar_saved === "1" ? (
        <p className="rounded-xl border border-emerald-300/70 bg-emerald-50/95 px-3 py-2 text-sm text-emerald-800">
          Profilbild erfolgreich aktualisiert.
        </p>
      ) : null}
      {params.email_saved === "1" ? (
        <p className="rounded-xl border border-emerald-300/70 bg-emerald-50/95 px-3 py-2 text-sm text-emerald-800">
          E-Mail-Änderung angestoßen. Bitte bestätigen Sie den Link in Ihrem Postfach.
        </p>
      ) : null}
      {params.password_saved === "1" ? (
        <p className="rounded-xl border border-emerald-300/70 bg-emerald-50/95 px-3 py-2 text-sm text-emerald-800">
          Passwort erfolgreich geändert.
        </p>
      ) : null}

      {[params.error, params.avatar_error, params.email_error, params.password_error]
        .filter(Boolean)
        .map((msg, index) => (
          <p
            key={`${msg}-${index}`}
            className="rounded-xl border border-rose-300/70 bg-rose-50/95 px-3 py-2 text-sm text-rose-700"
          >
            {decodeURIComponent(String(msg))}
          </p>
        ))}

      <section className="relative z-10 rounded-2xl border border-orange-200/55 bg-white/84 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] md:p-5">
        <h2 className="inline-flex items-center gap-2 text-base font-semibold text-zinc-900">
          <SparklesIcon className="h-4 w-4 text-orange-700" />
          Persönliche Daten
        </h2>

        <div className="mt-5 grid items-start gap-4 lg:grid-cols-2">
          <form action={updateAdvisorProfileAction} className="grid gap-2 rounded-xl border border-orange-200/70 bg-orange-50/70 p-3">
            <p className="text-sm font-semibold text-zinc-900">Profil bearbeiten</p>
            <label className="grid gap-1 text-sm text-zinc-700">
              Name
              <input
                name="full_name"
                defaultValue={fullName}
                required
                className="rounded-xl border border-orange-300/55 bg-white px-3 py-2 text-sm text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]"
              />
            </label>
            <label className="grid gap-1 text-sm text-zinc-700">
              Telefonnummer
              <input
                name="phone"
                defaultValue={phone}
                className="rounded-xl border border-orange-300/55 bg-white px-3 py-2 text-sm text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]"
              />
            </label>
            <button
              type="submit"
              className="mt-1 w-fit rounded-xl border border-orange-300/50 bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-500"
            >
              Name & Telefonnummer speichern
            </button>
          </form>

          <div className="space-y-4">
            <form action={updateAdvisorEmailAction} className="grid gap-2 rounded-xl border border-orange-200/70 bg-orange-50/70 p-3">
              <p className="text-sm font-semibold text-zinc-900">E-Mail ändern</p>
              <label className="grid gap-1 text-sm text-zinc-700">
                Neue E-Mail-Adresse
                <input
                  type="email"
                  name="new_email"
                  required
                  className="rounded-xl border border-orange-300/55 bg-white px-3 py-2 text-sm text-zinc-900"
                />
              </label>
              <button
                type="submit"
                className="w-fit rounded-xl border border-orange-300/50 bg-white px-3 py-1.5 text-sm font-semibold text-orange-800 transition-all hover:-translate-y-0.5 hover:bg-orange-100"
              >
                E-Mail ändern
              </button>
            </form>

            <form action={updateAdvisorPasswordAction} className="grid gap-2 rounded-xl border border-orange-200/70 bg-orange-50/70 p-3">
              <p className="text-sm font-semibold text-zinc-900">Passwort ändern</p>
              <label className="grid gap-1 text-sm text-zinc-700">
                Neues Passwort
                <input
                  type="password"
                  name="new_password"
                  minLength={6}
                  required
                  className="rounded-xl border border-orange-300/55 bg-white px-3 py-2 text-sm text-zinc-900"
                />
              </label>
              <label className="grid gap-1 text-sm text-zinc-700">
                Passwort wiederholen
                <input
                  type="password"
                  name="new_password_repeat"
                  minLength={6}
                  required
                  className="rounded-xl border border-orange-300/55 bg-white px-3 py-2 text-sm text-zinc-900"
                />
              </label>
              <button
                type="submit"
                className="w-fit rounded-xl border border-orange-300/50 bg-white px-3 py-1.5 text-sm font-semibold text-orange-800 transition-all hover:-translate-y-0.5 hover:bg-orange-100"
              >
                Passwort ändern
              </button>
            </form>

            <div className="rounded-xl border border-rose-200/70 bg-rose-50/55 p-3">
              <p className="text-sm font-semibold text-rose-800">Gefahrenbereich</p>
              <p className="mt-1 text-xs text-rose-700">
                Löscht Ihr Berater-Konto und alle zugehörigen Daten unwiderruflich.
              </p>
              <div className="mt-2">
                <DeleteAccountButton
                  action={deleteAdvisorAccountAction}
                  title="Berater-Konto endgültig löschen?"
                  description="Ihr Konto und alle zugehörigen Daten werden dauerhaft entfernt. Diese Aktion kann nicht rückgängig gemacht werden."
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

