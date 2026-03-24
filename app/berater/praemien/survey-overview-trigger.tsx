"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

type SurveyOverviewTriggerProps = {
  title: string;
  subtitle: string;
  countLabel: string;
  children: React.ReactNode;
};

export function SurveyOverviewTrigger({
  title,
  subtitle,
  countLabel,
  children,
}: SurveyOverviewTriggerProps) {
  const [open, setOpen] = useState(false);
  const canPortal =
    typeof window !== "undefined" && typeof document !== "undefined";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative z-10 w-full rounded-2xl border border-orange-300/60 bg-[linear-gradient(160deg,rgba(255,255,255,0.9),rgba(244,239,255,0.86))] p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_20px_rgba(54,24,120,0.12)] transition-all duration-300 hover:-translate-y-1 hover:border-orange-400/80 hover:shadow-[0_18px_34px_rgba(54,24,120,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
        aria-label="Prämien-Umfrage öffnen"
        title="Prämien-Umfrage öffnen"
      >
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-transparent transition group-hover:ring-orange-300/70" />
        <p className="text-xs font-medium uppercase tracking-wide text-orange-700">
          {title}
        </p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <p className="text-3xl font-semibold text-zinc-900">{countLabel}</p>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-orange-300/70 bg-orange-100/85 text-sm text-orange-700 transition group-hover:translate-x-0.5">
            ↗
          </span>
        </div>
        <p className="mt-1.5 text-xs text-zinc-600">{subtitle}</p>
        <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-orange-700">
          Umfrage öffnen
          <span className="transition group-hover:translate-x-0.5">→</span>
        </p>
      </button>

      {canPortal && open
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-950/60 p-4"
              onClick={() => setOpen(false)}
            >
              <div
                className="w-full max-w-6xl overflow-hidden rounded-2xl border border-orange-200/80 bg-white shadow-[0_30px_90px_rgba(8,4,18,0.52)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-orange-200/70 bg-orange-50/90 px-4 py-3">
                  <p className="text-sm font-semibold text-zinc-900">
                    Prämien-Umfrage an Empfehler
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg border border-orange-300/60 bg-white px-2.5 py-1 text-xs font-semibold text-orange-800 transition hover:bg-orange-50"
                  >
                    Abbrechen
                  </button>
                </div>

                <div className="max-h-[82vh] overflow-y-auto p-4">{children}</div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
