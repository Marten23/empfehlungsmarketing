type SupabaseLikeError = {
  message?: unknown;
  code?: unknown;
  details?: unknown;
  hint?: unknown;
};

function toText(value: unknown) {
  return typeof value === "string" ? value : String(value);
}

export function normalizeSupabaseError(input: unknown): Error {
  if (input instanceof Error) return input;

  const err = (input ?? {}) as SupabaseLikeError;
  const message = err.message ? toText(err.message) : "Unbekannter Datenbankfehler";
  const code = err.code ? ` | Code: ${toText(err.code)}` : "";
  const details = err.details ? ` | Details: ${toText(err.details)}` : "";
  const hint = err.hint ? ` | Hint: ${toText(err.hint)}` : "";

  return new Error(`${message}${code}${details}${hint}`);
}

