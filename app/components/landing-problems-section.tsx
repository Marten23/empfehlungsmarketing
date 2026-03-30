"use client";

import { useMemo, useState } from "react";

type ProblemCategory = "Chaos" | "Kontrolle" | "Motivation" | "Umsatz";
type ProblemFilter = "Alle" | ProblemCategory;

type ProblemCard = {
  category: ProblemCategory;
  title: string;
  description: string;
  consequence: string;
  featured?: boolean;
};

const FILTERS: ProblemFilter[] = ["Alle", "Chaos", "Kontrolle", "Motivation", "Umsatz"];

const PROBLEMS: ProblemCard[] = [
  {
    category: "Chaos",
    title: "Empfehlungen versanden im Alltag",
    description:
      "Kontakte werden genannt, aber später nicht mehr sauber erfasst oder weiterverfolgt.",
    consequence: "Ergebnis: Gute Leads gehen verloren, bevor ein Gespräch überhaupt stattfindet.",
    featured: true,
  },
  {
    category: "Chaos",
    title: "Zu viele Kanäle, kein gemeinsamer Stand",
    description:
      "WhatsApp, Zuruf, Notizen und E-Mails laufen nebeneinander statt in einem klaren Prozess.",
    consequence: "Ergebnis: Niemand weiß sicher, was offen ist und was schon bearbeitet wurde.",
  },
  {
    category: "Kontrolle",
    title: "Kein klarer Überblick pro Kontakt",
    description:
      "Es bleibt unklar, wer wann wen empfohlen hat und in welchem Status sich der Kontakt befindet.",
    consequence: "Ergebnis: Rückfragen, Unsicherheit und unnötiger Abstimmungsaufwand.",
  },
  {
    category: "Kontrolle",
    title: "Konflikte bei Prämien-Zuordnung",
    description: "Mehrere Empfehler beanspruchen denselben Kontakt ohne transparente Regelung.",
    consequence: "Ergebnis: Diskussionen statt Vertrauen im Netzwerk.",
  },
  {
    category: "Motivation",
    title: "Belohnungen wirken zufällig oder verspätet",
    description: "Empfehler sehen ihren Fortschritt nicht klar und erhalten Feedback oft zu spät.",
    consequence: "Ergebnis: Das Engagement sinkt, obwohl Potenzial vorhanden wäre.",
  },
  {
    category: "Motivation",
    title: "Top-Empfehler bleiben unsichtbar",
    description:
      "Wer konstant gute Empfehlungen liefert, wird im Tagesgeschäft nicht gezielt erkannt.",
    consequence: "Ergebnis: Wiederholung und langfristige Motivation brechen weg.",
  },
  {
    category: "Umsatz",
    title: "Manuelle Nachverfolgung kostet Zeit",
    description:
      "Statt Abschlussgesprächen dominiert Administration: Nachfragen, Listen, Status-Nachpflege.",
    consequence: "Ergebnis: Zeitverlust im Team und weniger Fokus auf Vertrieb.",
  },
  {
    category: "Umsatz",
    title: "Wertvolle Empfehlungen bleiben ungenutzt",
    description:
      "Ohne transparenten Prozess werden Chancen nicht konsequent entwickelt und abgeschlossen.",
    consequence: "Ergebnis: Messbarer Umsatzverlust trotz bestehendem Netzwerk.",
  },
];

export function LandingProblemsSection() {
  const [activeFilter, setActiveFilter] = useState<ProblemFilter>("Alle");

  const visibleProblems = useMemo(() => {
    if (activeFilter === "Alle") return PROBLEMS;
    return PROBLEMS.filter((problem) => problem.category === activeFilter);
  }, [activeFilter]);

  return (
    <section
      id="probleme"
      className="relative z-10 rounded-3xl border border-zinc-200/85 bg-white/95 p-6 shadow-[0_20px_44px_rgba(15,23,42,0.1)] scroll-mt-28"
    >
      <div className="max-w-3xl">
        <h2 className="text-2xl font-semibold text-zinc-900 md:text-3xl">
          Typische Probleme im Empfehlungsprozess
        </h2>
        <p className="mt-2 text-sm text-zinc-700 md:text-base">
          Warum Empfehlungen ohne System im Alltag verloren gehen
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const isActive = filter === activeFilter;
          return (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                isActive
                  ? "border-orange-500 bg-orange-500 text-white shadow-[0_10px_18px_rgba(249,115,22,0.28)]"
                  : "border-zinc-300 bg-white text-zinc-700 hover:border-orange-300 hover:text-orange-700"
              }`}
            >
              {filter}
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleProblems.map((problem, index) => {
          const featured = problem.featured && activeFilter === "Alle" && index === 0;
          const cardClass = featured
            ? "xl:col-span-2 border-zinc-800/90 bg-gradient-to-br from-zinc-900 to-zinc-800 text-white shadow-[0_20px_42px_rgba(15,23,42,0.28)]"
            : problem.category === "Umsatz"
              ? "border-zinc-900/15 bg-zinc-50 text-zinc-900 shadow-[0_14px_30px_rgba(15,23,42,0.08)]"
              : problem.category === "Motivation"
                ? "border-orange-200/75 bg-orange-50/60 text-zinc-900 shadow-[0_14px_30px_rgba(249,115,22,0.11)]"
                : "border-zinc-200/85 bg-white text-zinc-900 shadow-[0_14px_30px_rgba(15,23,42,0.08)]";

          return (
            <article
              key={problem.title}
              className={`rounded-2xl border p-5 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-orange-300/70 hover:shadow-[0_22px_38px_rgba(249,115,22,0.16)] ${cardClass}`}
            >
              <p
                className={`inline-flex rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                  featured ? "bg-orange-400/20 text-orange-200" : "bg-orange-100 text-orange-800"
                }`}
              >
                {problem.category}
              </p>
              <h3 className={`mt-3 text-base font-semibold ${featured ? "text-white" : "text-zinc-900"}`}>
                {problem.title}
              </h3>
              <p className={`mt-2 text-sm leading-relaxed ${featured ? "text-zinc-200" : "text-zinc-700"}`}>
                {problem.description}
              </p>
              <p className={`mt-2 text-xs font-medium leading-relaxed ${featured ? "text-orange-100" : "text-zinc-700"}`}>
                {problem.consequence}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
