"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdvisorContext } from "@/lib/auth/advisor";
import {
  deleteAdvisorReward,
  upsertAdvisorReward,
  updateRewardRedemptionStatus,
} from "@/lib/queries/rewards";
import { normalizeSupabaseError } from "@/lib/supabase/errors";
import type { RedemptionStatus } from "@/lib/types/domain";

const REWARD_IMAGE_BUCKET = "reward-images";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const REWARD_IMAGE_PUBLIC_PATH = "/storage/v1/object/public/reward-images/";

function redirectCreateRewardError(
  reason: string,
  data: {
    title: string;
    description: string;
    motivationText: string;
    imageUrl: string;
    imageSourceNote: string;
    imageRightsConfirmed: boolean;
    imageFocusXRaw: string;
    imageFocusYRaw: string;
    externalUrl: string;
    pointsRaw: string;
    isActive: boolean;
  },
) {
  const params = new URLSearchParams();
  params.set("saved", "0");
  params.set("reason", reason);
  params.set("f_title", data.title);
  params.set("f_description", data.description);
  params.set("f_motivation_text", data.motivationText);
  params.set("f_image_url", data.imageUrl);
  params.set("f_image_source_note", data.imageSourceNote);
  params.set("f_image_rights_confirmed", data.imageRightsConfirmed ? "1" : "0");
  params.set("f_image_focus_x", data.imageFocusXRaw);
  params.set("f_image_focus_y", data.imageFocusYRaw);
  params.set("f_external_product_url", data.externalUrl);
  params.set("f_points_cost", data.pointsRaw);
  params.set("f_is_active", data.isActive ? "1" : "0");
  redirect(`/berater/praemien?${params.toString()}`);
}

function buildUploadRedirect(params: Record<string, string>): never {
  const query = new URLSearchParams(params);
  return redirect(`/berater/praemien?${query.toString()}`);
}

function getFileExtension(fileName: string): string {
  const parts = fileName.split(".");
  if (parts.length < 2) return "jpg";
  const extension = parts.pop()?.toLowerCase() ?? "jpg";
  return extension.replace(/[^a-z0-9]/g, "") || "jpg";
}

function extractRewardImagePathFromUrl(imageUrl: string | null | undefined) {
  if (!imageUrl) return null;

  try {
    const parsed = new URL(imageUrl);
    const idx = parsed.pathname.indexOf(REWARD_IMAGE_PUBLIC_PATH);
    if (idx === -1) return null;
    return decodeURIComponent(
      parsed.pathname.slice(idx + REWARD_IMAGE_PUBLIC_PATH.length),
    );
  } catch {
    const idx = imageUrl.indexOf(REWARD_IMAGE_PUBLIC_PATH);
    if (idx === -1) return null;
    return decodeURIComponent(imageUrl.slice(idx + REWARD_IMAGE_PUBLIC_PATH.length));
  }
}

async function removeRewardImageFromStorage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  imageUrl: string | null | undefined,
) {
  const oldPath = extractRewardImagePathFromUrl(imageUrl);
  if (!oldPath) return;
  await supabase.storage.from(REWARD_IMAGE_BUCKET).remove([oldPath]);
}

export async function uploadRewardImageAction(formData: FormData) {
  const advisorContext = await getCurrentAdvisorContext();
  if (!advisorContext) redirect("/berater/login");

  const rewardId = String(formData.get("reward_id") ?? "").trim();
  const imageRightsConfirmed =
    String(formData.get("image_rights_confirmed") ?? "").trim() === "1";
  const sourceNote = String(formData.get("image_source_note") ?? "").trim();
  const imageFocusXRaw = String(formData.get("image_focus_x") ?? "").trim();
  const imageFocusYRaw = String(formData.get("image_focus_y") ?? "").trim();
  const imageFile = formData.get("image_file");

  if (!(imageFile instanceof File) || imageFile.size === 0) {
    buildUploadRedirect({
      upload: "0",
      reason: "keine-datei-ausgewaehlt",
      ...(rewardId ? { reward_id: rewardId } : {}),
    });
  }
  const file = imageFile;

  if (!file.type.startsWith("image/")) {
    buildUploadRedirect({
      upload: "0",
      reason: "nur-bilddateien-erlaubt",
      ...(rewardId ? { reward_id: rewardId } : {}),
    });
  }

  if (file.size > MAX_IMAGE_BYTES) {
    buildUploadRedirect({
      upload: "0",
      reason: "datei-zu-gross-max-5mb",
      ...(rewardId ? { reward_id: rewardId } : {}),
    });
  }

  if (!imageRightsConfirmed) {
    buildUploadRedirect({
      upload: "0",
      reason: "bildrechte-bitte-bestaetigen",
      ...(rewardId ? { reward_id: rewardId } : {}),
    });
  }

  let nextParams: Record<string, string> | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const extension = getFileExtension(file.name);
    const filePath = `${advisorContext.advisorId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(REWARD_IMAGE_BUCKET)
      .upload(filePath, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from(REWARD_IMAGE_BUCKET).getPublicUrl(filePath);

    if (rewardId) {
      const { data: currentReward, error: currentRewardError } = await supabase
        .from("rewards")
        .select("id, image_url")
        .eq("id", rewardId)
        .eq("advisor_id", advisorContext.advisorId)
        .maybeSingle();

      if (currentRewardError) throw currentRewardError;

      const { error: updateError } = await supabase
        .from("rewards")
        .update({
          image_url: publicUrl,
          image_source_note: sourceNote || null,
          image_rights_confirmed: true,
          image_rights_confirmed_at: new Date().toISOString(),
          image_rights_confirmed_by_user_id: user?.id ?? null,
        })
        .eq("id", rewardId)
        .eq("advisor_id", advisorContext.advisorId);

      if (updateError) throw updateError;

      if (currentReward?.image_url && currentReward.image_url !== publicUrl) {
        await removeRewardImageFromStorage(supabase, currentReward.image_url as string);
      }

      revalidatePath("/berater/praemien");
      revalidatePath("/empfehler/praemien");
      revalidatePath("/empfehler/dashboard");
      nextParams = { upload: "1", reward_id: rewardId };
    } else {
      nextParams = {
        upload: "1",
        f_image_url: publicUrl,
        f_image_rights_confirmed: "1",
        f_image_source_note: sourceNote,
        f_image_focus_x: imageFocusXRaw || "50",
        f_image_focus_y: imageFocusYRaw || "50",
      };
    }
  } catch (error) {
    const message = normalizeSupabaseError(error).message;
    nextParams = {
      upload: "0",
      reason: message,
      ...(rewardId ? { reward_id: rewardId } : {}),
    };
  }

  buildUploadRedirect(nextParams ?? { upload: "0", reason: "unbekannter-fehler" });
}

export async function saveRewardAction(formData: FormData) {
  const advisorContext = await getCurrentAdvisorContext();
  if (!advisorContext) redirect("/berater/login");

  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const motivationText = String(formData.get("motivation_text") ?? "").trim();
  const imageUrl = String(formData.get("image_url") ?? "").trim();
  const imageSourceNote = String(formData.get("image_source_note") ?? "").trim();
  const imageRightsConfirmed =
    String(formData.get("image_rights_confirmed") ?? "").trim() === "1";
  const imageFocusXRaw = String(formData.get("image_focus_x") ?? "").trim();
  const imageFocusYRaw = String(formData.get("image_focus_y") ?? "").trim();
  const externalUrl = String(formData.get("external_product_url") ?? "").trim();
  const pointsRaw = String(formData.get("points_cost") ?? "").trim();
  const isActive = String(formData.get("is_active") ?? "").trim() === "1";

  const points = Number(pointsRaw);
  const imageFocusX = Number(imageFocusXRaw || "50");
  const imageFocusY = Number(imageFocusYRaw || "50");
  const safeImageFocusX = Number.isFinite(imageFocusX)
    ? Math.min(100, Math.max(0, imageFocusX))
    : 50;
  const safeImageFocusY = Number.isFinite(imageFocusY)
    ? Math.min(100, Math.max(0, imageFocusY))
    : 50;

  if (!title || !Number.isFinite(points) || points <= 0) {
    redirectCreateRewardError("ungueltige-eingaben", {
      title,
      description,
      motivationText,
      imageUrl,
      imageSourceNote,
      imageRightsConfirmed,
      imageFocusXRaw: String(safeImageFocusX),
      imageFocusYRaw: String(safeImageFocusY),
      externalUrl,
      pointsRaw,
      isActive,
    });
  }

  if (imageUrl && !imageRightsConfirmed) {
    redirectCreateRewardError("bildrechte-bitte-bestaetigen", {
      title,
      description,
      motivationText,
      imageUrl,
      imageSourceNote,
      imageRightsConfirmed,
      imageFocusXRaw: String(safeImageFocusX),
      imageFocusYRaw: String(safeImageFocusY),
      externalUrl,
      pointsRaw,
      isActive,
    });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    let previousImageUrl: string | null = null;
    if (id) {
      const { data: previousReward, error: previousRewardError } = await supabase
        .from("rewards")
        .select("id, image_url")
        .eq("id", id)
        .eq("advisor_id", advisorContext.advisorId)
        .maybeSingle();
      if (previousRewardError) throw previousRewardError;
      previousImageUrl = (previousReward?.image_url as string | null) ?? null;
    }

    await upsertAdvisorReward(supabase, {
      id: id || undefined,
      advisor_id: advisorContext.advisorId,
      title,
      description: description || null,
      motivation_text: motivationText || null,
      image_url: imageUrl || null,
      image_source_note: imageSourceNote || null,
      image_rights_confirmed: imageUrl ? imageRightsConfirmed : false,
      image_rights_confirmed_by_user_id:
        imageUrl && imageRightsConfirmed ? user?.id ?? null : null,
      image_focus_x: safeImageFocusX,
      image_focus_y: safeImageFocusY,
      external_product_url: externalUrl || null,
      points_cost: points,
      is_active: isActive,
    });

    if (
      previousImageUrl &&
      previousImageUrl !== (imageUrl || null) &&
      imageUrl !== previousImageUrl
    ) {
      await removeRewardImageFromStorage(supabase, previousImageUrl);
    }

    revalidatePath("/berater/praemien");
    revalidatePath("/empfehler/praemien");
    revalidatePath("/empfehler/dashboard");
  } catch (error) {
    const message = normalizeSupabaseError(error).message;
    redirectCreateRewardError(message, {
      title,
      description,
      motivationText,
      imageUrl,
      imageSourceNote,
      imageRightsConfirmed,
      imageFocusXRaw: String(safeImageFocusX),
      imageFocusYRaw: String(safeImageFocusY),
      externalUrl,
      pointsRaw,
      isActive,
    });
  }

  redirect("/berater/praemien?saved=1");
}

export async function removeRewardImageAction(formData: FormData) {
  const advisorContext = await getCurrentAdvisorContext();
  if (!advisorContext) redirect("/berater/login");

  const rewardId = String(formData.get("reward_id") ?? formData.get("id") ?? "").trim();
  if (!rewardId) {
    redirect("/berater/praemien?image_removed=0&reason=ungueltige-praemie");
  }

  try {
    const supabase = await createClient();
    const { data: reward, error: rewardError } = await supabase
      .from("rewards")
      .select("id, image_url")
      .eq("id", rewardId)
      .eq("advisor_id", advisorContext.advisorId)
      .maybeSingle();

    if (rewardError) throw rewardError;

    const { error: updateError } = await supabase
      .from("rewards")
      .update({
        image_url: null,
        image_source_note: null,
        image_rights_confirmed: false,
        image_rights_confirmed_at: null,
        image_rights_confirmed_by_user_id: null,
      })
      .eq("id", rewardId)
      .eq("advisor_id", advisorContext.advisorId);

    if (updateError) throw updateError;

    await removeRewardImageFromStorage(supabase, reward?.image_url as string | null);

    revalidatePath("/berater/praemien");
    revalidatePath("/empfehler/praemien");
    revalidatePath("/empfehler/dashboard");
  } catch (error) {
    const message = normalizeSupabaseError(error).message;
    redirect(
      `/berater/praemien?image_removed=0&reason=${encodeURIComponent(message)}`,
    );
  }

  redirect("/berater/praemien?image_removed=1");
}

export async function deleteRewardAction(formData: FormData) {
  const advisorContext = await getCurrentAdvisorContext();
  if (!advisorContext) redirect("/berater/login");

  const rewardId = String(
    formData.get("reward_id") ?? formData.get("id") ?? "",
  ).trim();
  if (!rewardId) {
    redirect("/berater/praemien?deleted=0&reason=ungueltige-praemie");
  }

  try {
    const supabase = await createClient();
    await deleteAdvisorReward(supabase, advisorContext.advisorId, rewardId);

    revalidatePath("/berater/praemien");
    revalidatePath("/empfehler/praemien");
    revalidatePath("/empfehler/dashboard");
  } catch (error) {
    const message = normalizeSupabaseError(error).message;
    redirect(`/berater/praemien?deleted=0&reason=${encodeURIComponent(message)}`);
  }

  redirect("/berater/praemien?deleted=1");
}

const redemptionStatuses: RedemptionStatus[] = [
  "offen",
  "bearbeitet",
  "abgeschlossen",
  "abgelehnt",
];

export async function updateRedemptionStatusAction(formData: FormData) {
  const advisorContext = await getCurrentAdvisorContext();
  if (!advisorContext) redirect("/berater/login");

  const redemptionId = String(formData.get("redemption_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() as RedemptionStatus;

  if (!redemptionId || !redemptionStatuses.includes(status)) {
    redirect("/berater/praemien?updated=0&reason=ungueltiger-status");
  }

  try {
    const supabase = await createClient();
    const updated = await updateRewardRedemptionStatus(supabase, redemptionId, status);

    if (updated.advisor_id !== advisorContext.advisorId) {
      redirect("/berater/praemien?updated=0&reason=tenant");
    }

    revalidatePath("/berater/praemien");
    revalidatePath("/berater/dashboard");
    revalidatePath("/empfehler/praemien");
    revalidatePath("/empfehler/dashboard");
  } catch (error) {
    const message = normalizeSupabaseError(error).message;
    redirect(`/berater/praemien?updated=0&reason=${encodeURIComponent(message)}`);
  }

  redirect("/berater/praemien?updated=1");
}

export async function createRewardSurveyAction(formData: FormData) {
  const advisorContext = await getCurrentAdvisorContext();
  if (!advisorContext) redirect("/berater/login");

  const title = String(formData.get("survey_title") ?? "").trim();
  const description = String(formData.get("survey_description") ?? "").trim();
  const surveyType = String(formData.get("survey_type") ?? "preset").trim();
  const budgetLimitRaw = String(formData.get("budget_limit_eur") ?? "").trim();
  const endsAtRaw = String(formData.get("survey_ends_at") ?? "").trim();
  const customOptions = [
    ...formData
      .getAll("survey_custom_options[]")
      .map((value) => String(value).trim())
      .filter(Boolean),
    ...String(formData.get("survey_custom_options") ?? "")
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean),
  ].slice(0, 16);
  const selectedRewardIds = formData
    .getAll("survey_reward_ids")
    .map((value) => String(value).trim())
    .filter(Boolean);

  const budgetLimit =
    budgetLimitRaw === "" ? null : Number.parseInt(budgetLimitRaw, 10);
  const endsAt = endsAtRaw ? new Date(endsAtRaw) : null;
  const isPreset = surveyType === "preset";
  const isOpenBudget = surveyType === "open_budget";

  if (!title || (!isPreset && !isOpenBudget)) {
    redirect("/berater/praemien?survey_saved=0&reason=ungueltige-eingaben");
  }
  if (isOpenBudget && (!budgetLimit || !Number.isFinite(budgetLimit) || budgetLimit <= 0)) {
    redirect("/berater/praemien?survey_saved=0&reason=ungueltiges-budgetlimit");
  }
  if (isPreset && selectedRewardIds.length === 0 && customOptions.length === 0) {
    redirect("/berater/praemien?survey_saved=0&reason=keine-optionen");
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: surveyRow, error: surveyError } = await supabase
      .from("reward_surveys")
      .insert({
        advisor_id: advisorContext.advisorId,
        title,
        description: description || null,
        survey_type: isPreset ? "preset" : "open_budget",
        budget_limit_eur: isOpenBudget ? budgetLimit : null,
        target_scope: "all_active_referrers",
        is_active: true,
        ends_at: endsAt ? endsAt.toISOString() : null,
        created_by_user_id: user?.id ?? null,
      })
      .select("id")
      .single();
    if (surveyError || !surveyRow?.id) throw surveyError ?? new Error("survey-create-failed");

    const surveyId = String(surveyRow.id);

    const optionRows: Array<{
      survey_id: string;
      advisor_id: string;
      reward_id: string | null;
      option_text: string;
      sort_order: number;
    }> = [];

    if (isPreset) {
      if (selectedRewardIds.length > 0) {
        const { data: rewardRows, error: rewardError } = await supabase
          .from("rewards")
          .select("id, title, name")
          .eq("advisor_id", advisorContext.advisorId)
          .in("id", selectedRewardIds);
        if (rewardError) throw rewardError;
        (rewardRows ?? []).forEach((row, index) => {
          const optionText = String((row as { title?: string; name?: string }).title ?? (row as { name?: string }).name ?? "").trim();
          if (!optionText) return;
          optionRows.push({
            survey_id: surveyId,
            advisor_id: advisorContext.advisorId,
            reward_id: String((row as { id: string }).id),
            option_text: optionText,
            sort_order: index * 10,
          });
        });
      }

      customOptions.forEach((option, index) => {
        optionRows.push({
          survey_id: surveyId,
          advisor_id: advisorContext.advisorId,
          reward_id: null,
          option_text: option,
          sort_order: 500 + index * 10,
        });
      });

      if (optionRows.length === 0) {
        throw new Error("keine-optionen");
      }

      const { error: optionsError } = await supabase
        .from("reward_survey_options")
        .insert(optionRows);
      if (optionsError) throw optionsError;
    }

    const { data: referrerRows, error: referrerError } = await supabase
      .from("referrers")
      .select("id")
      .eq("advisor_id", advisorContext.advisorId)
      .eq("is_active", true);
    if (referrerError) throw referrerError;

    const notifications = (referrerRows ?? []).map((row) => ({
      advisor_id: advisorContext.advisorId,
      referrer_id: String((row as { id: string }).id),
      notification_type: "reward_survey",
      title,
      message:
        description ||
        (isPreset
          ? "Neue Prämien-Umfrage: Wählen Sie Ihre bevorzugte Belohnung."
          : `Neue Wunschprämien-Umfrage mit Budgetlimit bis ${budgetLimit} €.`),
      reward_survey_id: surveyId,
      is_read: false,
    }));

    if (notifications.length > 0) {
      const { error: notificationError } = await supabase
        .from("referrer_notifications")
        .insert(notifications);
      if (notificationError) throw notificationError;
    }

    revalidatePath("/berater/praemien");
    revalidatePath("/empfehler/dashboard");
  } catch (error) {
    const message = normalizeSupabaseError(error).message;
    redirect(`/berater/praemien?survey_saved=0&reason=${encodeURIComponent(message)}`);
  }

  redirect("/berater/praemien?survey_saved=1");
}

export async function updateRewardSurveyAction(formData: FormData) {
  const advisorContext = await getCurrentAdvisorContext();
  if (!advisorContext) redirect("/berater/login");

  const surveyId = String(formData.get("survey_id") ?? "").trim();
  const title = String(formData.get("survey_title") ?? "").trim();
  const description = String(formData.get("survey_description") ?? "").trim();
  const budgetLimitRaw = String(formData.get("budget_limit_eur") ?? "").trim();
  const endsAtRaw = String(formData.get("survey_ends_at") ?? "").trim();
  const isActive = String(formData.get("is_active") ?? "1").trim() === "1";

  if (!surveyId || !title) {
    redirect("/berater/praemien?survey_saved=0&reason=ungueltige-umfrage");
  }

  const budgetLimit =
    budgetLimitRaw === "" ? null : Number.parseInt(budgetLimitRaw, 10);
  const endsAt = endsAtRaw ? new Date(endsAtRaw) : null;

  try {
    const supabase = await createClient();
    const { data: surveyRow, error: surveyError } = await supabase
      .from("reward_surveys")
      .select("id, survey_type")
      .eq("id", surveyId)
      .eq("advisor_id", advisorContext.advisorId)
      .maybeSingle();
    if (surveyError) throw surveyError;
    if (!surveyRow) throw new Error("umfrage-nicht-gefunden");

    const surveyType = String(
      (surveyRow as { survey_type?: string | null }).survey_type ?? "preset",
    );
    if (
      surveyType === "open_budget" &&
      (!budgetLimit || !Number.isFinite(budgetLimit) || budgetLimit <= 0)
    ) {
      redirect("/berater/praemien?survey_saved=0&reason=ungueltiges-budgetlimit");
    }

    const { error: updateError } = await supabase
      .from("reward_surveys")
      .update({
        title,
        description: description || null,
        budget_limit_eur: surveyType === "open_budget" ? budgetLimit : null,
        ends_at: endsAt ? endsAt.toISOString() : null,
        is_active: isActive,
      })
      .eq("id", surveyId)
      .eq("advisor_id", advisorContext.advisorId);
    if (updateError) throw updateError;

    revalidatePath("/berater/praemien");
    revalidatePath("/empfehler/dashboard");
    redirect("/berater/praemien?survey_saved=1");
  } catch (error) {
    const message = normalizeSupabaseError(error).message;
    redirect(`/berater/praemien?survey_saved=0&reason=${encodeURIComponent(message)}`);
  }
}

export async function deleteRewardSurveyAction(formData: FormData) {
  const advisorContext = await getCurrentAdvisorContext();
  if (!advisorContext) redirect("/berater/login");

  const surveyId = String(formData.get("survey_id") ?? "").trim();
  if (!surveyId) {
    redirect("/berater/praemien?survey_saved=0&reason=ungueltige-umfrage");
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("reward_surveys")
      .delete()
      .eq("id", surveyId)
      .eq("advisor_id", advisorContext.advisorId);
    if (error) throw error;

    revalidatePath("/berater/praemien");
    revalidatePath("/empfehler/dashboard");
    redirect("/berater/praemien?survey_saved=1");
  } catch (error) {
    const message = normalizeSupabaseError(error).message;
    redirect(`/berater/praemien?survey_saved=0&reason=${encodeURIComponent(message)}`);
  }
}

export async function setRewardSurveyActiveAction(formData: FormData) {
  const advisorContext = await getCurrentAdvisorContext();
  if (!advisorContext) redirect("/berater/login");

  const surveyId = String(formData.get("survey_id") ?? "").trim();
  const isActive = String(formData.get("is_active") ?? "").trim() === "1";
  if (!surveyId) {
    redirect("/berater/praemien?survey_saved=0&reason=ungueltige-umfrage");
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("reward_surveys")
      .update({ is_active: isActive })
      .eq("id", surveyId)
      .eq("advisor_id", advisorContext.advisorId);
    if (error) throw error;

    revalidatePath("/berater/praemien");
    revalidatePath("/empfehler/dashboard");
    redirect("/berater/praemien?survey_saved=1");
  } catch (error) {
    const message = normalizeSupabaseError(error).message;
    redirect(`/berater/praemien?survey_saved=0&reason=${encodeURIComponent(message)}`);
  }
}
