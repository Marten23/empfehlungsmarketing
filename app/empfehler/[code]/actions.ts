"use server";

import { signup } from "@/lib/auth/auth";

export type PublicReferrerInviteFormState = {
  success: boolean;
  message: string | null;
  error: string | null;
};

export async function registerReferrerFromInvite(
  code: string,
  _prevState: PublicReferrerInviteFormState,
  formData: FormData,
): Promise<PublicReferrerInviteFormState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const passwordRepeat = String(formData.get("password_repeat") ?? "");
  const phone = String(formData.get("phone") ?? "").trim();
  const privacyAccepted = String(formData.get("privacy_accepted") ?? "") === "yes";

  if (!fullName) {
    return {
      success: false,
      message: null,
      error: "Bitte einen Namen angeben.",
    };
  }

  if (!email) {
    return {
      success: false,
      message: null,
      error: "Bitte eine E-Mail-Adresse angeben.",
    };
  }

  if (password.length < 6) {
    return {
      success: false,
      message: null,
      error: "Passwort muss mindestens 6 Zeichen haben.",
    };
  }

  if (password !== passwordRepeat) {
    return {
      success: false,
      message: null,
      error: "Passwörter stimmen nicht überein.",
    };
  }

  if (!phone) {
    return {
      success: false,
      message: null,
      error: "Bitte eine Telefonnummer angeben.",
    };
  }

  if (!privacyAccepted) {
    return {
      success: false,
      message: null,
      error: "Bitte die Datenschutzhinweise bestätigen.",
    };
  }

  const signupPayload = new FormData();
  signupPayload.set("email", email);
  signupPayload.set("password", password);
  signupPayload.set("password_repeat", passwordRepeat);
  signupPayload.set("full_name", fullName);
  signupPayload.set("phone", phone);
  signupPayload.set("invite_code", code);
  signupPayload.set("invite_type", "referrer");

  const result = await signup(signupPayload);

  return {
    success: !result.error,
    message: result.message,
    error: result.error,
  };
}
