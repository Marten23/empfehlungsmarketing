"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, AuthResult, CurrentUserResult } from "@/lib/auth/types";

function isValidEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value);
}

function parseCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  return { email, password };
}

export async function signup(formData: FormData): Promise<AuthResult> {
  const { email, password } = parseCredentials(formData);

  if (!isValidEmail(email)) {
    return { error: "Bitte eine gueltige E-Mail eingeben.", message: null };
  }

  if (password.length < 6) {
    return { error: "Passwort muss mindestens 6 Zeichen haben.", message: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message, message: null };
  }

  if (data.user) {
    // Keep profile bootstrap minimal and idempotent.
    await supabase.from("profiles").upsert({ user_id: data.user.id });
  }

  if (data.session) {
    redirect("/dashboard");
  }

  return {
    error: null,
    message:
      "Registrierung erfolgreich. Bitte bestaetige ggf. deine E-Mail und melde dich dann an.",
  };
}

export async function login(formData: FormData): Promise<AuthResult> {
  const { email, password } = parseCredentials(formData);

  if (!isValidEmail(email)) {
    return { error: "Bitte eine gueltige E-Mail eingeben.", message: null };
  }

  if (!password) {
    return { error: "Bitte ein Passwort eingeben.", message: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message, message: null };
  }

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

function normalizeRole(value: unknown): AppRole | null {
  if (value === "advisor" || value === "referrer") {
    return value;
  }
  return null;
}

export async function getCurrentUser(): Promise<CurrentUserResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, role: null };
  }

  // Use a broad select so the function still works even if `profiles.role`
  // has not yet been added in the DB.
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

