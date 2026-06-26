'use client';

interface SkillChipProps {
  label?: string;
  name?: string;
  slug?: string;
  size?: string;
  variant?: 'default' | 'selected' | 'removable';
  onClick?: () => void;
  onRemove?: () => void;
}

export function SkillChip({ label, name, variant = 'default', onClick, onRemove }: SkillChipProps) {
  const displayLabel = label || name || '';
  const baseClasses =
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 select-none';

  const variantClasses = {
    default:
      'bg-[var(--color-neutral-100)] text-[var(--color-neutral-700)] hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary-600)] cursor-pointer',
    selected:
      'bg-[var(--color-primary-100)] text-[var(--color-primary-700)] border border-[var(--color-primary-300)] cursor-pointer',
    removable:
      'bg-[var(--color-primary-100)] text-[var(--color-primary-700)] border border-[var(--color-primary-300)]',
  };

  return (
    <span
      className={`${baseClasses} ${variantClasses[variant]}`}
      onClick={variant !== 'removable' ? onClick : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onClick();
            }
          : undefined
      }
    >
      {variant === 'selected' && (
        <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M12.707 3.293a1 1 0 0 1 0 1.414l-7 7a1 1 0 0 1-1.414 0l-3-3a1 1 0 0 1 1.414-1.414L5 9.586l6.293-6.293a1 1 0 0 1 1.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
      {displayLabel}
      {variant === 'removable' && onRemove && (
        <button
          onClick={onRemove}
          className="ml-0.5 rounded-full hover:bg-[var(--color-primary-200)] p-0.5 transition-colors"
          aria-label={`Remove ${displayLabel}`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="currentColor">
            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </span>
  );
}
