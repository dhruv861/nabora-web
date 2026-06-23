'use client';

type VerificationLevel = 'NONE' | 'BRONZE' | 'SILVER' | 'GOLD';

interface VerificationBadgeProps {
  level: VerificationLevel;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const levelConfig: Record<VerificationLevel, { bg: string; text: string; label: string; icon: string }> = {
  NONE:   { bg: 'bg-neutral-200',  text: 'text-neutral-500', label: 'Unverified', icon: '○' },
  BRONZE: { bg: 'bg-amber-100',    text: 'text-amber-700',   label: 'Bronze',     icon: '🛡' },
  SILVER: { bg: 'bg-slate-200',    text: 'text-slate-700',   label: 'Silver',     icon: '🛡' },
  GOLD:   { bg: 'bg-yellow-100',   text: 'text-yellow-800',  label: 'Gold',       icon: '🛡' },
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
};

export function VerificationBadge({ level, showLabel = true, size = 'sm' }: VerificationBadgeProps) {
  if (level === 'NONE') return null;
  const { bg, text, label, icon } = levelConfig[level];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${bg} ${text} ${sizeClasses[size]}`}
      title={`${label} verified`}
    >
      <span>{icon}</span>
      {showLabel && <span>{label}</span>}
    </span>
  );
}
