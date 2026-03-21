"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentReferrerContext } from "@/lib/auth/referrer";
import { normalizeSupabaseError } from "@/lib/supabase/errors";

function redirectWithError(reason: string): never {
  redirect(`/empfehler/dashboard?survey_error=${encodeURIComponent(reason)}`);
}

export async function submitSurveyResponseAction(formData: FormData) {
  const supabase = await createClient();
  const referrerContext = await getCurrentReferrerContext(supabase);
  if (!referrerContext) redirect("/empfehler/login");

  const surveyId = String(formData.get("survey_id") ?? "").trim();
  const selectedOptionIds = formData
    .getAll("selected_option_ids")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const freeSuggestion = String(formData.get("free_suggestion") ?? "").trim();
  const responseNote = String(formData.get("response_note") ?? "").trim();
  const notificationId = String(formData.get("notification_id") ?? "").trim();

  if (!surveyId) redirectWithError("ungueltige-umfrage");

  try {
    const { data: survey, error: surveyError } = await supabase
      .from("reward_surveys")
      .select("id, advisor_id, survey_type, is_active")
      .eq("id", surveyId)
      .eq("advisor_id", referrerContext.advisorId)
      .maybeSingle();
    if (surveyError) throw surveyError;
    if (!survey || !survey.is_active) redirectWithError("umfrage-nicht-verfuegbar");

    if (survey.survey_type === "preset") {
      if (selectedOptionIds.length === 0) redirectWithError("bitte-option-auswaehlen");
      const { data: optionRows, error: optionError } = await supabase
        .from("reward_survey_options")
        .select("id")
        .eq("survey_id", surveyId)
        .eq("advisor_id", referrerContext.advisorId)
        .in("id", selectedOptionIds);
      if (optionError) throw optionError;
      if ((optionRows ?? []).length !== selectedOptionIds.length) {
        redirectWithError("ungueltige-option");
      }
    } else {
      if (!freeSuggestion) redirectWithError("bitte-vorschlag-eingeben");
    }

    const { data: upsertRows, error: upsertError } = await supabase
      .from("reward_survey_responses")
      .upsert(
        {
          survey_id: surveyId,
          advisor_id: referrerContext.advisorId,
          referrer_id: referrerContext.referrerId,
          selected_option_id:
            survey.survey_type === "preset" ? selectedOptionIds[0] ?? null : null,
          free_suggestion:
            survey.survey_type === "open_budget"
              ? freeSuggestion
              : responseNote || null,
        },
        { onConflict: "survey_id,referrer_id" },
      )
      .select("id")
      .single();
    if (upsertError) throw upsertError;
    const responseId = String((upsertRows as { id?: string } | null)?.id ?? "");
    if (!responseId) throw new Error("antwort-konnte-nicht-gespeichert-werden");

    if (survey.survey_type === "preset") {
      try {
        const { error: deleteOptionsError } = await supabase
          .from("reward_survey_response_options")
          .delete()
          .eq("response_id", responseId);
        if (deleteOptionsError) throw deleteOptionsError;

        if (selectedOptionIds.length > 0) {
          const { error: insertOptionsError } = await supabase
            .from("reward_survey_response_options")
            .insert(
              selectedOptionIds.map((optionId) => ({
                response_id: responseId,
                advisor_id: referrerContext.advisorId,
                referrer_id: referrerContext.referrerId,
                survey_id: surveyId,
                option_id: optionId,
              })),
            );
          if (insertOptionsError) throw insertOptionsError;
        }
      } catch {
        // Fallback for DBs where the optional multiselect table is not migrated yet.
      }
    }

    if (notificationId) {
      await supabase
        .from("referrer_notifications")
        .update({ is_read: true })
        .eq("id", notificationId)
        .eq("referrer_id", referrerContext.referrerId);
    }

    revalidatePath("/empfehler/dashboard");
  } catch (error) {
    redirectWithError(normalizeSupabaseError(error).message);
  }

  redirect("/empfehler/dashboard?survey_saved=1");
}

export async function markNotificationReadAction(formData: FormData) {
  const supabase = await createClient();
  const referrerContext = await getCurrentReferrerContext(supabase);
  if (!referrerContext) redirect("/empfehler/login");

  const notificationId = String(formData.get("notification_id") ?? "").trim();
  if (!notificationId) redirect("/empfehler/dashboard");

  await supabase
    .from("referrer_notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("referrer_id", referrerContext.referrerId);

  revalidatePath("/empfehler/dashboard");
  redirect("/empfehler/dashboard");
}

export async function deleteNotificationAction(formData: FormData) {
  const supabase = await createClient();
  const referrerContext = await getCurrentReferrerContext(supabase);
  if (!referrerContext) redirect("/empfehler/login");

  const notificationId = String(formData.get("notification_id") ?? "").trim();
  if (!notificationId) redirect("/empfehler/dashboard");

  const { error } = await supabase
    .from("referrer_notifications")
    .delete()
    .eq("id", notificationId)
    .eq("referrer_id", referrerContext.referrerId);

  if (error) {
    const fallback = await supabase
      .from("referrer_notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("referrer_id", referrerContext.referrerId);
    if (fallback.error) {
      redirect(`/empfehler/dashboard?survey_error=${encodeURIComponent(normalizeSupabaseError(fallback.error).message)}`);
    }
  }

  revalidatePath("/empfehler/dashboard");
  redirect("/empfehler/dashboard");
}
