"use client";

import { useMemo, useState } from "react";
import { AdvisorBusinessImage } from "@/app/components/advisor-business-image";

type AdvisorIntroPanelProps = {
  displayName: string;
  imageUrl: string | null;
  phone: string | null;
  email: string | null;
  welcomeVideoUrl: string | null;
  showWelcomeVideo: boolean;
};

export function AdvisorIntroPanel({
  displayName,
  imageUrl,
  phone,
  email,
  welcomeVideoUrl,
  showWelcomeVideo,
}: AdvisorIntroPanelProps) {
  const hasVideo = Boolean(showWelcomeVideo && welcomeVideoUrl);
  const [showVideo, setShowVideo] = useState(false);

  const mediaLabel = useMemo(() => {
    if (!hasVideo) return "Businessbild";
    return showVideo ? "Begrüßungsvideo" : "Businessbild";
  }, [hasVideo, showVideo]);

  return (
    <div className="rounded-3xl border border-orange-200/70 bg-white/88 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.96),0_14px_30px_rgba(63,42,108,0.12)]">
      <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-orange-700">
        {mediaLabel}
      </p>

      <div className="mx-auto grid w-full max-w-[340px] grid-cols-[44px_minmax(0,230px)_44px] items-center justify-center gap-3">
        <div aria-hidden className="h-11 w-11" />
        <div className="relative w-full max-w-[230px] justify-self-center [perspective:1200px]">
          <div
            className={`relative transition-transform duration-700 [transform-style:preserve-3d] ${
              showVideo ? "[transform:rotateY(180deg)]" : "[transform:rotateY(0deg)]"
            }`}
          >
            <div className="[backface-visibility:hidden]">
              <AdvisorBusinessImage
                imageUrl={imageUrl}
                name={displayName}
                ratio="portrait"
                className="shadow-[0_16px_30px_rgba(58,41,100,0.22)]"
              />
            </div>

            <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
              <div className="h-full overflow-hidden rounded-2xl border border-orange-200/70 bg-black shadow-[0_16px_30px_rgba(58,41,100,0.22)]">
                <video
                  controls
                  preload="metadata"
                  className="aspect-[9/16] h-full w-full object-cover"
                  src={welcomeVideoUrl ?? undefined}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex h-11 w-11 items-center justify-center">
          {hasVideo ? (
            <button
              type="button"
              onClick={() => setShowVideo((current) => !current)}
              className="h-11 w-11 rounded-full border border-orange-300/65 bg-orange-600 text-lg font-semibold text-white shadow-[0_12px_24px_rgba(91,61,200,0.35)] transition-all duration-300 hover:scale-105 hover:bg-orange-500"
              aria-label={showVideo ? "Zum Bild wechseln" : "Zum Video wechseln"}
              title={showVideo ? "Zum Bild wechseln" : "Zum Video wechseln"}
            >
              ↺
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-3 text-center">
        <p className="text-lg font-semibold text-zinc-900">{displayName}</p>
        <p className="text-xs text-zinc-600">Ihr zuständiger Berater</p>
        <div className="mx-auto mt-2 h-px w-24 bg-orange-200/80" />
        <div className="mt-2 space-y-1.5">
          {phone ? (
            <p className="text-sm font-medium text-zinc-800">{phone}</p>
          ) : null}
          {email ? (
            <p className="text-sm text-zinc-700">{email}</p>
          ) : null}
        </div>
      </div>

      {hasVideo ? (
        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setShowVideo(false)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              !showVideo
                ? "bg-orange-600 text-white"
                : "bg-orange-100 text-orange-800"
            }`}
          >
            Bild
          </button>
          <button
            type="button"
            onClick={() => setShowVideo(true)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              showVideo
                ? "bg-orange-600 text-white"
                : "bg-orange-100 text-orange-800"
            }`}
          >
            Video
          </button>
        </div>
      ) : null}
    </div>
  );
}
