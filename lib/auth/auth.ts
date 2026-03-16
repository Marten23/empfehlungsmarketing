"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, AuthResult, CurrentUserResult } from "@/lib/auth/types";
import { ensureAdvisorOnboardingForUser } from "@/lib/auth/onboarding";
import { ensureReferrerOnboardingForUser } from "@/lib/auth/referrer";

function isValidEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value);
}

function parseCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const passwordRepeat = String(formData.get("password_repeat") ?? "");
  const inviteCode = String(formData.get("invite_code") ?? "").trim();
  const inviteType = String(formData.get("invite_type") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  return {
    email,
    password,
    passwordRepeat,
    inviteCode: inviteCode.length > 0 ? inviteCode : null,
    inviteType: inviteType.length > 0 ? inviteType : null,
    fullName: fullName.length > 0 ? fullName : null,
    phone: phone.length > 0 ? phone : null,
  };
}

function normalizeRole(value: unknown): AppRole | null {
  if (value === "advisor" || value === "referrer") {
    return value;
  }
  return null;
}

async function getProfileRole() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  return normalizeRole((profile as { role?: unknown } | null)?.role);
}

export async function signup(formData: FormData): Promise<AuthResult> {
  const {
    email,
    password,
    passwordRepeat,
    inviteCode,
    inviteType,
    fullName,
    phone,
  } =
    parseCredentials(formData);

  if (!isValidEmail(email)) {
    return { error: "Bitte eine gültige E-Mail eingeben.", message: null };
  }

  if (password.length < 6) {
    return { error: "Passwort muss mindestens 6 Zeichen haben.", message: null };
  }

  if (password !== passwordRepeat) {
    return { error: "Passwörter stimmen nicht überein.", message: null };
  }

  if (!fullName) {
    return { error: "Bitte einen Namen angeben.", message: null };
  }

  if (!phone) {
    return { error: "Bitte eine Telefonnummer angeben.", message: null };
  }

  if (inviteType === "referrer" && !inviteCode) {
    return {
      error: "Empfehler-Einladungslink unvollständig (Code fehlt).",
      message: null,
    };
  }

  const supabase = await createClient();
  const metadata: Record<string, string> = {};

  if (inviteType === "advisor" && inviteCode) {
    metadata.pending_advisor_invite = inviteCode;
  }

  if (inviteType === "referrer" && inviteCode) {
    metadata.pending_referrer_invite = inviteCode;
  }

  if (fullName) metadata.full_name = fullName;
  if (phone) metadata.phone = phone;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: Object.keys(metadata).length > 0 ? metadata : undefined,
    },
  });

  if (error) {
    return { error: error.message, message: null };
  }

  if (inviteType === "referrer") {
    if (data.session && data.user) {
      await ensureReferrerOnboardingForUser(supabase, data.user, {
        inviteCodeFromInput: inviteCode,
        fullNameFromInput: fullName,
        phoneFromInput: phone,
      });
      await supabase.auth.signOut();
      redirect("/empfehler/login?registered=1");
    }

    redirect("/empfehler/login?registered=1&check_email=1");
  }

  if (data.session && data.user) {
    await ensureAdvisorOnboardingForUser(supabase, data.user, inviteCode);
    redirect("/berater/dashboard");
  }

  return {
    error: null,
    message:
      "Registrierung erfolgreich. Bitte bestätigen Sie ggf. Ihre E-Mail und melden Sie sich danach an.",
  };
}

export async function login(formData: FormData): Promise<AuthResult> {
  const { email, password } = parseCredentials(formData);

  if (!isValidEmail(email)) {
    return { error: "Bitte eine gültige E-Mail eingeben.", message: null };
  }

  if (!password) {
    return { error: "Bitte ein Passwort eingeben.", message: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message, message: null };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await ensureReferrerOnboardingForUser(supabase, user);
    const roleAfterReferrerOnboarding = await getProfileRole();

    if (roleAfterReferrerOnboarding === "referrer") {
      redirect("/empfehler/dashboard");
    }

    await ensureAdvisorOnboardingForUser(supabase, user);
  }

  redirect("/berater/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/berater/login");
}

export async function getCurrentUser(): Promise<CurrentUserResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, role: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const role = normalizeRole((profile as { role?: unknown } | null)?.role);

  return {
    user: {
      id: user.id,
      email: user.email ?? null,
    },
    role,
  };
}
