type ProgressBarProps = {
  value: number;
};

export function ProgressBar({ value }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-orange-100/75 ring-1 ring-orange-300/35 shadow-[inset_0_1px_2px_rgba(249,115,22,0.1)]">
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_40%,rgba(255,255,255,0.08),transparent_36%)]" />
      <div
        className="relative h-full rounded-full bg-orange-600 shadow-[0_0_10px_rgba(139,92,246,0.35)] transition-all duration-500"
        style={{ width: `${clamped}%` }}
      >
        <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent" />
        <span className="absolute right-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-orange-100/90 shadow-[0_0_10px_rgba(249,115,22,0.55)]" />
      </div>
    </div>
  );
}
