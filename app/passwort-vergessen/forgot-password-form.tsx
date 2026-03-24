"use client";

import { useActionState } from "react";
import { forgotPasswordAction } from "@/app/login/actions";
import type { AuthResult } from "@/lib/auth/types";

const initialState: AuthResult = { error: null, message: null };

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    forgotPasswordAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-zinc-700">
        <span className="font-medium">E-Mail</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="rounded-xl border border-orange-200/70 bg-white/95 px-3 py-2 text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] transition-all duration-300 hover:border-orange-300/70 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
          placeholder="name@beispiel.de"
        />
      </label>

      {state.error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      {state.message ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl border border-orange-300/40 bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(91,61,200,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-500 disabled:opacity-50"
      >
        {isPending ? "Sende E-Mail..." : "Link zum Zurücksetzen senden"}
      </button>
    </form>
  );
}

