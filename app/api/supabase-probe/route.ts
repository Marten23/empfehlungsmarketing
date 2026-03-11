import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type ProbeResult = {
  ok: boolean;
  status: "connected" | "missing_env" | "unreachable";
  message: string;
  details?: string;
  checkedAt: string;
};

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    const result: ProbeResult = {
      ok: false,
      status: "missing_env",
      message:
        "Supabase-Umgebungsvariablen fehlen. Setze NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY (oder NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) in .env.local.",
      checkedAt: new Date().toISOString(),
    };

    return NextResponse.json(result, { status: 200 });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Query against a table that should not exist.
    // If we get the expected "relation does not exist" error, the DB is reachable.
    const { error } = await supabase
      .from("__supabase_connection_probe__")
      .select("*")
      .limit(1);

    if (error?.code === "42P01" || error?.code === "PGRST205") {
      const result: ProbeResult = {
        ok: true,
        status: "connected",
        message: "Supabase-Verbindung ist erreichbar und antwortet.",
        checkedAt: new Date().toISOString(),
      };

      return NextResponse.json(result, { status: 200 });
    }

    const result: ProbeResult = {
      ok: false,
      status: "unreachable",
      message: "Supabase antwortet nicht wie erwartet.",
      details: error
        ? `${error.message}${error.code ? ` (Code: ${error.code})` : ""}`
        : "Unbekannter Fehler bei der Probe.",
      checkedAt: new Date().toISOString(),
    };

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    const result: ProbeResult = {
      ok: false,
      status: "unreachable",
      message: "Verbindung zu Supabase fehlgeschlagen.",
      details: message,
      checkedAt: new Date().toISOString(),
    };

    return NextResponse.json(result, { status: 200 });
  }
}
