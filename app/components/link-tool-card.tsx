import type { ComponentType, SVGProps } from "react";
import { CopyLinkButton } from "@/app/dashboard/referrers/copy-link-button";

type LinkToolCardProps = {
  title: string;
  audienceLabel: string;
  helperText: string;
  link: string;
  code: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

export function LinkToolCard({
  title,
  audienceLabel,
  helperText,
  link,
  code,
  icon: Icon,
}: LinkToolCardProps) {
  return (
    <article className="rounded-2xl border border-violet-200/60 bg-violet-50/78 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-900">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-violet-300/45 bg-violet-100 text-violet-700">
              <Icon className="h-4 w-4" />
            </span>
            {title}
          </p>
          <p className="mt-1 text-xs text-zinc-600">{audienceLabel}</p>
        </div>
        <span className="rounded-full border border-violet-300/55 bg-violet-100/80 px-2.5 py-1 text-[11px] font-semibold text-violet-800">
          Ihr persönlicher Link
        </span>
      </div>

      <p className="mt-3 text-xs text-zinc-600">{helperText}</p>

      <div className="mt-3 rounded-xl border border-violet-200/70 bg-white/88 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
        <p className="text-[11px] uppercase tracking-wide text-zinc-500">Link</p>
        <p className="mt-1 break-all font-mono text-xs text-zinc-800">{link}</p>
      </div>

      <div className="mt-2 rounded-xl border border-violet-200/70 bg-white/88 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
          Ihr persönlicher Einladungscode
        </p>
        <p className="mt-1 inline-flex rounded-md border border-violet-200/80 bg-violet-50 px-2 py-1 font-mono text-xs font-semibold text-violet-800">
          {code}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <CopyLinkButton
          value={link}
          idleLabel="Link kopieren"
          copiedLabel="Link kopiert"
          className="rounded border border-violet-300/55 bg-white px-3 py-1 text-xs font-medium text-violet-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-violet-100 hover:text-violet-900 hover:ring-1 hover:ring-violet-400/70 hover:shadow-[0_12px_22px_rgba(76,29,149,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        />      </div>
    </article>
  );
}


