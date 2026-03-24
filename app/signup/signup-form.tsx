"use client";

import { useActionState } from "react";
import { signupAction } from "@/app/signup/actions";
import type { AuthResult } from "@/lib/auth/types";
import {
  GiftIcon,
  SparklesIcon,
  UsersIcon,
} from "@/app/empfehler/dashboard/components/icons";

const initialState: AuthResult = { error: null, message: null };

type SignupFormProps = {
  inviteCode?: string;
  inviteType?: "advisor" | "referrer";
  advisorName?: string | null;
};

export function SignupForm({
  inviteCode = "",
  inviteType = "advisor",
  advisorName = null,
}: SignupFormProps) {
  const [state, formAction, isPending] = useActionState(
    signupAction,
    initialState,
  );
  const isReferrerInvite = inviteType === "referrer" && inviteCode.length > 0;

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      {isReferrerInvite ? (
        <div className="rounded-xl border border-emerald-300/55 bg-emerald-50/90 p-3 text-sm text-emerald-900">
          <p className="inline-flex items-center gap-2 font-semibold">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-emerald-300/60 bg-emerald-100/90">
              <GiftIcon className="h-3.5 w-3.5" />
            </span>
            Willkommen im Empfehlungsprogramm
          </p>
          <p className="mt-1 text-xs text-emerald-800">
            Sie wurden von{" "}
            <span className="font-semibold">{advisorName ?? "einem Berater"}</span>{" "}
            eingeladen.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-orange-200/60 bg-orange-50/85 p-3 text-sm text-zinc-800">
          <p className="inline-flex items-center gap-2 font-semibold text-zinc-900">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-orange-300/45 bg-orange-100 text-orange-700">
              <UsersIcon className="h-3.5 w-3.5" />
            </span>
            Berater-Konto erstellen
          </p>
          <p className="mt-1 text-xs text-zinc-700">
            Ohne gültigen Einladungslink wird ein Berater-Konto erstellt.
          </p>
        </div>
      )}

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

      <label className="flex flex-col gap-1 text-sm text-zinc-700">
        <span className="font-medium">Name</span>
        <input
          type="text"
          name="full_name"
          required
          className="rounded-xl border border-orange-200/70 bg-white/95 px-3 py-2 text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] transition-all duration-300 hover:border-orange-300/70 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
          placeholder="Max Mustermann"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-zinc-700">
        <span className="font-medium">Telefonnummer</span>
        <input
          type="tel"
          name="phone"
          required
          className="rounded-xl border border-orange-200/70 bg-white/95 px-3 py-2 text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] transition-all duration-300 hover:border-orange-300/70 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
          placeholder="+49..."
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-zinc-700">
        <span className="font-medium">Passwort</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="new-password"
          className="rounded-xl border border-orange-200/70 bg-white/95 px-3 py-2 text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] transition-all duration-300 hover:border-orange-300/70 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
          placeholder="Mindestens 6 Zeichen"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-zinc-700">
        <span className="font-medium">Passwort wiederholen</span>
        <input
          type="password"
          name="password_repeat"
          required
          autoComplete="new-password"
          className="rounded-xl border border-orange-200/70 bg-white/95 px-3 py-2 text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] transition-all duration-300 hover:border-orange-300/70 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
          placeholder="Passwort erneut eingeben"
        />
      </label>

      {inviteCode ? <input type="hidden" name="invite_code" value={inviteCode} /> : null}
      {inviteType ? <input type="hidden" name="invite_type" value={inviteType} /> : null}

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
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-300/40 bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(91,61,200,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-500 disabled:opacity-50"
      >
        <SparklesIcon className="h-4 w-4" />
        {isPending
          ? "Registrierung läuft..."
          : isReferrerInvite
            ? "Als Empfehler registrieren"
            : "Berater-Konto erstellen"}
      </button>
    </form>
  );
}
