import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentReferrerContext } from "@/lib/auth/referrer";
import {
  listPointsTransactionsForReferrer,
  sumAvailablePoints,
  sumLifetimeLevelPoints,
} from "@/lib/queries/points";
import { listReferralsForReferrer } from "@/lib/queries/referrals";
import { normalizeSupabaseError } from "@/lib/supabase/errors";
import { normalizeGermanUmlauts } from "@/lib/text/normalize-de";
import {
  ArrowUpRightIcon,
  BookIcon,
  SparklesIcon,
  TrophyIcon,
  BoltIcon,
} from "@/app/empfehler/dashboard/components/icons";
import { ReferrerAreaHeader } from "@/app/empfehler/components/referrer-area-header";
import { getReferrerTheme } from "@/lib/ui/referrer-theme";

function getTransactionTypeLabel(type: string) {
  if (type === "earn_referral_close") return "Empfehlung erfolgreich";
  if (type === "spend_reward_redemption") return "Prämie eingelöst";
  if (type === "manual_adjustment") return "Manuelle Anpassung";
  if (type === "reversal") return "Korrektur";
  return type;
}

function transactionTypeBadgeClass(type: string) {
  if (type === "earn_referral_close") {
    return "bg-emerald-100 text-emerald-800 ring-emerald-200";
  }
  if (type === "spend_reward_redemption") {
    return "bg-amber-100 text-amber-800 ring-amber-200";
  }
  if (type === "manual_adjustment") {
    return "bg-orange-100 text-orange-700 ring-orange-200";
  }
  if (type === "reversal") {
    return "bg-rose-100 text-rose-700 ring-rose-200";
  }
  return "bg-zinc-100 text-zinc-700 ring-zinc-200";
}

export default async function ReferrerPointsAccountPage() {
  const supabase = await createClient();
  const referrerContext = await getCurrentReferrerContext(supabase);

  if (!referrerContext) {
    redirect("/empfehler/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profileThemeRow } = await supabase
    .from("profiles")
    .select("referrer_theme")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();
  const referrerTheme = getReferrerTheme(
    (profileThemeRow as { referrer_theme?: string | null } | null)?.referrer_theme,
  );

  let loadError: string | null = null;
  let pointsRows: Awaited<ReturnType<typeof listPointsTransactionsForReferrer>> = [];
  let availablePoints = 0;
  let lifetimeLevelPoints = 0;
  let referralNameById = new Map<string, string>();

  try {
    pointsRows = await listPointsTransactionsForReferrer(
      supabase,
      referrerContext.advisorId,
      referrerContext.referrerId,
    );
    availablePoints = sumAvailablePoints(pointsRows);
    lifetimeLevelPoints = sumLifetimeLevelPoints(pointsRows);

    const referrals = await listReferralsForReferrer(
      supabase,
      referrerContext.advisorId,
      referrerContext.referrerId,
    );
    referralNameById = new Map(
      referrals.map((row) => {
        const fullName =
          row.contact_name ??
          [row.contact_first_name, row.contact_last_name]
            .filter(Boolean)
            .join(" ")
            .trim() ??
          "-";
        return [row.id, fullName || "-"] as const;
      }),
    );
  } catch (error) {
    loadError = normalizeSupabaseError(error).message;
  }

  return (
    <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 p-4 pb-8 md:gap-5 md:p-6">
      <div className={`pointer-events-none fixed inset-0 z-0 ${referrerTheme.backgroundClass}`} />
      <div
        className={`${referrerTheme.honeycombClass} ${referrerTheme.honeycombOpacityClass} pointer-events-none fixed inset-0 z-0`}
      />
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute left-[4%] top-[18%] h-[220px] w-[260px] opacity-55">
          <div className="hex-node hex-pulse absolute left-0 top-6 h-14 w-14 border border-orange-300/30 bg-orange-300/10" />
          <div className="hex-node hex-pulse absolute left-14 top-0 h-20 w-20 border border-sky-300/35 bg-sky-300/14 [animation-delay:1.1s]" />
          <div className="hex-node hex-pulse absolute left-28 top-10 h-14 w-14 border border-orange-300/26 bg-orange-200/12 [animation-delay:2s]" />
          <div className="hex-node hex-pulse absolute left-9 top-20 h-16 w-16 border border-orange-300/25 bg-orange-300/8 [animation-delay:2.7s]" />
        </div>
        <div className="absolute right-[5%] top-[56%] h-[240px] w-[300px] opacity-55">
          <div className="hex-node hex-pulse absolute left-6 top-4 h-16 w-16 border border-orange-300/26 bg-orange-300/8 [animation-delay:0.8s]" />
          <div className="hex-node hex-pulse absolute left-24 top-0 h-20 w-20 border border-sky-300/35 bg-sky-300/12 [animation-delay:1.6s]" />
          <div className="hex-node hex-pulse absolute left-46 top-12 h-14 w-14 border border-orange-300/26 bg-orange-200/12 [animation-delay:2.4s]" />
          <div className="hex-node hex-pulse absolute left-16 top-24 h-16 w-16 border border-orange-300/24 bg-orange-300/8 [animation-delay:3.2s]" />
        </div>
      </div>

      <ReferrerAreaHeader active="punktekonto" />

      <section className="relative z-10 overflow-hidden rounded-3xl border border-zinc-200/85 bg-white/95 p-5 shadow-[0_20px_44px_rgba(15,23,42,0.1)] backdrop-blur-xl md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-300/45 bg-orange-200/45 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-orange-800">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-300/35 text-orange-800">
                <BookIcon className="h-3.5 w-3.5" />
              </span>
              Punkteverlauf
            </span>
            <h1 className="text-2xl font-semibold text-zinc-900 md:text-3xl">Dein Punktekonto</h1>
            <p className="text-sm text-zinc-700 md:text-base">
              Hier siehst du alle gesammelten und eingelösten Punkte im Überblick.
            </p>
          </div>

          <div className="rounded-2xl border border-orange-200/65 bg-orange-50/92 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-orange-700">
              <SparklesIcon className="h-4 w-4" />
              Letzte Buchung
            </p>
            <p className="mt-1 max-w-xs text-sm font-medium text-zinc-800">
              {pointsRows[0]?.description ?? getTransactionTypeLabel(pointsRows[0]?.transaction_type ?? "-")}
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              {pointsRows[0] ? new Date(pointsRows[0].created_at).toLocaleString("de-DE") : "Noch keine Buchung vorhanden."}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href="/empfehler/dashboard"
            className="inline-flex items-center gap-2 text-sm text-orange-700 underline decoration-orange-300/60 underline-offset-4 transition-all duration-300 hover:text-orange-900 hover:decoration-orange-500/90"
          >
            Zurück zum Dashboard
          </Link>
          <Link
            href="/empfehler/praemien"
            className="group inline-flex items-center gap-1 text-sm text-orange-700 underline decoration-orange-300/60 underline-offset-4 transition-all duration-300 hover:text-orange-900 hover:decoration-orange-500/90"
          >
            Zu den Prämien
            <ArrowUpRightIcon className="h-3.5 w-3.5 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </section>

      <section className="relative z-10 grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-orange-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
          <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-orange-700">
            <BoltIcon className="h-4 w-4" />
            Verfügbare Punkte
          </p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">{availablePoints}</p>
        </article>
        <article className="rounded-2xl border border-orange-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
          <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-orange-700">
            <TrophyIcon className="h-4 w-4" />
            Gesammelte Punkte
          </p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">{lifetimeLevelPoints}</p>
          <p className="mt-1 text-xs text-zinc-600">Diese Punkte zählen für dein Level.</p>
        </article>
      </section>

      {loadError ? (
        <p className="rounded-xl border border-rose-300/70 bg-rose-50/95 px-3 py-2 text-sm text-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          Daten konnten nicht vollständig geladen werden: {loadError}
        </p>
      ) : null}

      <section className="relative z-10 rounded-2xl border border-orange-200/55 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="inline-flex items-center gap-2.5 text-lg font-semibold text-zinc-900">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-orange-300/45 bg-orange-100/80 text-orange-700">
              <BookIcon className="h-4 w-4" />
            </span>
            Vollständiger Punkteverlauf
          </h2>
          <span className="text-xs text-zinc-600">{pointsRows.length} Buchungen</span>
        </div>

        <div className="max-h-[560px] overflow-auto rounded-xl border border-orange-100/80 bg-orange-50/65">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-orange-100/90 text-left text-zinc-600 backdrop-blur">
              <tr>
                <th className="px-3 py-2">Datum</th>
                <th className="px-3 py-2">Beschreibung</th>
                <th className="px-3 py-2">Buchungsart</th>
                <th className="px-3 py-2 text-right">Punkte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-100">
              {pointsRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-zinc-500">
                    Noch keine Buchungen vorhanden.
                  </td>
                </tr>
              ) : (
                pointsRows.map((row) => {
                  const label =
                    row.transaction_type === "earn_referral_close" && row.referral_id
                      ? `Abschluss Neukunde: ${referralNameById.get(row.referral_id) ?? "Unbekannter Kontakt"}`
                      : normalizeGermanUmlauts(
                          row.description ?? getTransactionTypeLabel(row.transaction_type),
                        );

                  return (
                    <tr
                      key={row.id}
                      className="transition-colors duration-200 hover:bg-orange-100/65"
                    >
                      <td className="px-3 py-2 text-zinc-600">
                        {new Date(row.created_at).toLocaleString("de-DE")}
                      </td>
                      <td className="px-3 py-2 text-zinc-900">{label}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ring-1 ${transactionTypeBadgeClass(row.transaction_type)}`}
                        >
                          {getTransactionTypeLabel(row.transaction_type)}
                        </span>
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-semibold ${
                          row.points >= 0 ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        {row.points > 0 ? `+${row.points}` : row.points}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}


