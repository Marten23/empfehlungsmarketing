"use client";

import { useState } from "react";
import { SurveyOptionsBuilder } from "@/app/berater/praemien/survey-options-builder";

type RewardOption = {
  id: string;
  title: string;
};

type SurveyCreateFormProps = {
  rewards: RewardOption[];
  inputClass: string;
  primaryButtonClass: string;
  createRewardSurveyAction: (formData: FormData) => void | Promise<void>;
};

export function SurveyCreateForm({
  rewards,
  inputClass,
  primaryButtonClass,
  createRewardSurveyAction,
}: SurveyCreateFormProps) {
  const [surveyType, setSurveyType] = useState<"preset" | "open_budget">("preset");

  return (
    <form action={createRewardSurveyAction} className="grid gap-2 rounded-xl border border-orange-200/70 bg-orange-50/65 p-3">
      <label className="flex flex-col gap-1 text-xs text-zinc-600">
        Titel der Umfrage
        <input
          required
          name="survey_title"
          placeholder="z. B. Welche Prämie wünschen Sie sich als Nächstes?"
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-zinc-600">
        Kurzer Hinweistext (optional)
        <textarea
          name="survey_description"
          rows={2}
          className={inputClass}
          placeholder="Kurze Erklärung für Ihre Empfehler."
        />
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-zinc-600">
          Umfragetyp
          <select
            name="survey_type"
            value={surveyType}
            onChange={(event) =>
              setSurveyType(event.target.value === "open_budget" ? "open_budget" : "preset")
            }
            className={inputClass}
          >
            <option value="preset">Vorgegebene Auswahl</option>
            <option value="open_budget">Freie Vorschläge mit Preislimit</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-600">
          Budgetlimit in € (nur freie Variante)
          <input
            type="number"
            min={1}
            name="budget_limit_eur"
            className={inputClass}
            disabled={surveyType !== "open_budget"}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs text-zinc-600">
        Enddatum (optional)
        <input type="datetime-local" name="survey_ends_at" className={inputClass} />
      </label>

      {surveyType === "preset" ? (
        <div className="rounded-lg border border-orange-200/70 bg-white/80 p-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
            Variante A: Vorgegebene Optionen
          </p>
          <p className="mt-1 text-[11px] text-zinc-600">
            Wählen Sie bestehende Prämien als Abstimmungsoptionen.
          </p>
          <div className="mt-2 grid gap-1 sm:grid-cols-2">
            {rewards.map((reward) => (
              <label key={reward.id} className="inline-flex items-center gap-2 text-xs text-zinc-700">
                <input type="checkbox" name="survey_reward_ids" value={reward.id} />
                <span>{reward.title}</span>
              </label>
            ))}
            {rewards.length === 0 ? (
              <p className="text-xs text-zinc-500">Noch keine Prämien vorhanden.</p>
            ) : null}
          </div>
          <SurveyOptionsBuilder inputClass={inputClass} />
        </div>
      ) : (
        <div className="rounded-lg border border-orange-200/70 bg-white/80 p-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
            Variante B: Freie Vorschläge
          </p>
          <p className="mt-1 text-[11px] text-zinc-600">
            Empfehler geben eigene Wunschprämien ein. Die Auswahlfelder sind in dieser Variante deaktiviert.
          </p>
        </div>
      )}

      <button type="submit" className={primaryButtonClass}>
        Umfrage speichern
      </button>
    </form>
  );
}
