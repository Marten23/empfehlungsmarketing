"use client";

import { useMemo, useState } from "react";

type WelcomeTextFieldProps = {
  name: string;
  defaultValue: string;
  maxLength: number;
  label: string;
  placeholder?: string;
  rows?: number;
};

export function WelcomeTextField({
  name,
  defaultValue,
  maxLength,
  label,
  placeholder,
  rows = 2,
}: WelcomeTextFieldProps) {
  const [value, setValue] = useState(defaultValue);
  const remaining = useMemo(() => Math.max(0, maxLength - value.length), [maxLength, value.length]);

  return (
    <label className="grid gap-1 text-sm text-zinc-700">
      {label}
      <textarea
        name={name}
        value={value}
        maxLength={maxLength}
        rows={rows}
        onChange={(event) => setValue(event.target.value)}
        className="rounded-xl border border-orange-300/55 bg-white px-3 py-2 text-sm text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition-all duration-300 hover:border-orange-400/70 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200/80"
        placeholder={placeholder}
      />
      <span className="text-xs text-zinc-500">
        {value.length}/{maxLength} Zeichen • noch {remaining}
      </span>
    </label>
  );
}
