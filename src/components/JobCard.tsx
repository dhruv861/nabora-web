'use client';

import React from 'react';
import Link from 'next/link';
import { Bookmark, BookmarkCheck, MapPin, Calendar, Banknote, CheckCircle2, Users } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface JobCardJob {
  id: string;
  slug: string;
  title: string;
  citySlug: string;
  categorySlug: string;
  area: string;
  city: string;
  workDate: string;
  payRate: number;
  payUnit: string;
  isFeatured: boolean;
  organizationName?: string;
  organizationLogo?: string;
  organizationVerified?: boolean;
  distanceKm?: number;
  skills?: { name: string; slug: string }[];
  status: string;
  vacancies?: number;
  expiresAt?: string;
}

export interface JobCardProps {
  job: JobCardJob;
  isApplied?: boolean;
  isSaved?: boolean;
  onSave?: (jobId: string) => void;
  onApply?: (jobId: string) => void;
  variant?: 'default' | 'compact' | 'skeleton';
}

// ─── Distance Helpers ────────────────────────────────────────────────────────

function getDistanceColor(km: number): string {
  if (km <= 5)  return 'text-emerald-600';
  if (km <= 15) return 'text-slate-600';
  return 'text-slate-400';
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m away`;
  return `${km.toFixed(1)}km away`;
}

function formatPayUnit(unit: string): string {
  switch (unit) {
    case 'HOUR':  return '/hr';
    case 'DAY':   return '/day';
    case 'FIXED': return ' fixed';
    default:      return '';
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function JobCardSkeleton() {
  return (
    <div className="job-card animate-pulse" aria-hidden="true">
      <div className="h-4 bg-slate-200 rounded w-3/4 mb-3" />
      <div className="h-3 bg-slate-200 rounded w-1/2 mb-4" />
      <div className="flex gap-2 mb-3">
        <div className="h-3 bg-slate-200 rounded w-20" />
        <div className="h-3 bg-slate-200 rounded w-24" />
        <div className="h-3 bg-slate-200 rounded w-16" />
      </div>
      <div className="flex justify-between items-center mt-4">
        <div className="h-6 bg-slate-200 rounded w-24" />
        <div className="h-8 bg-slate-200 rounded w-20" />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function JobCard({ job, isApplied, isSaved, onSave, onApply, variant = 'default' }: JobCardProps) {
  if (variant === 'skeleton') return <JobCardSkeleton />;

  const isExpired = job.status === 'EXPIRED' || job.status === 'DELETED'
    || (job.expiresAt && new Date(job.expiresAt) < new Date());

  const jobUrl = `/jobs/${job.citySlug}/${job.categorySlug}/${job.slug}`;

  const cardClass = [
    'job-card',
    isExpired     ? 'job-card--expired'  : '',
    job.isFeatured ? 'job-card--featured' : '',
    isApplied     ? 'job-card--applied'  : '',
  ].filter(Boolean).join(' ');

  return (
    <article className={cardClass} id={`job-card-${job.id}`}>
      {/* Header row */}
      <div className="job-card__header">
        <div className="job-card__meta">
          {job.organizationName && (
            <div className="job-card__org">
              {job.organizationLogo && (
                <img
                  src={job.organizationLogo}
                  alt={job.organizationName}
                  className="job-card__org-logo"
                  width={20}
                  height={20}
                />
              )}
              <span className="job-card__org-name">{job.organizationName}</span>
              {job.organizationVerified && (
                <CheckCircle2 size={12} className="text-blue-500" aria-label="Verified" />
              )}
            </div>
          )}
          {job.isFeatured && (
            <span className="badge badge--featured">Featured</span>
          )}
          {isApplied && (
            <span className="badge badge--applied">Applied ✓</span>
          )}
          {isExpired && (
            <span className="badge badge--expired">Expired</span>
          )}
        </div>

        {/* Save button */}
        {!isExpired && onSave && (
          <button
            id={`save-job-${job.id}`}
            onClick={() => onSave(job.id)}
            className="job-card__save-btn"
            aria-label={isSaved ? 'Unsave job' : 'Save job'}
          >
            {isSaved
              ? <BookmarkCheck size={18} className="text-primary-500" />
              : <Bookmark size={18} className="text-slate-400" />
            }
          </button>
        )}
      </div>

      {/* Title */}
      <Link href={jobUrl} className="job-card__title-link">
        <h3 className={`job-card__title ${isExpired ? 'text-slate-400' : ''}`}>
          {job.title}
        </h3>
      </Link>

      {/* Info pills */}
      <div className="job-card__info">
        <span className="job-card__info-item">
          <MapPin size={13} className="inline mr-1" />
          {job.area}
          {job.distanceKm !== undefined && (
            <span className={`ml-1 ${getDistanceColor(job.distanceKm)}`}>
              · {formatDistance(job.distanceKm)}
            </span>
          )}
        </span>

        <span className="job-card__info-item">
          <Calendar size={13} className="inline mr-1" />
          {formatDate(job.workDate)}
        </span>

        {job.vacancies !== undefined && job.vacancies > 0 && (
          <span className="job-card__info-item">
            <Users size={13} className="inline mr-1" />
            {job.vacancies} open
          </span>
        )}
      </div>

      {/* Skills */}
      {job.skills && job.skills.length > 0 && (
        <div className="job-card__skills">
          {job.skills.slice(0, 3).map((s) => (
            <span key={s.slug} className="badge badge--skill">{s.name}</span>
          ))}
          {job.skills.length > 3 && (
            <span className="badge badge--skill">+{job.skills.length - 3}</span>
          )}
        </div>
      )}

      {/* Footer — pay + CTA */}
      <div className="job-card__footer">
        <div className="job-card__pay">
          <Banknote size={15} className="inline mr-1 text-slate-400" />
          <span className="job-card__pay-amount">₹{job.payRate.toLocaleString('en-IN')}</span>
          <span className="job-card__pay-unit">{formatPayUnit(job.payUnit)}</span>
        </div>

        {!isExpired && (
          isApplied ? (
            <span className="btn btn--sm btn--ghost btn--applied-state" aria-disabled="true">
              Applied ✓
            </span>
          ) : (
            <button
              id={`apply-job-${job.id}`}
              onClick={() => onApply?.(job.id)}
              className="btn btn--sm btn--primary"
            >
              Apply Now
            </button>
          )
        )}

        {isExpired && (
          <span className="btn btn--sm btn--ghost" aria-disabled="true">Position Filled</span>
        )}
      </div>
    </article>
  );
}
