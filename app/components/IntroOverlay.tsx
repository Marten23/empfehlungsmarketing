"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "introPlayed";
const FADE_DURATION_MS = 600;
const FAILSAFE_CLOSE_MS = 8000;
const START_TIMEOUT_MS = 3500;

export function IntroOverlay() {
  const [visible, setVisible] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const hideTimerRef = useRef<number | null>(null);
  const failsafeTimerRef = useRef<number | null>(null);
  const startTimerRef = useRef<number | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    try {
      const alreadyPlayed = sessionStorage.getItem(STORAGE_KEY) === "1";
      if (alreadyPlayed) return;
      setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [visible]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }
      if (failsafeTimerRef.current) {
        window.clearTimeout(failsafeTimerRef.current);
      }
      if (startTimerRef.current) {
        window.clearTimeout(startTimerRef.current);
      }
    };
  }, []);

  function closeOverlay() {
    if (fadingOut) return;
    setFadingOut(true);
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore storage errors and still close the intro
    }
    hideTimerRef.current = window.setTimeout(() => {
      setVisible(false);
    }, FADE_DURATION_MS);
  }

  function markStarted() {
    startedRef.current = true;
    if (failsafeTimerRef.current) {
      window.clearTimeout(failsafeTimerRef.current);
      failsafeTimerRef.current = null;
    }
  }

  useEffect(() => {
    if (!visible) return;
    // If the video cannot start (unsupported codec, load error), close automatically.
    startTimerRef.current = window.setTimeout(() => {
      if (!startedRef.current) closeOverlay();
    }, START_TIMEOUT_MS);
    // Even if playback starts but onEnded does not fire reliably, never block the page.
    failsafeTimerRef.current = window.setTimeout(() => {
      closeOverlay();
    }, FAILSAFE_CLOSE_MS);

    return () => {
      if (startTimerRef.current) {
        window.clearTimeout(startTimerRef.current);
        startTimerRef.current = null;
      }
      if (failsafeTimerRef.current) {
        window.clearTimeout(failsafeTimerRef.current);
        failsafeTimerRef.current = null;
      }
    };
  }, [visible, fadingOut]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#f8fafe] transition-opacity duration-700 ${
        fadingOut ? "opacity-0" : "opacity-100"
      }`}
      aria-hidden={fadingOut}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_6%,rgba(249,115,22,0.16),transparent_36%),radial-gradient(circle_at_88%_10%,rgba(59,130,246,0.14),transparent_34%),radial-gradient(circle_at_50%_120%,rgba(139,92,246,0.09),transparent_42%),linear-gradient(180deg,#fcfcff_0%,#f3f7ff_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(rgba(20,24,36,0.16)_0.45px,transparent_0.45px)] [background-size:3px_3px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.45),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-10 h-44 w-72 -skew-x-[24deg] bg-gradient-to-b from-zinc-950/16 to-transparent" />
        <div className="absolute left-8 top-16 h-32 w-56 -skew-x-[24deg] bg-gradient-to-b from-zinc-900/12 to-transparent" />
        <div className="absolute -right-24 top-8 h-44 w-72 skew-x-[24deg] bg-gradient-to-b from-zinc-950/16 to-transparent" />
        <div className="absolute right-10 top-16 h-32 w-56 skew-x-[24deg] bg-gradient-to-b from-zinc-900/12 to-transparent" />

        <div className="absolute -left-20 top-1/2 h-40 w-64 -translate-y-1/2 -skew-x-[24deg] bg-gradient-to-r from-zinc-900/10 to-transparent" />
        <div className="absolute -right-20 top-1/2 h-40 w-64 -translate-y-1/2 skew-x-[24deg] bg-gradient-to-l from-zinc-900/10 to-transparent" />
      </div>
      <div className="pointer-events-none absolute inset-x-12 top-14 h-px bg-zinc-900/10" />
      <div className="pointer-events-none absolute inset-x-16 bottom-14 h-px bg-zinc-900/10" />

      <div className="relative z-[9] rounded-[2rem] border border-zinc-200/80 bg-white/70 p-3 shadow-[0_26px_58px_rgba(15,23,42,0.14)] backdrop-blur-md md:p-4">
      <video
        autoPlay
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        disableRemotePlayback
        src="/Intro.mp4"
        onPlay={markStarted}
        onCanPlay={markStarted}
        onLoadedData={markStarted}
        onEnded={closeOverlay}
        onError={closeOverlay}
        className="pointer-events-none relative z-10 max-h-[68vh] w-auto max-w-[80vw] select-none rounded-2xl border border-zinc-200/75 bg-white/80 object-contain shadow-[0_24px_52px_rgba(15,23,42,0.16)]"
      >
        <source src="/Intro.mp4" type="video/mp4" />
        <source src="/Intro.mov" type="video/quicktime" />
      </video>
      </div>
    </div>
  );
}
