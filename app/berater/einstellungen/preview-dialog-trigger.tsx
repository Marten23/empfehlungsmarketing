"use client";

import { useEffect, useState } from "react";
import { AdvisorBusinessImage } from "@/app/components/advisor-business-image";

type PreviewDialogTriggerProps = {
  previewPath: string | null;
  previewName: string;
  previewPhone: string;
  previewEmail: string;
  contactAvatarUrl: string | null;
  welcomeText: string;
  showWelcomeVideo: boolean;
  welcomeVideoUrl: string | null;
};

export function PreviewDialogTrigger({
  previewPath,
  previewName,
  previewPhone,
  previewEmail,
  contactAvatarUrl,
  welcomeText,
  showWelcomeVideo,
  welcomeVideoUrl,
}: PreviewDialogTriggerProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center rounded-xl border border-orange-300/50 bg-orange-600 px-3.5 py-2 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-500"
      >
        Vorschau öffnen
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-[min(96vw,1500px)] overflow-hidden rounded-[26px] border border-orange-200/70 bg-[linear-gradient(165deg,rgba(250,247,255,0.98),rgba(240,235,252,0.95))] shadow-[0_28px_64px_rgba(16,8,34,0.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-orange-200/75 bg-white/70 px-5 py-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-orange-700">
                Vorschau Neukontakt-Linkseite
              </p>
              <div className="flex items-center gap-2">
                {previewPath ? (
                  <a
                    href={previewPath}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-orange-300/55 bg-white px-2.5 py-1 text-xs font-semibold text-orange-800 transition hover:bg-orange-50"
                  >
                    Neuer Tab
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-orange-300/55 bg-white px-2.5 py-1 text-xs font-semibold text-orange-800 transition hover:bg-orange-50"
                >
                  Schließen
                </button>
              </div>
            </div>

            {previewPath ? (
              <div className="h-[86vh] min-h-[700px] bg-white">
                <iframe
                  title="Neukontakt-Linkseiten Vorschau"
                  src={previewPath}
                  className="h-full w-full"
                />
              </div>
            ) : (
              <div className="p-6">
                <p className="mb-4 rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Kein gültiger Empfehler-Link vorhanden. Es wird eine direkte Vorschau mit Ihren aktuellen Einstellungen angezeigt.
                </p>
                <div className="overflow-x-auto">
                  <div className="min-w-[980px] overflow-hidden rounded-[22px] border border-orange-200/70 bg-[linear-gradient(165deg,rgba(250,247,255,0.96),rgba(240,235,252,0.92))]">
                    <div className="grid gap-4 p-5 md:grid-cols-[240px_minmax(0,1fr)]">
                      <div className="space-y-3">
                        <AdvisorBusinessImage
                          imageUrl={contactAvatarUrl}
                          name={previewName}
                          ratio="portrait"
                          className="mx-auto w-full max-w-[230px] shadow-[0_14px_28px_rgba(55,34,100,0.16)]"
                        />
                        <div className="text-center">
                          <p className="text-lg font-semibold text-zinc-900">{previewName}</p>
                          <p className="mt-1 text-sm font-medium text-zinc-700">{previewPhone}</p>
                          <p className="text-sm text-zinc-600">{previewEmail}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-sm font-semibold uppercase tracking-wide text-orange-700">Begrüßung</p>
                        {welcomeText ? (
                          <p className="rounded-xl bg-white/82 px-3 py-2.5 text-sm text-zinc-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                            {welcomeText}
                          </p>
                        ) : (
                          <p className="rounded-xl border border-dashed border-orange-200/80 bg-white/74 px-3 py-2.5 text-sm text-zinc-500">
                            Kein Begrüßungstext hinterlegt.
                          </p>
                        )}

                        {showWelcomeVideo && welcomeVideoUrl ? (
                          <video
                            controls
                            preload="metadata"
                            className="w-full overflow-hidden rounded-xl border border-orange-200/70 bg-black"
                            src={welcomeVideoUrl}
                          />
                        ) : (
                          <p className="rounded-xl border border-dashed border-orange-200/80 bg-white/74 px-3 py-2.5 text-xs text-zinc-600">
                            Kein aktives Begrüßungsvideo eingebunden.
                          </p>
                        )}

                        <div className="rounded-xl border border-orange-200/75 bg-orange-50/75 px-3 py-2 text-xs text-zinc-700">
                          Formularbereich (Vorschau): Name, Kontakt und Anfrage erscheinen unterhalb dieses Blocks.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
