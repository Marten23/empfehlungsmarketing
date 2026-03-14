"use client";

import { useState } from "react";

type CopyLinkButtonProps = {
  value: string;
  className?: string;
};

export function CopyLinkButton({ value, className }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className={
        className ??
        "rounded border border-zinc-300 bg-white px-3 py-1 text-xs font-medium text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-zinc-50 hover:shadow-[0_8px_20px_rgba(0,0,0,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
      }
    >
      {copied ? "Kopiert" : "Link kopieren"}
    </button>
  );
}
