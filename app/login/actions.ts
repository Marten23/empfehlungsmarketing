"use server";

import { login } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { AuthResult } from "@/lib/auth/types";

export async function loginAction(
  _prevState: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  return login(formData);
}

function isValidEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value);
}

async function resolveAppBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (!host) {
    return "http://localhost:3000";
  }
  return `${proto}://${host}`;
}

export async function forgotPasswordAction(
  _prevState: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!isValidEmail(email)) {
    return { error: "Bitte eine gültige E-Mail eingeben.", message: null };
  }

  const supabase = await createClient();
  const appBaseUrl = await resolveAppBaseUrl();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appBaseUrl}/passwort-zuruecksetzen`,
  });

  if (error) {
    return {
      error:
        "Die E-Mail zum Zurücksetzen konnte nicht versendet werden. Bitte versuchen Sie es erneut.",
      message: null,
    };
  }

  return {
    error: null,
    message:
      "Wenn ein Konto mit dieser E-Mail existiert, wurde eine Nachricht zum Zurücksetzen versendet.",
  };
}
