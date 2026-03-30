"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildInstagramStorySvg,
  getInstagramStoryVariants,
  getInstagramDmMessage,
  type InstagramDmFlow,
  type InstagramStoryVariant,
} from "@/lib/instagram/share";

type InstagramInviteButtonProps = {
  flow: InstagramDmFlow;
  inviteLink: string;
  advisorName?: string | null;
  mode?: "advisor_story_and_dm" | "dm_only";
  className?: string;
  label?: string;
};

function instagramOpenUrl() {
  return "https://www.instagram.com/";
}

function openInstagram() {
  if (typeof window === "undefined") return;
  window.open(instagramOpenUrl(), "_blank", "noopener,noreferrer");
}

export function InstagramInviteButton({
  flow,
  inviteLink,
  advisorName = "Berater",
  mode = "dm_only",
  className,
  label = "Über Instagram einladen",
}: InstagramInviteButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState<"none" | "dm" | "link">("none");
  const [selectedVariant, setSelectedVariant] =
    useState<InstagramStoryVariant>("serious");
  const [activeTab, setActiveTab] = useState<"story" | "dm">("story");
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);

  const storyVariants = useMemo(() => getInstagramStoryVariants(), []);

  const dmText = useMemo(
    () => getInstagramDmMessage(flow, inviteLink),
    [flow, inviteLink],
  );

  useEffect(() => {
    if (!isOpen || mode !== "advisor_story_and_dm" || logoDataUrl) return;
    let cancelled = false;

    fetch("/Logo/rewaro Logo neu.png")
      .then((response) => (response.ok ? response.blob() : null))
      .then((blob) => {
        if (!blob || cancelled) return null;
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result ?? ""));
          reader.readAsDataURL(blob);
        });
      })
      .then((dataUrl) => {
        if (!dataUrl || cancelled) return;
        setLogoDataUrl(dataUrl);
      })
      .catch(() => {
        // Falls das Logo nicht geladen werden kann, bleibt die Vorschau funktionsfähig.
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, logoDataUrl, mode]);

  const storySvg = useMemo(
    () =>
      buildInstagramStorySvg({
        variant: selectedVariant,
        advisorName: advisorName?.trim() || "Berater",
        inviteLink,
        logoHref: logoDataUrl ?? "/Logo/rewaro Logo neu.png",
      }),
    [selectedVariant, advisorName, inviteLink, logoDataUrl],
  );

  const storyPreviewSrc = useMemo(
    () => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(storySvg)}`,
    [storySvg],
  );

  async function copyValue(value: string, kind: "dm" | "link") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied("none"), 1800);
    } catch {
      setCopied("none");
    }
  }

  function downloadStoryTemplate() {
    const blob = new Blob([storySvg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rewaro-story-${selectedVariant}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const buttonClass =
    className ??
    "rounded border border-zinc-300/80 bg-white px-3 py-1 text-xs font-medium text-zinc-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-zinc-100";

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className={buttonClass}>
        {label}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/65 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-zinc-700/70 bg-zinc-950 text-zinc-100 shadow-[0_25px_70px_rgba(0,0,0,0.55)]">
            <div className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-orange-300">
                  Instagram Einladung
                </p>
                <h3 className="mt-1 text-lg font-semibold text-zinc-100">
                  {mode === "advisor_story_and_dm"
                    ? "Story oder Direktnachricht"
                    : "Direktnachricht vorbereiten"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-900"
              >
                Schließen
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              {mode === "advisor_story_and_dm" ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("story")}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-wide ${
                      activeTab === "story"
                        ? "bg-orange-500 text-white"
                        : "border border-zinc-700 text-zinc-300 hover:bg-zinc-900"
                    }`}
                  >
                    Story teilen
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("dm")}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-wide ${
                      activeTab === "dm"
                        ? "bg-orange-500 text-white"
                        : "border border-zinc-700 text-zinc-300 hover:bg-zinc-900"
                    }`}
                  >
                    Direktnachricht
                  </button>
                </div>
              ) : null}

              {(mode === "advisor_story_and_dm" ? activeTab === "story" : false) ? (
                <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-3.5">
                  <p className="text-xs text-zinc-300">
                    Stil auswählen, Vorschau prüfen und dann Story als Vorlage herunterladen.
                  </p>

                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {storyVariants.map(({ value, label: optionLabel }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setSelectedVariant(value)}
                            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                              selectedVariant === value
                                ? "bg-orange-500 text-white"
                                : "border border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                            }`}
                          >
                            {optionLabel}
                          </button>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={downloadStoryTemplate}
                          className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-600"
                        >
                          Story-Vorlage herunterladen
                        </button>
                        <button
                          type="button"
                          onClick={() => copyValue(inviteLink, "link")}
                          className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800"
                        >
                          {copied === "link" ? "Link kopiert" : "Link kopieren"}
                        </button>
                        <button
                          type="button"
                          onClick={openInstagram}
                          className="rounded-lg border border-orange-300/70 bg-orange-100 px-3 py-2 text-xs font-semibold text-orange-900 hover:bg-orange-200"
                        >
                          Instagram öffnen
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-zinc-700/90 bg-black/40 p-2.5">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
                        Story-Vorschau
                      </p>
                      <div className="mx-auto aspect-[9/16] w-full max-w-[296px] overflow-hidden rounded-[22px] border border-zinc-600/70 bg-black shadow-[0_22px_40px_rgba(0,0,0,0.5)]">
                        <img
                          src={storyPreviewSrc}
                          alt="Instagram Story Vorschau"
                          className="h-full w-full object-contain"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-3.5">
                  <p className="text-xs text-zinc-300">
                    Text kopieren, Instagram öffnen und als persönliche DM einfügen.
                  </p>
                  <textarea
                    readOnly
                    value={dmText}
                    rows={4}
                    className="w-full rounded-lg border border-zinc-700 bg-black/35 px-3 py-2 text-xs text-zinc-100"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => copyValue(dmText, "dm")}
                      className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-600"
                    >
                      {copied === "dm" ? "Text kopiert" : "Text kopieren"}
                    </button>
                    <button
                      type="button"
                      onClick={openInstagram}
                      className="rounded-lg border border-orange-300/70 bg-orange-100 px-3 py-2 text-xs font-semibold text-orange-900 hover:bg-orange-200"
                    >
                      Instagram öffnen
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
