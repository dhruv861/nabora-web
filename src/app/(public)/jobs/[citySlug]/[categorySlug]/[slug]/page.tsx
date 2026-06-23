import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Calendar, Banknote, Users, ArrowLeft, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { SkillChip } from '@/components/SkillChip';
import { JobActionSection } from '@/components/JobActionSection';

interface JobPageParams {
  params: Promise<{ citySlug: string; categorySlug: string; slug: string }>;
}

async function fetchJobBySlug(citySlug: string, categorySlug: string, slug: string) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1';
    const res = await fetch(`${apiUrl}/jobs/${citySlug}/${categorySlug}/${slug}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = await res.json() as { data: any };
    return json.data;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: JobPageParams): Promise<Metadata> {
  const { citySlug, categorySlug, slug } = await params;
  const job = await fetchJobBySlug(citySlug, categorySlug, slug);
  if (!job) {
    return { title: 'Job Not Found' };
  }

  const title = `${job.title} — Jobs in ${job.city}`;
  const orgName = job.organization?.name || 'Nabora Employer';
  const description =
    job.description?.slice(0, 160) ??
    `Apply for ${job.title} at ${orgName} in ${job.city}. Pay: ₹${job.payRate}/${job.payUnit.toLowerCase()}. Join Nabora hyperlocal marketplace.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: job.organization?.logoUrl ? [{ url: job.organization.logoUrl }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function JobDetailPage({ params }: JobPageParams) {
  const { citySlug, categorySlug, slug } = await params;
  const job = await fetchJobBySlug(citySlug, categorySlug, slug);

  if (!job || job.status === 'DELETED') {
    notFound();
  }

  const isExpired = job.status === 'EXPIRED' || (job.expiresAt && new Date(job.expiresAt) < new Date());
  const orgName = job.organization?.name || 'Nabora Employer';
  const orgLogo = job.organization?.logoUrl;
  const orgVerified = job.organization?.isVerified;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatPayUnit = (unit: string) => {
    switch (unit) {
      case 'HOUR':
        return 'per hour';
      case 'DAY':
        return 'per day';
      case 'FIXED':
        return 'fixed pay';
      default:
        return '';
    }
  };

  // JSON-LD JobPosting Structured Data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    datePosted: job.createdAt,
    validThrough: job.expiresAt ?? undefined,
    employmentType: 'PART_TIME',
    hiringOrganization: {
      '@type': 'Organization',
      name: orgName,
      logo: orgLogo ?? undefined,
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: job.city,
        addressRegion: 'Gujarat',
        addressCountry: 'IN',
      },
    },
    baseSalary: {
      '@type': 'MonetaryAmount',
      currency: 'INR',
      value: {
        '@type': 'QuantitativeValue',
        value: job.payRate,
        unitText: job.payUnit,
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="min-h-screen bg-[var(--color-neutral-50)] pb-20">
        {/* Sticky Mobile Back Header */}
        <header className="sticky top-0 bg-white border-b border-[var(--color-neutral-200)] shadow-sm z-20 px-4 py-3 flex items-center gap-3">
          <Link
            href="/feed"
            className="p-1.5 rounded-xl hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] transition"
          >
            <ArrowLeft size={20} />
          </Link>
          <span className="font-bold text-sm text-[var(--color-neutral-800)] truncate">Job Details</span>
        </header>

        {/* Content Container */}
        <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
          {/* Expired Job Alert */}
          {isExpired && (
            <div className="p-4 bg-[var(--color-error-50)] border border-[var(--color-error-200)] text-[var(--color-error-700)] rounded-2xl flex items-start gap-3">
              <ShieldAlert className="shrink-0 mt-0.5" size={18} />
              <div className="text-xs">
                <span className="font-bold block mb-0.5">This job has expired</span>
                Applications are no longer accepted. View other open jobs near you.
              </div>
            </div>
          )}

          {/* Job Main Card */}
          <div className="bg-white border border-[var(--color-neutral-200)] rounded-3xl p-5 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-start gap-4">
              <div className="flex flex-col gap-1">
                {job.isFeatured && (
                  <span className="badge badge--featured self-start mb-1 text-[10px] uppercase font-bold tracking-wider">
                    Featured Job
                  </span>
                )}
                <h1 className="text-xl font-extrabold text-[var(--color-neutral-900)] leading-snug">
                  {job.title}
                </h1>
                <div className="flex items-center gap-1.5 mt-1 text-sm font-semibold text-[var(--color-neutral-800)]">
                  <span>{orgName}</span>
                  {orgVerified && (
                    <CheckCircle2 size={14} className="text-blue-500" aria-label="Verified Employer" />
                  )}
                </div>
              </div>

              {orgLogo && (
                <img
                  src={orgLogo}
                  alt={orgName}
                  className="w-12 h-12 rounded-xl object-cover border border-[var(--color-neutral-200)] shadow-sm"
                />
              )}
            </div>

            {/* Quick Specs Grid */}
            <div className="grid grid-cols-2 gap-3 mt-2 border-t border-[var(--color-neutral-100)] pt-4">
              <div className="flex items-center gap-2.5 text-xs text-[var(--color-neutral-600)]">
                <div className="p-2 bg-[var(--color-neutral-50)] rounded-xl border border-[var(--color-neutral-200)] text-[var(--color-primary-500)]">
                  <Banknote size={16} />
                </div>
                <div>
                  <span className="block font-bold text-[var(--color-neutral-900)]">
                    ₹{job.payRate.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-[var(--color-neutral-400)] font-medium">
                    {formatPayUnit(job.payUnit)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-xs text-[var(--color-neutral-600)]">
                <div className="p-2 bg-[var(--color-neutral-50)] rounded-xl border border-[var(--color-neutral-200)] text-[var(--color-primary-500)]">
                  <Calendar size={16} />
                </div>
                <div>
                  <span className="block font-bold text-[var(--color-neutral-900)]">
                    {new Date(job.workDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                  <span className="text-[10px] text-[var(--color-neutral-400)] font-medium">Work Date</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-xs text-[var(--color-neutral-600)]">
                <div className="p-2 bg-[var(--color-neutral-50)] rounded-xl border border-[var(--color-neutral-200)] text-[var(--color-primary-500)]">
                  <MapPin size={16} />
                </div>
                <div>
                  <span className="block font-bold text-[var(--color-neutral-900)] truncate max-w-[150px]">
                    {job.area}
                  </span>
                  <span className="text-[10px] text-[var(--color-neutral-400)] font-medium">{job.city}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-xs text-[var(--color-neutral-600)]">
                <div className="p-2 bg-[var(--color-neutral-50)] rounded-xl border border-[var(--color-neutral-200)] text-[var(--color-primary-500)]">
                  <Users size={16} />
                </div>
                <div>
                  <span className="block font-bold text-[var(--color-neutral-900)]">
                    {job.vacancies || 1} position{job.vacancies !== 1 ? 's' : ''}
                  </span>
                  <span className="text-[10px] text-[var(--color-neutral-400)] font-medium">Openings</span>
                </div>
              </div>
            </div>

            {/* Action Bar wrapper */}
            <div className="border-t border-[var(--color-neutral-100)] pt-4 mt-1">
              <JobActionSection
                jobId={job.id}
                posterId={job.posterId}
                jobStatus={job.status}
                title={job.title}
                citySlug={citySlug}
                categorySlug={categorySlug}
                slug={slug}
              />
            </div>
          </div>

          {/* Description Section */}
          <div className="bg-white border border-[var(--color-neutral-200)] rounded-3xl p-5 shadow-sm flex flex-col gap-3">
            <h3 className="text-sm font-bold text-[var(--color-neutral-900)] uppercase tracking-wider">
              Job Description
            </h3>
            <p className="text-sm text-[var(--color-neutral-600)] leading-relaxed whitespace-pre-wrap">
              {job.description}
            </p>
          </div>

          {/* Skills Required Section */}
          {job.skills && job.skills.length > 0 && (
            <div className="bg-white border border-[var(--color-neutral-200)] rounded-3xl p-5 shadow-sm flex flex-col gap-3">
              <h3 className="text-sm font-bold text-[var(--color-neutral-900)] uppercase tracking-wider">
                Required Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((js: any) => (
                  <SkillChip key={js.skillId} label={js.skill.name} variant="default" />
                ))}
              </div>
            </div>
          )}

          {/* Employer Section */}
          <div className="bg-white border border-[var(--color-neutral-200)] rounded-3xl p-5 shadow-sm flex flex-col gap-4">
            <h3 className="text-sm font-bold text-[var(--color-neutral-900)] uppercase tracking-wider">
              About the Employer
            </h3>
            <div className="flex items-center gap-4">
              <Avatar
                src={job.poster?.avatarUrl}
                name={job.poster?.name || 'Employer'}
                size="lg"
                verificationLevel={job.poster?.verificationLevel}
              />
              <div className="flex-1 min-w-0">
                <span className="block font-bold text-[var(--color-neutral-900)] truncate">
                  {job.poster?.name || 'Employer'}
                </span>
                <span className="block text-xs text-[var(--color-neutral-500)] mt-0.5">
                  Member since {new Date(job.poster?.createdAt || Date.now()).getFullYear()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
