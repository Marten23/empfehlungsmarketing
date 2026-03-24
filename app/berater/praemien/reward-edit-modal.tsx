"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { ImageFocusPicker } from "@/app/berater/praemien/image-focus-picker";

type RewardEditModalProps = {
  reward: {
    id: string;
    title: string | null;
    name: string | null;
    description: string | null;
    motivation_text: string | null;
    image_url: string | null;
    image_source_note: string | null;
    image_rights_confirmed: boolean;
    image_rights_confirmed_at: string | null;
    image_focus_x: number | null;
    image_focus_y: number | null;
    external_product_url: string | null;
    points_cost: number;
    is_active: boolean;
  };
  inputClass: string;
  primaryButtonClass: string;
  subtleButtonClass: string;
  hintClass: string;
  saveRewardAction: (formData: FormData) => void | Promise<void>;
  deleteRewardAction: (formData: FormData) => void | Promise<void>;
};

export function RewardEditModal({
  reward,
  inputClass,
  primaryButtonClass,
  subtleButtonClass,
  hintClass,
  saveRewardAction,
  deleteRewardAction,
}: RewardEditModalProps) {
  const [open, setOpen] = useState(false);
  const canPortal =
    typeof window !== "undefined" && typeof document !== "undefined";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-orange-300/60 bg-white text-base text-orange-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-50 hover:ring-1 hover:ring-orange-300/60"
        aria-label="Prämie bearbeiten"
        title="Prämie bearbeiten"
      >
        ✎
      </button>

      {canPortal && open
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-950/60 p-4"
              onClick={() => setOpen(false)}
            >
              <div
                className="w-full max-w-3xl overflow-hidden rounded-2xl border border-orange-200/80 bg-white shadow-[0_30px_80px_rgba(8,4,18,0.45)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-orange-200/70 bg-orange-50/85 px-4 py-3">
                  <p className="text-sm font-semibold text-zinc-900">
                    Prämie bearbeiten: {reward.title || reward.name || "Prämie"}
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg border border-orange-300/60 bg-white px-2.5 py-1 text-xs font-semibold text-orange-800 transition hover:bg-orange-50"
                  >
                    Abbrechen
                  </button>
                </div>

                <form action={saveRewardAction} className="max-h-[80vh] overflow-y-auto p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <input type="hidden" name="id" value={reward.id} />
                    <label className="flex flex-col gap-1 text-xs text-zinc-600">
                      Titel
                      <input
                        required
                        name="title"
                        defaultValue={reward.title || reward.name || ""}
                        className={inputClass}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-zinc-600">
                      Punktewert
                      <input
                        required
                        type="number"
                        min={1}
                        name="points_cost"
                        defaultValue={reward.points_cost}
                        className={inputClass}
                      />
                    </label>

                    <label className="flex flex-col gap-1 text-xs text-zinc-600 md:col-span-2">
                      Beschreibung
                      <textarea
                        name="description"
                        rows={2}
                        defaultValue={reward.description ?? ""}
                        className={inputClass}
                      />
                    </label>

                    <label className="flex flex-col gap-1 text-xs text-zinc-600 md:col-span-2">
                      Motivationstext
                      <textarea
                        name="motivation_text"
                        rows={2}
                        defaultValue={reward.motivation_text ?? ""}
                        className={inputClass}
                      />
                      <p className={hintClass}>Wird Empfehlern direkt bei der Prämie angezeigt.</p>
                    </label>

                    <label className="flex flex-col gap-1 text-xs text-zinc-600">
                      Bild-URL
                      <input
                        name="image_url"
                        defaultValue={reward.image_url ?? ""}
                        className={inputClass}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-zinc-600">
                      Produktlink
                      <input
                        name="external_product_url"
                        defaultValue={reward.external_product_url ?? ""}
                        className={inputClass}
                      />
                    </label>

                    {reward.image_url ? (
                      <div className="md:col-span-2">
                        <ImageFocusPicker
                          imageUrl={reward.image_url}
                          initialX={reward.image_focus_x ?? 50}
                          initialY={reward.image_focus_y ?? 50}
                          inputNameX="image_focus_x"
                          inputNameY="image_focus_y"
                        />
                      </div>
                    ) : (
                      <>
                        <input
                          type="hidden"
                          name="image_focus_x"
                          value={String(reward.image_focus_x ?? 50)}
                        />
                        <input
                          type="hidden"
                          name="image_focus_y"
                          value={String(reward.image_focus_y ?? 50)}
                        />
                      </>
                    )}

                    <label className="flex flex-col gap-1 text-xs text-zinc-600">
                      Quelle/Lizenz
                      <input
                        name="image_source_note"
                        defaultValue={reward.image_source_note ?? ""}
                        className={inputClass}
                      />
                    </label>

                    <label className="flex flex-col gap-1 text-xs text-zinc-600">
                      Sichtbarkeit
                      <select
                        name="is_active"
                        defaultValue={reward.is_active ? "1" : "0"}
                        className={inputClass}
                      >
                        <option value="1">aktiv</option>
                        <option value="0">inaktiv</option>
                      </select>
                    </label>

                    <label className="md:col-span-2 flex items-start gap-2 rounded-lg border border-zinc-200 bg-zinc-50/90 p-3 text-xs text-zinc-700">
                      <input
                        type="checkbox"
                        name="image_rights_confirmed"
                        value="1"
                        defaultChecked={reward.image_rights_confirmed}
                        className="mt-0.5"
                      />
                      <span>
                        Ich bestätige die Nutzungsrechte für das verknüpfte Bild.
                        {reward.image_rights_confirmed_at ? (
                          <span className="ml-1 text-zinc-500">
                            (zuletzt bestätigt am{" "}
                            {new Date(reward.image_rights_confirmed_at).toLocaleString("de-DE")})
                          </span>
                        ) : null}
                      </span>
                    </label>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-orange-200/70 pt-3">
                    <button
                      type="submit"
                      formAction={deleteRewardAction}
                      className="rounded-lg border border-rose-300/70 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                    >
                      Prämie löschen
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className={subtleButtonClass}
                      >
                        Abbrechen
                      </button>
                      <button type="submit" className={primaryButtonClass}>
                        Speichern
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
