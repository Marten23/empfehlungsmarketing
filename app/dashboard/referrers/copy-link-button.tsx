"use client";

import { useState } from "react";

type CopyLinkButtonProps = {
  value: string;
};

export function CopyLinkButton({ value }: CopyLinkButtonProps) {
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
      className="rounded border border-zinc-300 bg-white px-3 py-1 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
    >
      {copied ? "Kopiert" : "Link kopieren"}
    </button>
  );
}
