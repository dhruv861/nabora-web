import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1';
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nabora.in';

export const revalidate = 3600;

interface OrgPageParams { params: Promise<{ citySlug: string; slug: string }> }

async function fetchOrgBySlug(slug: string) {
  try {
    const res = await fetch(`${API_URL}/organizations/by-slug/${slug}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch { return null; }
}

export async function generateMetadata({ params }: OrgPageParams): Promise<Metadata> {
  const { slug, citySlug } = await params;
  const org = await fetchOrgBySlug(slug);
  if (!org) return { title: 'Organization Not Found | Nabora' };
  const title = `${org.name} — ${org.city ?? 'India'} | Nabora`;
  const desc = org.description ??
    `${org.name} is hiring local workers through Nabora. View open jobs and team profile.`;
  const url = `${SITE}/organizations/${citySlug}/${slug}`;
  return {
    title, description: desc,
    alternates: { canonical: url },
    openGraph: { title, description: desc, url, type: 'website', images: org.logoUrl ? [{ url: org.logoUrl }] : [] },
  };
}

export default async function PublicOrgProfilePage({ params }: OrgPageParams) {
  const { citySlug, slug } = await params;
  const org = await fetchOrgBySlug(slug);
  if (!org || !org.isActive) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: org.name,
    description: org.description ?? undefined,
    url: org.website ?? `${SITE}/organizations/${citySlug}/${slug}`,
    logo: org.logoUrl ?? undefined,
    address: { '@type': 'PostalAddress', addressLocality: org.city ?? undefined, addressCountry: 'IN' },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-[var(--color-neutral-50)]">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-white">
          <a href="/" className="text-xl font-extrabold text-[#6c47ff] tracking-tight">nabora</a>
          <a href="/login" className="px-4 py-2 rounded-xl border border-neutral-200 text-sm font-bold text-neutral-700 hover:bg-neutral-50 transition">Sign In</a>
        </header>

        {/* Org Hero */}
        <div className="bg-white border-b border-neutral-200">
          <div className="max-w-2xl mx-auto px-6 py-8 flex items-start gap-5">
            <div className="w-20 h-20 rounded-2xl bg-neutral-100 flex items-center justify-center overflow-hidden shrink-0">
              {org.logoUrl
                ? <img src={org.logoUrl} alt={org.name} className="w-full h-full object-cover" />
                : <span className="text-2xl font-bold text-neutral-400">{org.name[0]}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-extrabold text-neutral-900">{org.name}</h1>
                {org.isVerified && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">✓ Verified</span>}
              </div>
              {org.city && <p className="text-sm text-neutral-500 mt-1">{org.city}</p>}
              {org.description && <p className="text-sm text-neutral-600 mt-2 leading-relaxed">{org.description}</p>}
              <div className="flex gap-4 mt-3 text-xs text-neutral-400">
                <span>{org._count?.members} team members</span>
                <span>{org._count?.jobs} total jobs</span>
              </div>
            </div>
          </div>
        </div>

        {/* Open Jobs */}
        <div className="max-w-2xl mx-auto px-6 py-8">
          <h2 className="text-sm font-bold text-neutral-700 uppercase tracking-wide mb-4">
            Open Positions ({org.jobs?.length ?? 0})
          </h2>
          {org.jobs?.length > 0 ? (
            <div className="flex flex-col gap-3">
              {org.jobs.map((job: any) => (
                <a
                  key={job.id}
                  href={`/jobs/${job.citySlug}/${job.categorySlug}/${job.slug}`}
                  className="bg-white rounded-2xl border border-neutral-200 p-4 hover:border-[#6c47ff] hover:shadow-sm transition flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-neutral-900 truncate">{job.title}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{job.area} · ₹{job.payRate}/{job.payUnit.toLowerCase()}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">{job._count?.applications} applicants</p>
                  </div>
                  <span className="text-[#6c47ff] font-bold text-sm shrink-0">Apply →</span>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-400 italic">No open positions at the moment.</p>
          )}
        </div>
      </div>
    </>
  );
}
