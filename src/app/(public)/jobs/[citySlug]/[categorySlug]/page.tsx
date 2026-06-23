import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Briefcase, Star, MapPin } from 'lucide-react';
import { JobCard } from '@/components/JobCard';
import { EmptyState } from '@/components/EmptyState';

interface CategoryPageParams {
  params: Promise<{ citySlug: string; categorySlug: string }>;
}

const KNOWN_CITIES: Record<string, string> = {
  ahmedabad: 'Ahmedabad',
  gandhinagar: 'Gandhinagar',
  surat: 'Surat',
  vadodara: 'Vadodara',
  mumbai: 'Mumbai',
};

const KNOWN_CATEGORIES: Record<string, string> = {
  event: 'Event Staff',
  media: 'Media / Creative',
  logistics: 'Logistics support',
};

// Unique intro descriptions for MVP city-category pairs
const INTRO_COPY: Record<string, string> = {
  'ahmedabad-event': 'Looking for promoters, hostesses, and event helpers in Ahmedabad? Check out the active openings below for corporate events, activations, and exhibitions at venues like Helipad Ground, Exhibition Centre, and local malls.',
  'ahmedabad-media': 'Find event photography, videography, and image editing gig requirements in Ahmedabad. Connect with top local wedding planners, agencies, and event companies offering daily pay contracts.',
  'ahmedabad-logistics': 'Hyperlocal logistics support roles, driver requirements, and warehouse assistant openings across Ahmedabad. Part-time shifts with fast payouts.',
};

async function fetchJobsByCityCategory(citySlug: string, categorySlug: string) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1';
    const res = await fetch(`${apiUrl}/jobs?city=${citySlug}&category=${categorySlug}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = await res.json() as { data: { jobs: any[] } };
    return json.data.jobs;
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: CategoryPageParams): Promise<Metadata> {
  const { citySlug, categorySlug } = await params;
  const cityName = KNOWN_CITIES[citySlug.toLowerCase()] || citySlug;
  const categoryName = KNOWN_CATEGORIES[categorySlug.toLowerCase()] || categorySlug;
  const title = `Local ${categoryName} Jobs in ${cityName} | Nabora`;
  const description = `Apply to verified ${categoryName} jobs, promoters, photographers and logistics support openings in ${cityName}. Fast hiring and daily pay jobs on Nabora.`;

  return {
    title,
    description,
    openGraph: { title, description },
  };
}

export default async function CategoryBrowsePage({ params }: CategoryPageParams) {
  const { citySlug, categorySlug } = await params;
  const cityName = KNOWN_CITIES[citySlug.toLowerCase()];
  const categoryName = KNOWN_CATEGORIES[categorySlug.toLowerCase()];

  if (!cityName || !categoryName) {
    notFound();
  }

  const jobs = await fetchJobsByCityCategory(citySlug, categorySlug);
  const copyKey = `${citySlug.toLowerCase()}-${categorySlug.toLowerCase()}`;
  const introText = INTRO_COPY[copyKey] || `Browse active ${categoryName} openings in ${cityName}. Connect with verified local employers hiring now on Nabora.`;

  return (
    <main className="min-h-screen bg-[var(--color-neutral-50)] pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-[var(--color-neutral-200)] shadow-sm z-20 px-4 py-3 flex items-center gap-3">
        <Link
          href={`/jobs/${citySlug}`}
          className="p-1.5 rounded-xl hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] transition"
        >
          <ArrowLeft size={20} />
        </Link>
        <span className="font-bold text-sm text-[var(--color-neutral-800)]">Browse Category</span>
      </header>

      {/* Main Container */}
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Intro Card */}
        <div className="bg-white border border-[var(--color-neutral-200)] rounded-3xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[var(--color-primary-500)] mb-1">
            <Star size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">{categoryName} Openings</span>
          </div>
          <h1 className="text-xl font-extrabold text-[var(--color-neutral-900)]">
            {categoryName} Jobs in {cityName}
          </h1>
          <p className="text-sm text-[var(--color-neutral-600)] mt-2 leading-relaxed">
            {introText}
          </p>
        </div>

        {/* Jobs Listing */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[var(--color-neutral-200)] pb-2">
            <div className="flex items-center gap-2">
              <Briefcase size={16} className="text-[var(--color-neutral-500)]" />
              <h2 className="text-sm font-bold text-[var(--color-neutral-900)]">
                Active Openings
              </h2>
            </div>
            <span className="text-xs font-semibold bg-[var(--color-primary-50)] text-[var(--color-primary-700)] px-2.5 py-1 rounded-full border border-[var(--color-primary-200)]">
              {jobs.length} open position{jobs.length !== 1 ? 's' : ''}
            </span>
          </div>

          {jobs.length > 0 ? (
            <div className="flex flex-col gap-3">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <EmptyState
              title={`No ${categoryName} Jobs`}
              description={`There are currently no active ${categoryName} openings posted in ${cityName}. View other categories to find local work.`}
            />
          )}
        </div>
      </div>
    </main>
  );
}
