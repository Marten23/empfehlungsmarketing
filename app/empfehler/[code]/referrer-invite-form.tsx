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
      <label className="flex flex-col gap-1.5 text-sm text-zinc-700">
        <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">Name</span>
        <input
          type="text"
          name="full_name"
          required
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          className="h-11 rounded-xl border border-zinc-200 bg-white/95 px-3.5 text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-200/60 placeholder:text-zinc-500"
          placeholder="Max Mustermann"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm text-zinc-700">
        <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">E-Mail</span>
        <input
          type="email"
          name="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-11 rounded-xl border border-zinc-200 bg-white/95 px-3.5 text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-200/60 placeholder:text-zinc-500"
          placeholder="max@beispiel.de"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm text-zinc-700">
        <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">Passwort</span>
        <input
          type="password"
          name="password"
          required
          minLength={6}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-11 rounded-xl border border-zinc-200 bg-white/95 px-3.5 text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-200/60 placeholder:text-zinc-500"
          placeholder="Mindestens 6 Zeichen"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm text-zinc-700">
        <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">Passwort wiederholen</span>
        <input
          type="password"
          name="password_repeat"
          required
          minLength={6}
          value={passwordRepeat}
          onChange={(event) => setPasswordRepeat(event.target.value)}
          className="h-11 rounded-xl border border-zinc-200 bg-white/95 px-3.5 text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-200/60 placeholder:text-zinc-500"
          placeholder="Passwort wiederholen"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm text-zinc-700">
        <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">Telefonnummer</span>
        <input
          type="tel"
          name="phone"
          required
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className="h-11 rounded-xl border border-zinc-200 bg-white/95 px-3.5 text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-200/60 placeholder:text-zinc-500"
          placeholder="+49..."
        />
      </label>

      <label className="flex items-start gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50/75 p-3 text-xs text-zinc-700">
        <input
          type="checkbox"
          name="privacy_accepted"
          value="yes"
          className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-orange-600 focus:ring-orange-300"
          required
        />
        <span>
          Ich habe die{" "}
          <Link
            href="/datenschutz"
            className="font-medium text-orange-700 underline underline-offset-2"
            target="_blank"
          >
            Datenschutzhinweise
          </Link>{" "}
          gelesen und stimme der Verarbeitung meiner Angaben zu.
        </span>
      </label>

      {state.error ? (
        <p className="rounded-xl border border-rose-300/70 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.error}
        </p>
      ) : null}

      {state.success && state.message ? (
        <p className="rounded-xl border border-emerald-300/70 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white shadow-[0_14px_26px_rgba(249,115,22,0.28)] transition hover:-translate-y-0.5 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-55"
      >
        {isPending ? "Registrierung läuft..." : "Als Empfehler registrieren"}
      </button>
    </form>
  );
}
