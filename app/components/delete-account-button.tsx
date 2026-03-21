"use client";

import { useState } from "react";

type DeleteAccountButtonProps = {
  action: (formData: FormData) => void | Promise<void>;
  title?: string;
  description?: string;
  buttonLabel?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

export function DeleteAccountButton({
  action,
  title = "Konto löschen",
  description = "Diese Aktion löscht Ihr Konto und alle zugehörigen Daten unwiderruflich.",
  buttonLabel = "Konto löschen",
  confirmLabel = "Endgültig löschen",
  cancelLabel = "Abbrechen",
}: DeleteAccountButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex w-fit items-center rounded-xl border border-rose-300/70 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-rose-100"
      >
        {buttonLabel}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-zinc-950/55 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-rose-200/70 bg-white p-4 shadow-[0_24px_48px_rgba(12,6,24,0.35)]"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-base font-semibold text-zinc-900">{title}</p>
            <p className="mt-2 text-sm text-zinc-700">{description}</p>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-zinc-300/80 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
              >
                {cancelLabel}
              </button>
              <form action={action}>
                <button
                  type="submit"
                  className="rounded-lg border border-rose-300/75 bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-500"
                >
                  {confirmLabel}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
