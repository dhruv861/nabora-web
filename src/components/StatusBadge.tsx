'use client';

type StatusBadgeVariant =
  | 'AVAILABLE_NOW'
  | 'AVAILABLE_THIS_WEEK'
  | 'BUSY'
  | 'UNAVAILABLE'
  | 'PUBLISHED'
  | 'DRAFT'
  | 'CLOSED'
  | 'EXPIRED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'PENDING'
  | 'HIRED'
  | 'SHORTLISTED'
  | 'REJECTED'
  | 'OPEN'
  | 'UNDER_REVIEW'
  | 'RESOLVED';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { bg: string; text: string; dot: string; label?: string }> = {
  AVAILABLE_NOW:        { bg: 'bg-emerald-50',   text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Available Now' },
  AVAILABLE_THIS_WEEK:  { bg: 'bg-blue-50',      text: 'text-blue-700',   dot: 'bg-blue-500',    label: 'Available This Week' },
  BUSY:                 { bg: 'bg-amber-50',      text: 'text-amber-700',  dot: 'bg-amber-500' },
  UNAVAILABLE:          { bg: 'bg-neutral-100',   text: 'text-neutral-600',dot: 'bg-neutral-400' },
  PUBLISHED:            { bg: 'bg-emerald-50',    text: 'text-emerald-700',dot: 'bg-emerald-500' },
  DRAFT:                { bg: 'bg-neutral-100',   text: 'text-neutral-600',dot: 'bg-neutral-400' },
  CLOSED:               { bg: 'bg-red-50',        text: 'text-red-700',    dot: 'bg-red-500' },
  EXPIRED:              { bg: 'bg-orange-50',     text: 'text-orange-700', dot: 'bg-orange-500' },
  DELETED:              { bg: 'bg-neutral-100',   text: 'text-neutral-500',dot: 'bg-neutral-400' },
  ACTIVE:               { bg: 'bg-emerald-50',    text: 'text-emerald-700',dot: 'bg-emerald-500' },
  COMPLETED:            { bg: 'bg-blue-50',       text: 'text-blue-700',   dot: 'bg-blue-500' },
  CANCELLED:            { bg: 'bg-red-50',        text: 'text-red-700',    dot: 'bg-red-500' },
  PENDING:              { bg: 'bg-amber-50',      text: 'text-amber-700',  dot: 'bg-amber-500' },
  HIRED:                { bg: 'bg-emerald-50',    text: 'text-emerald-700',dot: 'bg-emerald-500' },
  SHORTLISTED:          { bg: 'bg-blue-50',       text: 'text-blue-700',   dot: 'bg-blue-500' },
  REJECTED:             { bg: 'bg-red-50',        text: 'text-red-700',    dot: 'bg-red-500' },
  WITHDRAWN:            { bg: 'bg-neutral-100',   text: 'text-neutral-600',dot: 'bg-neutral-400' },
  OPEN:                 { bg: 'bg-orange-50',     text: 'text-orange-700', dot: 'bg-orange-500' },
  UNDER_REVIEW:         { bg: 'bg-amber-50',      text: 'text-amber-700',  dot: 'bg-amber-500', label: 'Under Review' },
  RESOLVED:             { bg: 'bg-emerald-50',    text: 'text-emerald-700',dot: 'bg-emerald-500' },
  DISPUTED:             { bg: 'bg-red-50',        text: 'text-red-700',    dot: 'bg-red-500' },
  PAID:                 { bg: 'bg-emerald-50',    text: 'text-emerald-700',dot: 'bg-emerald-500' },
  PARTIALLY_PAID:       { bg: 'bg-amber-50',      text: 'text-amber-700',  dot: 'bg-amber-500', label: 'Partially Paid' },
};

function toLabel(status: string): string {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    bg: 'bg-neutral-100',
    text: 'text-neutral-600',
    dot: 'bg-neutral-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
      {config.label ?? toLabel(status)}
    </span>
  );
}
