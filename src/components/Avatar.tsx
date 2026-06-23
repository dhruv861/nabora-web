'use client';

import Image from 'next/image';
import React from 'react';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
type VerificationLevel = 'NONE' | 'BRONZE' | 'SILVER' | 'GOLD';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: AvatarSize;
  verificationLevel?: VerificationLevel;
  className?: string;
}

const sizeMap: Record<AvatarSize, { px: number; textClass: string; badgeClass: string }> = {
  xs:  { px: 24,  textClass: 'text-[10px]', badgeClass: 'w-3 h-3 text-[6px]' },
  sm:  { px: 32,  textClass: 'text-xs',     badgeClass: 'w-3.5 h-3.5 text-[7px]' },
  md:  { px: 40,  textClass: 'text-sm',     badgeClass: 'w-4 h-4 text-[8px]' },
  lg:  { px: 56,  textClass: 'text-base',   badgeClass: 'w-5 h-5 text-[9px]' },
  xl:  { px: 72,  textClass: 'text-xl',     badgeClass: 'w-6 h-6 text-[10px]' },
  '2xl': { px: 96, textClass: 'text-2xl',  badgeClass: 'w-7 h-7 text-xs' },
};

const verificationColors: Record<VerificationLevel, string> = {
  NONE:   '',
  BRONZE: 'bg-amber-600 text-white',
  SILVER: 'bg-slate-400 text-white',
  GOLD:   'bg-yellow-400 text-yellow-900',
};

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export function Avatar({ src, name, size = 'md', verificationLevel = 'NONE', className = '' }: AvatarProps) {
  const { px, textClass, badgeClass } = sizeMap[size];

  return (
    <div className={`relative inline-block shrink-0 ${className}`} style={{ width: px, height: px }}>
      {src ? (
        <Image
          src={src}
          alt={name ?? 'Avatar'}
          width={px}
          height={px}
          className="rounded-full object-cover w-full h-full"
        />
      ) : (
        <div
          className={`w-full h-full rounded-full bg-[var(--color-primary-100)] text-[var(--color-primary-600)] flex items-center justify-center font-semibold ${textClass}`}
        >
          {getInitials(name)}
        </div>
      )}

      {verificationLevel !== 'NONE' && (
        <span
          className={`absolute bottom-0 right-0 rounded-full flex items-center justify-center font-bold ${badgeClass} ${verificationColors[verificationLevel]}`}
          title={`${verificationLevel} verified`}
        >
          ✓
        </span>
      )}
    </div>
  );
}
