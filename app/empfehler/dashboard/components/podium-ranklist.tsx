"use client";

import { useMemo, useState } from "react";

type RankEntry = {
  referrerId: string;
  name: string;
  points: number;
  avatarUrl: string | null;
};

type PodiumRanklistProps = {
  entries: RankEntry[];
  currentReferrerId?: string | null;
  backMode?: "self" | "all";
  backTitle?: string;
};

function formatPoints(points: number) {
  return new Intl.NumberFormat("de-DE").format(points);
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "E";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function Avatar({ entry, size = "h-12 w-12" }: { entry: RankEntry; size?: string }) {
  if (entry.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={entry.avatarUrl}
        alt={entry.name}
        className={`${size} rounded-full border border-violet-200/90 object-cover shadow-[0_10px_24px_rgba(82,62,150,0.26)]`}
      />
    );
  }

  return (
    <span
      className={`${size} inline-flex items-center justify-center rounded-full border border-violet-200/90 bg-violet-100 text-xs font-semibold text-violet-700`}
    >
      {getInitials(entry.name)}
    </span>
  );
}

function PodiumPillar({
  rank,
  height,
  celebrate = false,
}: {
  rank: 1 | 2 | 3;
  height: number;
  celebrate?: boolean;
}) {
  return (
    <div
      className={`relative w-full max-w-[150px] overflow-hidden rounded-t-[1.3rem] rounded-b-[0.3rem] ${
        celebrate
          ? "bg-[linear-gradient(180deg,#ffe3a4_0%,#f4c456_38%,#cf9022_72%,#b57816_100%)] shadow-[0_16px_30px_rgba(194,138,35,0.34)]"
          : "bg-[linear-gradient(180deg,#ffd98d_0%,#eeb84c_40%,#c9861f_74%,#a96f14_100%)] shadow-[0_12px_24px_rgba(176,122,26,0.28)]"
      }`}
      style={{ height }}
    >
      <span className="pointer-events-none absolute inset-0 rounded-t-[1.3rem] rounded-b-[0.3rem] border border-amber-100/45" />
      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.42),rgba(255,255,255,0.06)_46%,transparent_76%)]" />
      <span className="pointer-events-none absolute inset-y-0 left-0 w-[22%] bg-[linear-gradient(90deg,rgba(255,246,224,0.26),transparent)]" />
      <span className="pointer-events-none absolute inset-y-0 right-0 w-[20%] bg-[linear-gradient(270deg,rgba(121,75,15,0.2),transparent)]" />
      <span
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none font-black ${
          celebrate ? "text-6xl text-amber-950/28" : "text-5xl text-amber-950/25"
        }`}
      >
        {rank}
      </span>
    </div>
  );
}

function PodiumSlot({
  entry,
  rank,
  pillarHeight,
  winner = false,
}: {
  entry: RankEntry;
  rank: 1 | 2 | 3;
  pillarHeight: number;
  winner?: boolean;
}) {
  return (
    <div className="relative flex flex-col items-center justify-end">
      <div className={`mb-3 flex flex-col items-center text-center ${winner ? "-translate-y-1" : ""}`}>
        <Avatar entry={entry} size={winner ? "h-16 w-16" : "h-12 w-12"} />
        <p className={`mt-2 max-w-[140px] truncate font-semibold text-amber-50 ${winner ? "text-lg" : "text-sm"}`}>
          {entry.name}
        </p>
        <p className={`font-semibold text-amber-200 ${winner ? "text-base" : "text-sm"}`}>
          {formatPoints(entry.points)} Punkte
        </p>
      </div>

      <PodiumPillar rank={rank} height={pillarHeight} celebrate={winner} />
      <span className="pointer-events-none absolute bottom-0 h-5 w-[84%] rounded-full bg-amber-500/22 blur-[8px]" />
    </div>
  );
}

export function PodiumRanklist({
  entries,
  currentReferrerId = null,
  backMode = "self",
  backTitle,
}: PodiumRanklistProps) {
  const [flipped, setFlipped] = useState(false);

  const top3 = entries.slice(0, 3);
  const myIndex = useMemo(
    () =>
      currentReferrerId
        ? entries.findIndex((entry) => entry.referrerId === currentReferrerId)
        : -1,
    [entries, currentReferrerId],
  );
  const myRank = myIndex >= 0 ? myIndex + 1 : null;
  const currentEntry = myIndex >= 0 ? entries[myIndex] : null;
  const nextEntry = myIndex > 0 ? entries[myIndex - 1] : null;
  const gapToNext =
    currentEntry && nextEntry
      ? Math.max(0, nextEntry.points - currentEntry.points + 1)
      : null;

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl bg-white/70 px-4 py-3 text-sm text-zinc-700 shadow-[0_10px_24px_rgba(86,64,138,0.12)]">
        Noch keine Ranglistendaten vorhanden.
      </div>
    );
  }

  const first = top3[0];
  const second = top3[1];
  const third = top3[2];

  return (
    <div className="perspective-[1600px]">
      <div
        className={`relative min-h-[360px] transition-transform duration-700 [transform-style:preserve-3d] ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        <div
          className={`absolute inset-0 [backface-visibility:hidden] ${
            flipped ? "pointer-events-none" : "pointer-events-auto"
          }`}
        >
          <section className="relative h-full overflow-hidden rounded-[1.8rem] bg-[radial-gradient(circle_at_50%_0%,rgba(244,198,106,0.24),transparent_46%),linear-gradient(165deg,#17120f_0%,#0f0b09_62%,#0b0806_100%)] px-3 pb-5 pt-4 shadow-[0_28px_62px_rgba(4,3,2,0.62)] md:px-5">
            <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,227,169,0.08),transparent_36%,rgba(0,0,0,0.42)_100%)]" />
            <span className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,210,128,0.03)_0px,rgba(255,210,128,0.03)_1px,transparent_1px,transparent_22px)]" />
            <div className="pointer-events-none absolute inset-x-2 bottom-0 h-10 bg-[linear-gradient(180deg,rgba(255,214,132,0.12),rgba(255,214,132,0.02))]" />

            <button
              type="button"
              onClick={() => setFlipped(true)}
              className="absolute right-3 top-3 z-40 inline-flex h-10 w-10 items-center justify-center rounded-full border border-amber-300/55 bg-amber-200/95 text-base text-amber-950 shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:bg-amber-100"
              title="Ansicht drehen"
              aria-label="Ranglisten-Details anzeigen"
            >
              {"\u21BB"}
            </button>

            <div className="relative z-30 mt-2 h-[286px]">
              <div className="absolute inset-x-2 bottom-1 h-2 rounded-full bg-amber-200/35" />

              <div className="relative grid h-full grid-cols-3 items-end gap-2 sm:gap-3">
                {second ? (
                  <PodiumSlot entry={second} rank={2} pillarHeight={102} />
                ) : (
                  <div />
                )}

                {first ? (
                  <PodiumSlot entry={first} rank={1} pillarHeight={152} winner />
                ) : (
                  <div />
                )}

                {third ? (
                  <PodiumSlot entry={third} rank={3} pillarHeight={88} />
                ) : (
                  <div />
                )}
              </div>
            </div>
          </section>
        </div>

        <div
          className={`absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] ${
            flipped ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          <section className="relative h-full overflow-hidden rounded-[1.8rem] bg-[radial-gradient(circle_at_50%_0%,rgba(244,198,106,0.2),transparent_45%),linear-gradient(165deg,#17120f_0%,#0f0b09_62%,#0b0806_100%)] p-4 shadow-[0_24px_52px_rgba(6,4,2,0.62)]">
            <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,227,169,0.08),transparent_36%,rgba(0,0,0,0.42)_100%)]" />
            <div className="relative z-30 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">
                {backTitle ?? (backMode === "all" ? "Alle Empfehler" : "Dein Rang")}
              </p>
              <button
                type="button"
                onClick={() => setFlipped(false)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-amber-300/55 bg-amber-200/95 text-lg text-amber-950 shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:bg-amber-100"
                title="Zurück"
                aria-label="Zur Rangliste zurück"
              >
                {"\u21BA"}
              </button>
            </div>

            {backMode === "all" ? (
              <div className="relative z-20 mt-3 rounded-2xl border border-amber-200/20 bg-zinc-900/65 p-2.5 shadow-[inset_0_1px_0_rgba(255,219,153,0.12)]">
                <div className="max-h-[238px] overflow-auto pr-1">
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 bg-zinc-900/90 text-left backdrop-blur">
                      <tr className="text-[11px] uppercase tracking-wide text-amber-200/80">
                        <th className="px-2 py-1.5">#</th>
                        <th className="px-2 py-1.5">Empfehler</th>
                        <th className="px-2 py-1.5 text-right">Punkte</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry, index) => (
                        <tr
                          key={entry.referrerId}
                          className="border-t border-amber-100/10 text-amber-50/95"
                        >
                          <td className="px-2 py-1.5 font-semibold text-amber-300">
                            {index + 1}
                          </td>
                          <td className="px-2 py-1.5">
                            <div className="flex items-center gap-2">
                              <Avatar entry={entry} size="h-6 w-6" />
                              <span className="truncate">{entry.name}</span>
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-right font-semibold text-amber-200">
                            {formatPoints(entry.points)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : myRank ? (
              <div className="relative z-20 mt-3 space-y-3">
                <div className="rounded-2xl border border-amber-200/20 bg-zinc-900/65 p-3 shadow-[inset_0_1px_0_rgba(255,219,153,0.12)]">
                  <p className="text-sm text-amber-100/80">Aktueller Platz</p>
                  <p className="mt-1 text-2xl font-semibold text-amber-50">#{myRank}</p>
                  <p className="mt-1 text-sm text-amber-300">
                    {formatPoints(currentEntry?.points ?? 0)} Gesamtpunkte
                  </p>
                </div>
                {myRank > 1 && gapToNext ? (
                  <div className="rounded-2xl border border-amber-200/20 bg-zinc-900/65 p-3 shadow-[inset_0_1px_0_rgba(255,219,153,0.12)]">
                    <p className="text-sm text-amber-100/80">Bis zum nächsten Platz fehlen</p>
                    <p className="mt-1 text-lg font-semibold text-amber-50">
                      {formatPoints(gapToNext)} Punkte
                    </p>
                    {nextEntry ? (
                      <p className="mt-1 text-xs text-amber-300/90">
                        Vor dir: #{myRank - 1} {nextEntry.name}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-amber-200/20 bg-zinc-900/65 p-3 text-sm text-amber-300 shadow-[inset_0_1px_0_rgba(255,219,153,0.12)]">
                    Du bist bereits in den Top-Plätzen.
                  </div>
                )}
              </div>
            ) : (
              <div className="relative z-20 mt-3 rounded-2xl border border-amber-200/20 bg-zinc-900/65 p-3 text-sm text-amber-300 shadow-[inset_0_1px_0_rgba(255,219,153,0.12)]">
                Dein Rang ist noch nicht verfügbar.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
