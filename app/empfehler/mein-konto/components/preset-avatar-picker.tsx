"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";

type PresetImageGroup = {
  key: string;
  label: string;
  images: string[];
};

type PresetAvatarPickerProps = {
  groups: PresetImageGroup[];
  avatarUrl?: string | null;
  initials: string;
  action: (formData: FormData) => void | Promise<void>;
};

export function PresetAvatarPicker({ groups, avatarUrl, initials, action }: PresetAvatarPickerProps) {
  const allImages = useMemo(() => groups.flatMap((group) => group.images), [groups]);
  const initialSelectedImage =
    avatarUrl && avatarUrl.startsWith("/images/") && allImages.includes(avatarUrl)
      ? avatarUrl
      : (allImages[0] ?? "");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(initialSelectedImage);
  const [openGroupKey, setOpenGroupKey] = useState("");

  const hasImages = allImages.length > 0;
  const formId = "referrer-avatar-form";

  if (!hasImages) {
    return (
      <p className="text-xs text-zinc-600">
        Keine Preset-Bilder in <code>public/images</code> gefunden.
      </p>
    );
  }

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-sm"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="flex h-[min(88vh,860px)] w-[min(94vw,1120px)] flex-col rounded-3xl border border-violet-300/45 bg-violet-50/95 p-5 shadow-[0_34px_80px_rgba(10,4,24,0.5)] md:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h4 className="text-base font-semibold text-zinc-900">Profilbild auswählen</h4>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-lg border border-violet-300/55 bg-white px-2.5 py-1 text-xs font-semibold text-violet-800 hover:bg-violet-100"
          >
            Abbrechen
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {groups.map((group) => {
            const isOpenGroup = openGroupKey === group.key;
            return (
              <section
                key={group.key}
                className="overflow-hidden rounded-xl border border-violet-200/75 bg-white/80"
              >
                <button
                  type="button"
                  onClick={() => setOpenGroupKey((prev) => (prev === group.key ? "" : group.key))}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold transition-colors ${
                    isOpenGroup
                      ? "bg-violet-100/80 text-violet-900"
                      : "bg-white text-zinc-800 hover:bg-violet-50"
                  }`}
                >
                  <span>{group.label}</span>
                  <span className="text-xs text-zinc-600">{group.images.length} Bilder</span>
                </button>

                {isOpenGroup ? (
                  <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {group.images.map((img) => {
                      const active = img === selectedImage;
                      return (
                        <button
                          key={img}
                          type="button"
                          onClick={() => setSelectedImage(img)}
                          className={`group relative overflow-hidden rounded-2xl border bg-white p-2 text-center transition-all ${
                            active
                              ? "border-violet-500 shadow-[0_0_0_1px_rgba(124,58,237,0.55),0_14px_30px_rgba(91,33,182,0.22)]"
                              : "border-violet-200/70 hover:-translate-y-0.5 hover:border-violet-400/70 hover:shadow-[0_10px_22px_rgba(91,33,182,0.16)]"
                          }`}
                        >
                          <div className="flex justify-center pb-1.5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img}
                              alt="Preset-Profilbild"
                              className="h-20 w-20 rounded-full border border-violet-200/80 object-cover shadow-[0_8px_18px_rgba(76,29,149,0.16)]"
                            />
                          </div>
                          <div className="px-1 py-1 text-[11px] text-zinc-700">{img.split("/").pop()}</div>
                          {active ? (
                            <span className="absolute right-2 top-2 rounded-full border border-violet-500/70 bg-violet-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                              Ausgewählt
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            );
          })}

          {!openGroupKey ? (
            <p className="rounded-xl border border-violet-200/70 bg-white/70 px-3 py-2 text-xs text-zinc-600">
              Wähle eine Kategorie, um Bilder anzuzeigen.
            </p>
          ) : null}
        </div>

        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-xl border border-violet-300/55 bg-white px-3 py-1.5 text-sm font-semibold text-violet-800 transition-all hover:bg-violet-100"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            form={formId}
            disabled={!selectedImage}
            className="rounded-xl border border-violet-300/50 bg-violet-600 px-3 py-1.5 text-sm font-semibold text-white transition-all hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-55"
          >
            Bild übernehmen
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <form id={formId} action={action} className="hidden">
        <input type="hidden" name="preset_avatar" value={selectedImage} />
      </form>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="group relative inline-flex h-32 w-32 items-center justify-center overflow-hidden rounded-3xl border border-violet-300/70 bg-white/85 shadow-[0_20px_40px_rgba(76,29,149,0.22)] transition-all hover:-translate-y-0.5 hover:border-violet-400/80"
        title="Profilbild ändern"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="Profilbild" className="h-full w-full object-cover" />
        ) : (
          <span className="text-3xl font-semibold text-violet-800">{initials}</span>
        )}
        <span className="pointer-events-none absolute inset-x-2 bottom-2 rounded-lg bg-zinc-950/65 px-2 py-1 text-center text-[11px] font-semibold text-white opacity-90">
          Bild ändern
        </span>
      </button>

      {isOpen && typeof window !== "undefined" ? createPortal(modal, document.body) : null}
    </>
  );
}
