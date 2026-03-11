export default function DatenschutzPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-6">
      <h1 className="text-3xl font-semibold">Datenschutzhinweise</h1>

      <p className="text-sm text-zinc-600">
        Diese Seite ist ein Platzhalter und sollte vor Livegang mit deinen
        rechtlich finalen Datenschutzangaben ergänzt werden.
      </p>

      <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-800">
        <p>
          <span className="font-medium">Verantwortlicher:</span> Bitte ergänzen
        </p>
        <p>
          <span className="font-medium">Zweck der Verarbeitung:</span>{" "}
          Kontaktaufnahme auf Anfrage über Empfehlungslink.
        </p>
        <p>
          <span className="font-medium">Rechtsgrundlage:</span> Bitte ergänzen
          (z. B. Art. 6 Abs. 1 lit. b oder lit. f DSGVO).
        </p>
        <p>
          <span className="font-medium">Speicherdauer:</span> Bitte ergänzen.
        </p>
        <p>
          <span className="font-medium">Empfänger:</span> Zuständiger Berater
          innerhalb der App.
        </p>
        <p>
          <span className="font-medium">Betroffenenrechte:</span> Auskunft,
          Berichtigung, Löschung, Einschränkung, Widerspruch.
        </p>
      </section>
    </main>
  );
}

