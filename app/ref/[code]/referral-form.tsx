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
  const weekdays = [
    { value: "Mo", label: "Mo" },
    { value: "Di", label: "Di" },
    { value: "Mi", label: "Mi" },
    { value: "Do", label: "Do" },
    { value: "Fr", label: "Fr" },
    { value: "Sa", label: "Sa" },
    { value: "So", label: "So" },
  ];

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
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

        <label className="flex flex-col gap-1 text-sm text-zinc-800 md:col-span-2 lg:col-span-3">
          <span>Notiz (optional)</span>
          <textarea
            name="contact_note"
            rows={2}
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-500"
            placeholder="Ich freue mich über einen Rückruf."
          />
        </label>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <fieldset className="rounded border border-zinc-300 bg-white px-3 py-2">
        <legend className="px-1 text-sm font-medium text-zinc-800">
          Erreichbarkeit (optional)
        </legend>
        <p className="mb-2 text-xs text-zinc-600">
          Wähle passende Wochentage und eine Uhrzeit ab der Kontakt möglich ist.
        </p>
        <div className="flex flex-wrap gap-2">
          {weekdays.map((day) => (
            <label
              key={day.value}
              className="inline-flex items-center gap-1.5 rounded border border-zinc-300 bg-zinc-50 px-2 py-1 text-xs text-zinc-800"
            >
              <input type="checkbox" name="contact_days" value={day.value} />
              <span>{day.label}</span>
            </label>
          ))}
        </div>
        <label className="mt-2 flex flex-col gap-1 text-sm text-zinc-800">
          <span>Kontakt möglich ab (Uhrzeit)</span>
          <input
            type="time"
            name="contact_time_from"
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
          />
        </label>
        </fieldset>

        <div className="space-y-2">
          <fieldset className="rounded border border-zinc-300 bg-white px-3 py-2">
            <legend className="px-1 text-xs font-medium text-zinc-800">
              Kontaktwunsch
            </legend>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-zinc-800">
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="contact_preference" value="call" />
                <span>Bitte anrufen</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="contact_preference" value="message" />
                <span>Bitte Nachricht</span>
              </label>
            </div>
          </fieldset>

          <label className="flex items-start gap-2 rounded border border-zinc-300 bg-white px-3 py-2 text-[11px] leading-snug text-zinc-700">
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
        </div>
      </div>

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

      <div className="flex justify-start">
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? "Wird gesendet..." : "Kontaktwunsch absenden"}
        </button>
      </div>
    </form>
  );
}
