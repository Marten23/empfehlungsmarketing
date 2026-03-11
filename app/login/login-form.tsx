"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/login/actions";
import type { AuthResult } from "@/lib/auth/types";

const initialState: AuthResult = { error: null, message: null };

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    loginAction,
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
        <span>Passwort</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="rounded border border-zinc-300 px-3 py-2"
          placeholder="********"
        />
      </label>

      {state.error ? (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? "Anmeldung laeuft..." : "Einloggen"}
      </button>
    </form>
  );
}


