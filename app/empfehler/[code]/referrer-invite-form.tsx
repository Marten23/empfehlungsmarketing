"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { PublicReferrerInviteFormState } from "@/app/empfehler/[code]/actions";

type ReferrerInviteFormProps = {
  action: (
    prevState: PublicReferrerInviteFormState,
    formData: FormData,
  ) => Promise<PublicReferrerInviteFormState>;
  initialState: PublicReferrerInviteFormState;
};

export function ReferrerInviteForm({
  action,
  initialState,
}: ReferrerInviteFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [phone, setPhone] = useState("");

  return (
    <form action={formAction} className="space-y-4">
      <label className="flex flex-col gap-1 text-sm text-zinc-800">
        <span>Name</span>
        <input
          type="text"
          name="full_name"
          required
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          className="rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-500"
          placeholder="Max Mustermann"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-zinc-800">
        <span>E-Mail</span>
        <input
          type="email"
          name="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-500"
          placeholder="max@beispiel.de"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-zinc-800">
        <span>Passwort</span>
        <input
          type="password"
          name="password"
          required
          minLength={6}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-500"
          placeholder="Mindestens 6 Zeichen"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-zinc-800">
        <span>Passwort wiederholen</span>
        <input
          type="password"
          name="password_repeat"
          required
          minLength={6}
          value={passwordRepeat}
          onChange={(event) => setPasswordRepeat(event.target.value)}
          className="rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-500"
          placeholder="Passwort wiederholen"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-zinc-800">
        <span>Telefonnummer</span>
        <input
          type="tel"
          name="phone"
          required
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className="rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-500"
          placeholder="+49..."
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
          gelesen und stimme der Verarbeitung meiner Angaben zu.
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
        {isPending ? "Registrierung läuft..." : "Als Empfehler registrieren"}
      </button>
    </form>
  );
}
