import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MapPin, Briefcase, ChevronRight } from 'lucide-react';
import { JobCard } from '@/components/JobCard';
import { EmptyState } from '@/components/EmptyState';

interface CityPageParams {
  params: Promise<{ citySlug: string }>;
}

const KNOWN_CITIES: Record<string, string> = {
  ahmedabad: 'Ahmedabad',
  gandhinagar: 'Gandhinagar',
  surat: 'Surat',
  vadodara: 'Vadodara',
  mumbai: 'Mumbai',
};

const CATEGORIES = [
  { name: 'Event Staff', slug: 'event' },
  { name: 'Media / Creative', slug: 'media' },
  { name: 'Logistics support', slug: 'logistics' },
];

async function fetchJobsByCity(citySlug: string) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1';
    const res = await fetch(`${apiUrl}/jobs?city=${citySlug}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = await res.json() as { data: { jobs: any[] } };
    return json.data.jobs;
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: CityPageParams): Promise<Metadata> {
  const { citySlug } = await params;
  const cityName = KNOWN_CITIES[citySlug.toLowerCase()] || citySlug;
  const title = `Gig Jobs & Event Staff Openings in ${cityName} | Nabora`;
  const description = `Discover and apply to hyperlocal gig jobs, event coordinator roles, promoters, and photographer vacancies in ${cityName}. Connect directly with local employers on Nabora.`;

  return {
    title,
    description,
    openGraph: { title, description },
  };
}

export default async function CityBrowsePage({ params }: CityPageParams) {
  const { citySlug } = await params;
  const cityName = KNOWN_CITIES[citySlug.toLowerCase()];

  if (!cityName) {
    notFound();
  }

  const jobs = await fetchJobsByCity(citySlug);

  return (
    <main className="min-h-screen bg-[var(--color-neutral-50)] pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-[var(--color-neutral-200)] shadow-sm z-20 px-4 py-3 flex items-center gap-3">
        <Link
          href="/feed"
          className="p-1.5 rounded-xl hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] transition"
        >
          <ArrowLeft size={20} />
        </Link>
        <span className="font-bold text-sm text-[var(--color-neutral-800)]">Browse City</span>
      </header>

      {/* Main Container */}
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Intro Hero Section */}
        <div className="bg-white border border-[var(--color-neutral-200)] rounded-3xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[var(--color-primary-500)] mb-1">
            <MapPin size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">Local Jobs Hub</span>
          </div>
          <h1 className="text-xl font-extrabold text-[var(--color-neutral-900)]">
            Gig Work & Event Openings in {cityName}
          </h1>
          <p className="text-sm text-[var(--color-neutral-600)] mt-2 leading-relaxed">
            Welcome to the hyperlocal job feed for {cityName}. Here you can find freelance event roles,
            promoters, photographer requirements, and warehouse support jobs posted by verified organizations near you.
          </p>
        </div>

        {/* Categories Quick Filter Chips */}
        <div>
          <h2 className="text-xs font-bold text-[var(--color-neutral-500)] uppercase tracking-wider mb-2.5">
            Browse by category in {cityName}
          </h2>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/jobs/${citySlug}/${cat.slug}`}
                className="flex items-center gap-1 bg-white hover:bg-[var(--color-neutral-50)] text-[var(--color-neutral-700)] border border-[var(--color-neutral-200)] hover:border-[var(--color-neutral-300)] text-xs font-semibold px-4 py-2.5 rounded-full transition shadow-sm"
              >
                <span>{cat.name}</span>
                <ChevronRight size={12} className="text-[var(--color-neutral-400)]" />
              </Link>
            ))}
          </div>
        </div>

        {/* Jobs Listing */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-[var(--color-neutral-200)] pb-2">
            <Briefcase size={16} className="text-[var(--color-neutral-500)]" />
            <h2 className="text-sm font-bold text-[var(--color-neutral-900)]">
              Active Jobs ({jobs.length})
            </h2>
          </div>

          {jobs.length > 0 ? (
            <div className="flex flex-col gap-3">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No Jobs in City"
              description={`There are currently no active jobs posted in ${cityName}. Please check back later or search for other locations.`}
            />
          )}
        </div>
      </div>
    </main>
  );
}
