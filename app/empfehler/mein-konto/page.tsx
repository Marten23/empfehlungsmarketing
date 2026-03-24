import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import path from "node:path";
import { promises as fs } from "node:fs";
import { createClient } from "@/lib/supabase/server";
import { getCurrentReferrerContext } from "@/lib/auth/referrer";
import { normalizeSupabaseError } from "@/lib/supabase/errors";
import { ReferrerAreaHeader } from "@/app/empfehler/components/referrer-area-header";
import { DeleteAccountButton } from "@/app/components/delete-account-button";
import { SparklesIcon, UsersIcon } from "@/app/empfehler/dashboard/components/icons";
import { PresetAvatarPicker } from "@/app/empfehler/mein-konto/components/preset-avatar-picker";
import { getReferrerTheme, referrerThemeOptions } from "@/lib/ui/referrer-theme";

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
    theme_saved?: string;
    theme_error?: string;
  }>;
};

type PresetImageGroup = {
  key: string;
  label: string;
  images: string[];
};

const MAX_PRESET_IMAGES_PER_GROUP = 15;

function splitName(fullName: string) {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { firstName: "Empfehler", lastName: "-" };
  }
  const firstName = trimmed.split(/\s+/)[0] ?? "Empfehler";
  const rest = trimmed.slice(firstName.length).trim();
  return { firstName, lastName: rest || "-" };
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "E";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function toErrorMessage(error: unknown) {
  return encodeURIComponent(normalizeSupabaseError(error).message);
}

function redirectWithQuery(params: Record<string, string>): never {
  const query = new URLSearchParams(params);
  redirect(`/empfehler/mein-konto?${query.toString()}`);
}

function revalidateReferrerArea() {
  revalidatePath("/empfehler/dashboard");
  revalidatePath("/empfehler/punktekonto");
  revalidatePath("/empfehler/empfehlungen");
  revalidatePath("/empfehler/praemien");
  revalidatePath("/empfehler/mein-konto");
}

async function getCurrentAuthContext() {
  const supabase = await createClient();
  const referrerContext = await getCurrentReferrerContext(supabase);
  if (!referrerContext) {
    redirect("/empfehler/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/empfehler/login");
  }

  return { supabase, referrerContext, user };
}

async function updateReferrerProfileAction(formData: FormData) {
  "use server";

  const { supabase, referrerContext, user } = await getCurrentAuthContext();

  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!fullName) {
    redirectWithQuery({ error: "Bitte Name eingeben." });
  }

  const { firstName, lastName } = splitName(fullName);

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: user.id,
        full_name: fullName,
        phone: phone || null,
      },
      { onConflict: "user_id" },
    );

  if (profileError) {
    redirectWithQuery({ error: toErrorMessage(profileError) });
  }

  const { error: referrerError } = await supabase
    .from("referrers")
    .update({
      first_name: firstName,
      last_name: lastName,
      phone: phone || null,
    })
    .eq("id", referrerContext.referrerId);

  if (referrerError) {
    redirectWithQuery({ error: toErrorMessage(referrerError) });
  }

  revalidateReferrerArea();
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

  revalidateReferrerArea();
  redirectWithQuery({ avatar_saved: "1" });
}

async function updateReferrerEmailAction(formData: FormData) {
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

  revalidateReferrerArea();
  redirectWithQuery({ email_saved: "1" });
}

async function updateReferrerPasswordAction(formData: FormData) {
  "use server";

  const { supabase } = await getCurrentAuthContext();
  const password = String(formData.get("new_password") ?? "");
  const passwordRepeat = String(formData.get("new_password_repeat") ?? "");

  if (password.length < 6) {
    redirectWithQuery({ password_error: "Das Passwort muss mindestens 6 Zeichen haben." });
  }

  if (password !== passwordRepeat) {
    redirectWithQuery({ password_error: "Passwörter stimmen nicht Überein." });
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirectWithQuery({ password_error: toErrorMessage(error) });
  }

  redirectWithQuery({ password_saved: "1" });
}

async function updateReferrerThemeAction(formData: FormData) {
  "use server";

  const { supabase, user } = await getCurrentAuthContext();
  const selectedTheme = String(formData.get("referrer_theme") ?? "").trim();
  const nextTheme = selectedTheme === "midnight" ? "midnight" : "lila";

  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: user.id,
        referrer_theme: nextTheme,
      },
      { onConflict: "user_id" },
    );

  if (error) {
    redirectWithQuery({ theme_error: toErrorMessage(error) });
  }

  revalidateReferrerArea();
  redirectWithQuery({ theme_saved: "1" });
}

async function deleteReferrerAccountAction() {
  "use server";

  const { supabase } = await getCurrentAuthContext();
  const { error } = await supabase.rpc("delete_my_referrer_account");
  if (error) {
    redirectWithQuery({ error: toErrorMessage(error) });
  }

  await supabase.auth.signOut();
  redirect("/empfehler/login?deleted=1");
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

export default async function ReferrerAccountPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { supabase, referrerContext, user } = await getCurrentAuthContext();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, avatar_url")
    .eq("user_id", user.id)
    .maybeSingle();

  let referrerThemeValue: string | null = null;
  const { data: themeRow } = await supabase
    .from("profiles")
    .select("referrer_theme")
    .eq("user_id", user.id)
    .maybeSingle();
  referrerThemeValue =
    (themeRow as { referrer_theme?: string | null } | null)?.referrer_theme ?? null;

  const fullName =
    (profile as { full_name?: string | null } | null)?.full_name?.trim() ||
    `${referrerContext.firstName} ${referrerContext.lastName}`.trim();
  const phone = (profile as { phone?: string | null } | null)?.phone ?? "";
  const avatarUrl =
    (profile as { avatar_url?: string | null } | null)?.avatar_url ?? "";
  const currentTheme = getReferrerTheme(referrerThemeValue);

  const { data: advisorInfo } = await supabase
    .from("advisors")
    .select("name")
    .eq("id", referrerContext.advisorId)
    .maybeSingle();

  const presetImageGroups = await listPresetImagesByGroup();

  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 p-6">
      <div className={`pointer-events-none fixed inset-0 z-0 ${currentTheme.backgroundClass}`} />
      <div
        className={`${currentTheme.honeycombClass} ${currentTheme.honeycombOpacityClass} pointer-events-none fixed inset-0 z-0`}
      />

      <ReferrerAreaHeader active="mein-konto" />

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
              Name, E-Mail, Passwort und Profilbild für deinen Empfehler-Bereich.
            </p>
            <Link
              href="/empfehler/dashboard"
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
          E-Mail-Änderung angestoßen. Bitte bestätige den Link in deinem Postfach.
        </p>
      ) : null}
      {params.password_saved === "1" ? (
        <p className="rounded-xl border border-emerald-300/70 bg-emerald-50/95 px-3 py-2 text-sm text-emerald-800">
          Passwort erfolgreich geändert.
        </p>
      ) : null}
      {params.theme_saved === "1" ? (
        <p className="rounded-xl border border-emerald-300/70 bg-emerald-50/95 px-3 py-2 text-sm text-emerald-800">
          Design-Variante gespeichert.
        </p>
      ) : null}

      {[params.error, params.avatar_error, params.email_error, params.password_error, params.theme_error]
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
          Persönliche Daten & Kontoeinstellungen
        </h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-orange-200/70 bg-orange-50/70 px-3 py-2">
            <p className="text-xs text-zinc-500">Rolle</p>
            <p className="text-sm font-semibold text-zinc-900">Empfehler</p>
          </div>
          <div className="rounded-xl border border-orange-200/70 bg-orange-50/70 px-3 py-2">
            <p className="text-xs text-zinc-500">Betreut durch</p>
            <p className="text-sm font-semibold text-zinc-900">
              {(advisorInfo as { name?: string } | null)?.name ?? referrerContext.advisorName}
            </p>
          </div>
          <div className="rounded-xl border border-orange-200/70 bg-orange-50/70 px-3 py-2">
            <p className="text-xs text-zinc-500">Aktuelle E-Mail</p>
            <p className="truncate text-sm font-semibold text-zinc-900">{user.email ?? "-"}</p>
          </div>
        </div>

        <div className="mt-5 grid items-start gap-4 lg:grid-cols-[1.08fr_1fr]">
          <div className="space-y-4">
            <form action={updateReferrerProfileAction} className="grid gap-2 rounded-xl border border-orange-200/70 bg-orange-50/70 p-3">
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

            <form action={updateReferrerThemeAction} className="grid gap-2 rounded-xl border border-orange-200/70 bg-orange-50/70 p-3">
              <p className="text-sm font-semibold text-zinc-900">Design-Variante</p>
              <label className="grid gap-1 text-sm text-zinc-700">
                Variante auswählen
                <select
                  name="referrer_theme"
                  defaultValue={currentTheme.key}
                  className="rounded-xl border border-orange-300/55 bg-white px-3 py-2 text-sm text-zinc-900"
                >
                  {referrerThemeOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="w-fit rounded-xl border border-orange-300/50 bg-white px-3 py-1.5 text-sm font-semibold text-orange-800 transition-all hover:-translate-y-0.5 hover:bg-orange-100"
              >
                Design speichern
              </button>
            </form>
          </div>

          <div className="space-y-4">
            <form action={updateReferrerEmailAction} className="grid gap-2 rounded-xl border border-orange-200/70 bg-orange-50/70 p-3">
              <p className="text-sm font-semibold text-zinc-900">E-Mail Ändern</p>
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
                E-Mail Ändern
              </button>
            </form>

            <form action={updateReferrerPasswordAction} className="grid gap-2 rounded-xl border border-orange-200/70 bg-orange-50/70 p-3">
              <p className="text-sm font-semibold text-zinc-900">Passwort Ändern</p>
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
                Passwort Ändern
              </button>
            </form>

            <div className="rounded-xl border border-rose-200/70 bg-rose-50/55 p-3">
              <p className="text-sm font-semibold text-rose-800">Gefahrenbereich</p>
              <p className="mt-1 text-xs text-rose-700">
                Löscht dein Empfehler-Konto und alle zugehörigen Daten unwiderruflich.
              </p>
              <div className="mt-2">
                <DeleteAccountButton
                  action={deleteReferrerAccountAction}
                  title="Empfehler-Konto endgültig löschen?"
                  description="Dein Konto und alle zugehörigen Daten werden dauerhaft entfernt. Diese Aktion kann nicht rückgängig gemacht werden."
                />
              </div>
            </div>

          </div>
        </div>
      </section>
    </main>
  );
}



