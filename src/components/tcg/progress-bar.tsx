export function ProgressBar({
  value,
  max,
  done = false,
  className = "",
}: {
  value: number;
  max: number;
  done?: boolean;
  className?: string;
}) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-sea-deep/70 border border-gold/15 ${className}`}>
      <div
        className={`h-full rounded-full transition-[width] duration-1000 ease-out ${
          done ? "bg-gradient-to-r from-gold/70 to-gold" : "bg-gradient-primary"
        }`}
        style={{ width: `${Math.max(pct === 0 ? 0 : 4, pct)}%` }}
      />
    </div>
  );
}
