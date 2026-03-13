"use server";

import { createClient } from "@/lib/supabase/server";
import { submitPublicReferralRpc } from "@/lib/queries/public-referral";

export type PublicReferralFormState = {
  success: boolean;
  message: string | null;
  error: string | null;
};

export async function submitPublicReferral(
  code: string,
  _prevState: PublicReferralFormState,
  formData: FormData,
): Promise<PublicReferralFormState> {
  const contactName = String(formData.get("contact_name") ?? "").trim();
  const email = String(formData.get("contact_email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("contact_phone") ?? "").trim();
  const note = String(formData.get("contact_note") ?? "").trim();
  const privacyAccepted = String(formData.get("privacy_accepted") ?? "") === "yes";

  if (!contactName && !email && !phone) {
    return {
      success: false,
      message: null,
      error: "Bitte mindestens Name, E-Mail oder Telefonnummer angeben.",
    };
  }

  if (!privacyAccepted) {
    return {
      success: false,
      message: null,
      error: "Bitte die Datenschutzhinweise bestätigen.",
    };
  }

  const supabase = await createClient();

  try {
    await submitPublicReferralRpc(supabase, {
      code,
      contact_name: contactName || null,
      contact_email: email || null,
      contact_phone: phone || null,
      contact_note: note || null,
    });

    return {
      success: true,
      message: "Danke! Deine Anfrage wurde erfolgreich übermittelt.",
      error: null,
    };
  } catch (err) {
    const toText = (value: unknown) =>
      typeof value === "string" ? value : String(value);

    const errorObj =
      err && typeof err === "object"
        ? (err as {
            message?: unknown;
            code?: unknown;
            details?: unknown;
            hint?: unknown;
          })
        : null;

    const message =
      err instanceof Error
        ? err.message
        : errorObj?.message
          ? toText(errorObj.message)
          : "Unbekannter Fehler";
    const code = errorObj?.code ? toText(errorObj.code) : null;
    const details = errorObj?.details ? toText(errorObj.details) : null;
    const hint = errorObj?.hint ? toText(errorObj.hint) : null;

    console.error("submitPublicReferral failed:", {
      message,
      code,
      details,
      hint,
    });

    const isPermissionError =
      message.toLowerCase().includes("row-level security") ||
      message.toLowerCase().includes("permission") ||
      message.toLowerCase().includes("violates row-level security policy");

    const isConstraintError =
      message.toLowerCase().includes("null value") ||
      message.toLowerCase().includes("violates") ||
      message.toLowerCase().includes("foreign key") ||
      message.toLowerCase().includes("check constraint");

    return {
      success: false,
      message: null,
      error: isPermissionError
        ? "Speichern blockiert durch Datenbank-Rechte (RLS/Policy)."
        : isConstraintError
          ? `Speichern fehlgeschlagen wegen Datenbank-Constraint: ${message}${code ? ` (Code: ${code})` : ""}`
          : process.env.NODE_ENV === "development"
            ? `Speichern fehlgeschlagen: ${message}${code ? ` (Code: ${code})` : ""}${details ? ` | Details: ${details}` : ""}${hint ? ` | Hinweis: ${hint}` : ""}`
            : "Die Anfrage konnte nicht gespeichert werden. Bitte später erneut versuchen.",
    };
  }
}
