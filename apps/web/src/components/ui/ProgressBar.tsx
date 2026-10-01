type Props = Readonly<{ value: number; label: string; className?: string }>;

export function ProgressBar({ value, label, className }: Props) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`h-1 w-full overflow-hidden rounded-full bg-line/60 ${className ?? ""}`}
    >
      <div className="h-full rounded-full bg-brand-600" style={{ width: `${clamped}%` }} />
    </div>
  );
}
