'use client';

interface ReliabilityBarProps {
  score: number; // 0–100
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

function getColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-blue-500';
  if (score >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

function getLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Poor';
}

const heightClasses = { sm: 'h-1.5', md: 'h-2', lg: 'h-3' };

export function ReliabilityBar({ score, showLabel = true, size = 'sm' }: ReliabilityBarProps) {
  const pct = Math.min(100, Math.max(0, score));
  const color = getColor(pct);

  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 bg-[var(--color-neutral-200)] rounded-full overflow-hidden ${heightClasses[size]}`}>
        <div
          className={`${color} ${heightClasses[size]} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-[var(--color-neutral-600)] shrink-0 min-w-[3rem]">
          {pct.toFixed(0)}% · {getLabel(pct)}
        </span>
      )}
    </div>
  );
}
