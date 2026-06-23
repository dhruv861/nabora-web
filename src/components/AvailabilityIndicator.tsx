'use client';

type AvailabilityStatus = 'AVAILABLE_NOW' | 'AVAILABLE_THIS_WEEK' | 'BUSY' | 'UNAVAILABLE';

interface AvailabilityIndicatorProps {
  status: AvailabilityStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

const statusConfig: Record<AvailabilityStatus, { dot: string; label: string; text: string }> = {
  AVAILABLE_NOW:        { dot: 'bg-emerald-500 animate-pulse', label: 'Available Now',       text: 'text-emerald-700' },
  AVAILABLE_THIS_WEEK:  { dot: 'bg-blue-500',                  label: 'Available This Week',  text: 'text-blue-700' },
  BUSY:                 { dot: 'bg-amber-500',                  label: 'Busy',                 text: 'text-amber-700' },
  UNAVAILABLE:          { dot: 'bg-neutral-400',                label: 'Unavailable',          text: 'text-neutral-500' },
};

export function AvailabilityIndicator({ status, showLabel = true, size = 'sm' }: AvailabilityIndicatorProps) {
  const { dot, label, text } = statusConfig[status] ?? statusConfig.UNAVAILABLE;
  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <span className={`inline-flex items-center gap-1.5 ${text}`}>
      <span className={`${dotSize} rounded-full shrink-0 ${dot}`} />
      {showLabel && <span className={`font-medium ${textSize}`}>{label}</span>}
    </span>
  );
}
