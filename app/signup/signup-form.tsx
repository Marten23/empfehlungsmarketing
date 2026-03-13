"use client";

import { useActionState } from "react";
import { signupAction } from "@/app/signup/actions";
import type { AuthResult } from "@/lib/auth/types";

const initialState: AuthResult = { error: null, message: null };

type SignupFormProps = {
  defaultInviteCode?: string;
  defaultInviteType?: string;
};

export function SignupForm({
  defaultInviteCode = "",
  defaultInviteType = "",
}: SignupFormProps) {
  const [state, formAction, isPending] = useActionState(
    signupAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span>E-Mail</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="rounded border border-zinc-300 px-3 py-2"
          placeholder="name@beispiel.de"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span>Name (optional)</span>
        <input
          type="text"
          name="full_name"
          className="rounded border border-zinc-300 px-3 py-2"
          placeholder="Max Mustermann"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span>Telefon (optional)</span>
        <input
          type="tel"
          name="phone"
          className="rounded border border-zinc-300 px-3 py-2"
          placeholder="+49..."
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span>Passwort</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="new-password"
          className="rounded border border-zinc-300 px-3 py-2"
          placeholder="Mindestens 6 Zeichen"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span>Einladungs-Code (optional)</span>
        <input
          type="text"
          name="invite_code"
          defaultValue={defaultInviteCode}
          className="rounded border border-zinc-300 px-3 py-2"
          placeholder="z. B. a_ab12cd34ef"
        />
      </label>

      {defaultInviteType ? (
        <input type="hidden" name="invite_type" value={defaultInviteType} />
      ) : null}

      {state.error ? (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      {state.message ? (
        <p className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? "Registrierung läuft..." : "Registrieren"}
      </button>
    </form>
  );
}
