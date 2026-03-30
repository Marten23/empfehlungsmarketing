import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  getBrevoNewContactTemplateId,
  isBrevoConfigured,
  sendBrevoTemplateEmail,
} from "@/lib/notifications/brevo";
import { enqueuePendingPushEvent } from "@/lib/notifications/push";

type NotifyAdvisorAboutNewContactInput = {
  referralId: string;
  advisorId?: string | null;
  sourceCode: string;
  referrerName?: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactNote: string | null;
  contactDays?: string[] | null;
  contactTimeFrom?: string | null;
  contactPreference?: "call" | "message" | null;
};

function sanitize(value: string | null | undefined) {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function notifyAdvisorAboutNewPublicContact(
  input: NotifyAdvisorAboutNewContactInput,
) {
  console.info("[ContactNotification] Trigger start", {
    referralId: input.referralId,
    advisorId: input.advisorId ?? null,
    sourceCode: input.sourceCode,
  });

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: referralRow } = await admin
    .from("referrals")
    .select(
      "id, advisor_id, referrer_id, contact_name, contact_email, contact_phone, contact_note, metadata",
    )
    .eq("id", input.referralId)
    .maybeSingle();

  const referral = referralRow as
    | {
        id: string;
        advisor_id?: string | null;
        referrer_id?: string | null;
        contact_name?: string | null;
        contact_email?: string | null;
        contact_phone?: string | null;
        contact_note?: string | null;
        metadata?: Record<string, unknown> | null;
      }
    | null;

  const existingMetadata =
    referral?.metadata ?? {};

  const resolvedAdvisorId = sanitize(input.advisorId) ?? sanitize(referral?.advisor_id);
  if (!resolvedAdvisorId) {
    console.warn("[ContactNotification] Skipped (missing advisor id)", {
      referralId: input.referralId,
    });
    const nextMetadata = {
      ...existingMetadata,
      advisor_email_notification_skipped_at: nowIso,
      advisor_email_notification_skip_reason: "missing_advisor_id",
    };
    await admin
      .from("referrals")
      .update({ metadata: nextMetadata })
      .eq("id", input.referralId);
    return { sent: false as const, reason: "missing_advisor_id" as const };
  }

  if (typeof existingMetadata.advisor_email_notified_at === "string") {
    console.info("[ContactNotification] Skipped (already notified)", {
      referralId: input.referralId,
    });
    return { sent: false as const, reason: "already_notified" as const };
  }

  const [{ data: advisorRow }, { data: settingsRow }] = await Promise.all([
    admin
      .from("advisors")
      .select("id, name, owner_user_id")
      .eq("id", resolvedAdvisorId)
      .maybeSingle(),
    admin
      .from("advisor_settings")
      .select("contact_email, contact_name")
      .eq("advisor_id", resolvedAdvisorId)
      .maybeSingle(),
  ]);

  const advisorName =
    sanitize((advisorRow as { name?: string | null } | null)?.name) ?? "Berater";
  const ownerUserId = sanitize(
    (advisorRow as { owner_user_id?: string | null } | null)?.owner_user_id,
  );
  const contactEmail = sanitize(
    (settingsRow as { contact_email?: string | null } | null)?.contact_email,
  );
  const contactName = sanitize(
    (settingsRow as { contact_name?: string | null } | null)?.contact_name,
  );

  let ownerEmail: string | null = null;
  if (ownerUserId) {
    const { data: ownerUserResult } = await admin.auth.admin.getUserById(ownerUserId);
    ownerEmail = sanitize(ownerUserResult.user?.email);
  }

  const recipientEmail = contactEmail ?? ownerEmail;
  if (!recipientEmail) {
    console.warn("[ContactNotification] Skipped (missing recipient)", {
      referralId: input.referralId,
      advisorId: resolvedAdvisorId,
    });
    const nextMetadata = {
      ...existingMetadata,
      advisor_email_notification_skipped_at: nowIso,
      advisor_email_notification_skip_reason: "missing_recipient_email",
    };
    await admin
      .from("referrals")
      .update({ metadata: nextMetadata })
      .eq("id", input.referralId);
    return { sent: false as const, reason: "missing_recipient" as const };
  }

  if (!isBrevoConfigured()) {
    console.warn("[ContactNotification] Skipped (Brevo not configured)", {
      referralId: input.referralId,
      advisorId: resolvedAdvisorId,
    });
    const nextMetadata = {
      ...existingMetadata,
      advisor_email_notification_skipped_at: nowIso,
      advisor_email_notification_skip_reason: "brevo_not_configured",
    };
    await admin
      .from("referrals")
      .update({ metadata: nextMetadata })
      .eq("id", input.referralId);
    return { sent: false as const, reason: "brevo_not_configured" as const };
  }

  const templateId = getBrevoNewContactTemplateId();
  if (!templateId) {
    console.warn("[ContactNotification] Skipped (template id missing)", {
      referralId: input.referralId,
      advisorId: resolvedAdvisorId,
    });
    const nextMetadata = {
      ...existingMetadata,
      advisor_email_notification_skipped_at: nowIso,
      advisor_email_notification_skip_reason: "brevo_template_id_missing",
    };
    await admin
      .from("referrals")
      .update({ metadata: nextMetadata })
      .eq("id", input.referralId);
    return { sent: false as const, reason: "brevo_template_id_missing" as const };
  }

  const safeContactName =
    sanitize(input.contactName) ?? sanitize(referral?.contact_name) ?? "Unbekannt";
  const safeContactEmail =
    sanitize(input.contactEmail) ?? sanitize(referral?.contact_email) ?? "-";
  const safeContactPhone =
    sanitize(input.contactPhone) ?? sanitize(referral?.contact_phone) ?? "-";
  const safeContactNote = sanitize(input.contactNote) ?? "-";

  let resolvedReferrerName = sanitize(input.referrerName);
  const resolvedReferrerId = sanitize(referral?.referrer_id);
  if (!resolvedReferrerName && resolvedReferrerId) {
    const { data: referrerRow } = await admin
      .from("referrers")
      .select("first_name, last_name")
      .eq("id", resolvedReferrerId)
      .maybeSingle();
    const firstName = sanitize(
      (referrerRow as { first_name?: string | null } | null)?.first_name,
    );
    const lastName = sanitize(
      (referrerRow as { last_name?: string | null } | null)?.last_name,
    );
    const joined = [firstName, lastName].filter(Boolean).join(" ").trim();
    resolvedReferrerName = joined || null;
  }
  const safeReferrerName = resolvedReferrerName ?? "Empfehler-Link";
  const safeContactDays = (input.contactDays ?? []).filter(Boolean);
  const safeContactTimeFrom = sanitize(input.contactTimeFrom) ?? "-";
  const preferenceLabel =
    input.contactPreference === "call"
      ? "Bitte anrufen"
      : input.contactPreference === "message"
        ? "Bitte Nachricht senden"
        : "-";
  const availabilityLabel =
    safeContactDays.length > 0
      ? `${safeContactDays.join(", ")}${safeContactTimeFrom !== "-" ? ` ab ${safeContactTimeFrom} Uhr` : ""}`
      : safeContactTimeFrom !== "-"
        ? `ab ${safeContactTimeFrom} Uhr`
        : "-";
  const dashboardLink =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    "https://rewaro.de/dashboard";
  const params = {
    name: safeContactName,
    phone: safeContactPhone,
    email: safeContactEmail,
    availability: availabilityLabel,
    contact_type: preferenceLabel,
    message: safeContactNote,
    referrer_name: safeReferrerName,
    dashboard_link: dashboardLink,
  };

  console.info("[ContactNotification] Sending mail", {
    referralId: input.referralId,
    recipientEmail,
    senderEmail: process.env.BREVO_SENDER_EMAIL?.trim() ?? null,
    templateId,
    params,
  });

  let sendResult: { messageId?: string } | null = null;
  try {
    sendResult = await sendBrevoTemplateEmail({
      to: { email: recipientEmail, name: contactName ?? advisorName },
      templateId,
      params,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[ContactNotification] Brevo send failed", {
      referralId: input.referralId,
      recipientEmail,
      senderEmail: process.env.BREVO_SENDER_EMAIL?.trim() ?? null,
      templateId,
      error: message,
    });
    const failedMetadata = {
      ...existingMetadata,
      advisor_email_notification_failed_at: nowIso,
      advisor_email_notification_failed_reason: message,
    };
    await admin
      .from("referrals")
      .update({ metadata: failedMetadata })
      .eq("id", input.referralId);
    return { sent: false as const, reason: "brevo_send_failed" as const };
  }

  const nextMetadata = {
    ...existingMetadata,
      advisor_email_notified_at: nowIso,
      advisor_email_message_id: sendResult?.messageId ?? null,
      advisor_email_template_params: params,
    };
  await admin
    .from("referrals")
    .update({ metadata: nextMetadata })
    .eq("id", input.referralId);

  console.info("[ContactNotification] Mail stored in metadata", {
    referralId: input.referralId,
    messageId: sendResult.messageId ?? null,
  });

  await enqueuePendingPushEvent({
    eventType: "new_public_contact",
    advisorId: resolvedAdvisorId,
    referralId: input.referralId,
    title: "Neuer Kontakt",
    body: `${safeContactName} hat eine neue Anfrage gesendet.`,
    createdAtIso: nowIso,
  });

  return { sent: true as const, recipientEmail };
}
