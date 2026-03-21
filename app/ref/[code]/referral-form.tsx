"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { PublicReferralFormState } from "@/app/ref/[code]/actions";

type ReferralFormProps = {
  action: (
    prevState: PublicReferralFormState,
    formData: FormData,
  ) => Promise<PublicReferralFormState>;
  initialState: PublicReferralFormState;
};

export function ReferralForm({ action, initialState }: ReferralFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <label className="flex flex-col gap-1 text-sm text-zinc-800">
        <span>Vorname / Name</span>
        <input
          type="text"
          name="contact_name"
          className="rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-500"
          placeholder="Max Mustermann"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-zinc-800">
        <span>E-Mail</span>
        <input
          type="email"
          name="contact_email"
          className="rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-500"
          placeholder="max@beispiel.de"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-zinc-800">
        <span>Telefonnummer</span>
        <input
          type="tel"
          name="contact_phone"
          className="rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-500"
          placeholder="+49..."
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-zinc-800">
        <span>Notiz (optional)</span>
        <textarea
          name="contact_note"
          rows={3}
          className="rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-500"
          placeholder="Ich freue mich über einen Rückruf."
        />
      </label>

      <label className="flex items-start gap-2 text-xs text-zinc-700">
        <input
          type="checkbox"
          name="privacy_accepted"
          value="yes"
          className="mt-0.5"
          required
        />
        <span>
          Ich habe die{" "}
          <Link href="/datenschutz" className="underline" target="_blank">
            Datenschutzhinweise
          </Link>{" "}
          gelesen und stimme der Verarbeitung meiner Angaben zur
          Kontaktaufnahme zu.
        </span>
      </label>

      {state.error ? (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      {state.success && state.message ? (
        <p className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? "Wird gesendet..." : "Kontaktwunsch absenden"}
      </button>
    </form>
  );
}
