"use client";

import { useMemo, useState } from "react";
import { AdvisorBusinessImage } from "@/app/components/advisor-business-image";

type AdvisorBusinessImageUploaderProps = {
  action: (formData: FormData) => void | Promise<void>;
  currentImageUrl: string | null;
  previewName: string;
  compact?: boolean;
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MIN_WIDTH = 675;
const MIN_HEIGHT = 1200;

export function AdvisorBusinessImageUploader({
  action,
  currentImageUrl,
  previewName,
  compact = false,
}: AdvisorBusinessImageUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [canSubmit, setCanSubmit] = useState(false);

  const effectivePreviewUrl = useMemo(
    () => previewUrl || currentImageUrl || null,
    [previewUrl, currentImageUrl],
  );

  async function handleFileChange(file: File | null) {
    setError(null);
    setWarning(null);
    setCanSubmit(false);

    if (!file) {
      setPreviewUrl(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Bitte eine gültige Bilddatei auswählen.");
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setError("Datei zu groß (maximal 5 MB).");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    try {
      const dims = await new Promise<{ width: number; height: number }>(
        (resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
          };
          img.onerror = () => reject(new Error("Bild konnte nicht gelesen werden."));
          img.src = objectUrl;
        },
      );

      if (dims.width < MIN_WIDTH || dims.height < MIN_HEIGHT) {
        setError(`Bild ist zu klein. Mindestgröße: ${MIN_WIDTH} × ${MIN_HEIGHT} px.`);
        return;
      }

      const ratio = dims.width / dims.height;
      const targetRatio = 9 / 16;
      if (Math.abs(ratio - targetRatio) > 0.08) {
        setWarning(
          "Hinweis: Für die beste Darstellung empfehlen wir exakt 9:16 (z. B. 900 × 1600 px).",
        );
      }

      setCanSubmit(true);
    } catch {
      setError("Das Bild konnte nicht ausgewertet werden.");
    }
  }

  return (
    <form action={action} className="grid gap-2.5">
      <p className="text-sm font-semibold text-zinc-900">Businessbild hochladen</p>
      {compact ? (
        <p className="text-xs text-zinc-600">
          Empfohlen: 900 × 1600 px (9:16), mindestens 675 × 1200 px.
        </p>
      ) : (
        <p className="text-xs text-zinc-600">
          Für die beste Darstellung bitte ein Bild im Hochformat hochladen.
          Empfohlen: 900 × 1600 px (9:16), mindestens 675 × 1200 px.
          Wichtige Inhalte möglichst mittig platzieren und nicht zu nah am Rand.
        </p>
      )}

      <AdvisorBusinessImage
        imageUrl={effectivePreviewUrl}
        name={previewName}
        className={`mx-auto w-full border border-violet-200/70 bg-white/70 shadow-[0_10px_22px_rgba(56,35,98,0.14)] ${compact ? "max-w-[120px]" : "max-w-[210px]"}`}
      />

      <label className="grid gap-1 text-sm text-zinc-700">
        Datei auswählen
        <input
          type="file"
          name="contact_avatar_file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            void handleFileChange(file);
          }}
          className="rounded-xl border border-violet-300/55 bg-white px-3 py-1.5 text-sm text-zinc-900 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-100 file:px-3 file:py-1 file:text-sm file:font-medium file:text-violet-800"
        />
      </label>

      {warning ? <p className="text-xs text-amber-700">{warning}</p> : null}
      {error ? <p className="text-xs text-rose-700">{error}</p> : null}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-fit rounded-xl border border-violet-300/50 bg-white px-3 py-1.5 text-xs font-semibold text-violet-800 transition-all duration-300 hover:-translate-y-0.5 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
      >
        Bild hochladen
      </button>
    </form>
  );
}
