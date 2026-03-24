"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SparklesIcon } from "@/app/empfehler/dashboard/components/icons";

function getTokensFromHash() {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (!access_token || !refresh_token) return null;
  return { access_token, refresh_token };
}

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    async function bootstrap() {
      try {
        const url = new URL(window.location.href);
        const authCode = url.searchParams.get("code");
        const tokenHash = url.searchParams.get("token_hash");
        const type = url.searchParams.get("type");

        if (authCode) {
          await supabase.auth.exchangeCodeForSession(authCode);
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        }

        if (tokenHash && type) {
          await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as
              | "email"
              | "recovery"
              | "invite"
              | "email_change",
          });
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        }

        const tokens = getTokensFromHash();
        if (tokens) {
          await supabase.auth.setSession(tokens);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } finally {
        setReady(true);
      }
    }
    void bootstrap();
  }, [supabase]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (password.length < 6) {
      setError("Das Passwort muss mindestens 6 Zeichen haben.");
      return;
    }
    if (password !== passwordRepeat) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    setIsPending(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsPending(false);

    if (updateError) {
      setError(
        "Das Passwort konnte nicht aktualisiert werden. Öffnen Sie den Link erneut oder fordern Sie einen neuen Link an.",
      );
      return;
    }

    setMessage("Ihr Passwort wurde erfolgreich aktualisiert. Sie können sich jetzt einloggen.");
    setPassword("");
    setPasswordRepeat("");
  }

  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center p-6 md:p-8">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_8%_4%,rgba(255,157,66,0.2),transparent_38%),radial-gradient(circle_at_92%_8%,rgba(96,165,250,0.18),transparent_38%),radial-gradient(circle_at_50%_120%,rgba(139,92,246,0.09),transparent_48%),linear-gradient(180deg,#fcfcff_0%,#f6f8ff_45%,#edf2ff_100%)]" />
      <div className="hex-honeycomb-bg pointer-events-none fixed inset-0 z-0 opacity-[0.1] [mask-image:linear-gradient(180deg,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0.1)_36%,rgba(0,0,0,0.02)_100%)]" />

      <section className="relative z-10 w-full max-w-xl overflow-hidden rounded-3xl border border-zinc-200/85 bg-white/95 p-6 shadow-[0_20px_44px_rgba(15,23,42,0.1)] backdrop-blur-xl md:p-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-orange-300/45 bg-orange-200/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-orange-800">
          <SparklesIcon className="h-3.5 w-3.5" />
          Neues Passwort
        </span>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
          Passwort neu setzen
        </h1>
        <p className="mt-2 text-sm text-zinc-700 md:text-base">
          Vergeben Sie jetzt ein neues Passwort für Ihr Konto.
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-6 rounded-2xl border border-orange-200/60 bg-white/88 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]"
        >
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm text-zinc-700">
              <span className="font-medium">Neues Passwort</span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="rounded-xl border border-orange-200/70 bg-white/95 px-3 py-2 text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] transition-all duration-300 hover:border-orange-300/70 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
                placeholder="Mindestens 6 Zeichen"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-zinc-700">
              <span className="font-medium">Passwort wiederholen</span>
              <input
                type="password"
                required
                minLength={6}
                value={passwordRepeat}
                onChange={(event) => setPasswordRepeat(event.target.value)}
                className="rounded-xl border border-orange-200/70 bg-white/95 px-3 py-2 text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] transition-all duration-300 hover:border-orange-300/70 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
                placeholder="Passwort erneut eingeben"
              />
            </label>

            {error ? (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            ) : null}

            {message ? (
              <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {message}
              </p>
            ) : null}

            {!ready ? (
              <p className="rounded-xl bg-orange-50 px-3 py-2 text-sm text-orange-800">
                Link wird geprüft...
              </p>
            ) : null}

            <button
              type="submit"
              disabled={!ready || isPending}
              className="rounded-xl border border-orange-300/40 bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(91,61,200,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-500 disabled:opacity-50"
            >
              {isPending ? "Speichere..." : "Passwort aktualisieren"}
            </button>
          </div>
        </form>

        <p className="mt-4 text-sm text-zinc-600">
          Zum{" "}
          <Link
            href="/berater/login"
            className="font-medium text-orange-700 underline underline-offset-4"
          >
            Berater-Login
          </Link>{" "}
          oder{" "}
          <Link
            href="/empfehler/login"
            className="font-medium text-orange-700 underline underline-offset-4"
          >
            Empfehler-Login
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
