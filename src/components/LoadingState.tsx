'use client';

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <span className="w-8 h-8 border-3 border-[var(--color-primary-500)] border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
      <p className="text-sm text-[var(--color-neutral-500)]">{message}</p>
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-[var(--color-neutral-200)] via-[var(--color-neutral-100)] to-[var(--color-neutral-200)] bg-[length:200%_100%] rounded-lg ${className}`}
      style={{
        animationName: 'shimmer',
        animationDuration: '1.5s',
        animationTimingFunction: 'linear',
        animationIterationCount: 'infinite',
      }}
    />
  );
}

export function InlineSpinner({ size = 16 }: { size?: number }) {
  return (
    <span
      className="inline-block rounded-full border-2 border-current border-t-transparent animate-spin"
      style={{ width: size, height: size }}
    />
  );
}
