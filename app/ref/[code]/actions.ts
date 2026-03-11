"use server";

import { createClient } from "@/lib/supabase/server";
import { createReferral } from "@/lib/queries/referrals";
import { findPublicReferrerByCodeOrSlug } from "@/lib/queries/referrers";

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

  if (!contactName && !email && !phone) {
    return {
      success: false,
      message: null,
      error: "Bitte mindestens Name, E-Mail oder Telefonnummer angeben.",
    };
  }

  const supabase = await createClient();

  try {
    const referrer = await findPublicReferrerByCodeOrSlug(supabase, code);

    if (!referrer || !referrer.advisor || !referrer.advisor.is_active) {
      return {
        success: false,
        message: null,
        error: "Der Empfehlungslink ist ungueltig oder nicht mehr aktiv.",
      };
    }

    await createReferral(supabase, {
      advisor_id: referrer.advisor_id,
      referrer_id: referrer.id,
      status: "neu",
      source_referral_code: code,
      contact_name: contactName || null,
      contact_email: email || null,
      contact_phone: phone || null,
      contact_note: note || null,
      message: note || null,
    });

    return {
      success: true,
      message: "Danke! Deine Anfrage wurde erfolgreich uebermittelt.",
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    console.error("submitPublicReferral failed:", message);

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
          ? `Speichern fehlgeschlagen wegen Datenbank-Constraint: ${message}`
          : process.env.NODE_ENV === "development"
            ? `Speichern fehlgeschlagen: ${message}`
            : "Die Anfrage konnte nicht gespeichert werden. Bitte spaeter erneut versuchen.",
    };
  }
}
