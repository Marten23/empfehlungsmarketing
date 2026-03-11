"use client";

import { useEffect, useState } from "react";

type ProbeResponse = {
  ok: boolean;
  status: "connected" | "missing_env" | "unreachable";
  message: string;
  details?: string;
  checkedAt: string;
};

export default function Home() {
  const [result, setResult] = useState<ProbeResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const runProbe = async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/supabase-probe", { cache: "no-store" });
      const data = (await response.json()) as ProbeResponse;
      setResult(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unbekannter Fehler";
      setResult({
        ok: false,
        status: "unreachable",
        message: "Probe konnte nicht ausgefuehrt werden.",
        details: message,
        checkedAt: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void runProbe();
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-6 p-6">
      <h1 className="text-3xl font-semibold">Supabase Verbindungs-Probe</h1>
      <p className="text-sm text-zinc-600">
        Diese Seite testet, ob Supabase in diesem Projekt korrekt verbunden ist.
      </p>

      <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        {!result ? (
          <p>Status wird geladen...</p>
        ) : (
          <>
            <p className="text-base">
              <span className="font-semibold">Ergebnis: </span>
              {result.ok ? "OK" : "Fehler"}
            </p>
            <p className="mt-2 text-sm">{result.message}</p>
            {result.details ? (
              <p className="mt-2 text-sm text-red-700">{result.details}</p>
            ) : null}
            <p className="mt-3 text-xs text-zinc-500">
              Geprueft am: {new Date(result.checkedAt).toLocaleString("de-DE")}
            </p>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => void runProbe()}
        disabled={loading}
        className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "Pruefe..." : "Probe neu starten"}
      </button>
    </main>
  );
}
