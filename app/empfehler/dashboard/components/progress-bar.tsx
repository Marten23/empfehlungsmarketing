type ProgressBarProps = {
  value: number;
};

export function ProgressBar({ value }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-200">
      <div
        className="h-full rounded-full bg-zinc-900 transition-all"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
