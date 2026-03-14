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
