"use client";

import { useState } from "react";

type SurveyOptionsBuilderProps = {
  inputClass: string;
};

export function SurveyOptionsBuilder({ inputClass }: SurveyOptionsBuilderProps) {
  const [rows, setRows] = useState<string[]>(["", ""]);

  function addRow() {
    setRows((current) => [...current, ""]);
  }

  function removeRow(index: number) {
    setRows((current) => current.filter((_, idx) => idx !== index));
  }

  return (
    <div className="mt-2 space-y-2">
      <p className="text-[11px] text-zinc-600">
        Eigene Optionen hinzufügen. Jede Zeile entspricht genau einer Auswahlmöglichkeit.
      </p>
      <div className="space-y-2">
        {rows.map((_, index) => (
          <div key={`custom-option-${index}`} className="flex items-center gap-2">
            <input
              name="survey_custom_options[]"
              className={inputClass}
              placeholder={`Option ${index + 1}`}
            />
            {rows.length > 1 ? (
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="rounded-lg border border-orange-300/55 bg-white px-2.5 py-1.5 text-xs font-semibold text-orange-800 transition hover:bg-orange-50"
              >
                Entfernen
              </button>
            ) : null}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addRow}
        className="inline-flex items-center gap-1.5 rounded-lg border border-orange-300/55 bg-white px-2.5 py-1.5 text-xs font-semibold text-orange-800 transition hover:bg-orange-50"
      >
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-orange-300/65 text-[11px]">
          +
        </span>
        Option hinzufügen
      </button>
    </div>
  );
}

