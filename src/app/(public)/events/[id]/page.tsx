import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { StatusBadge } from '@/components/StatusBadge';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1';
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nabora.in';

interface EventPageParams {
  params: Promise<{ id: string }>;
}

async function fetchEvent(id: string) {
  try {
    const res = await fetch(`${API_URL}/events/${id}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: EventPageParams): Promise<Metadata> {
  const { id } = await params;
  const event = await fetchEvent(id);
  if (!event) return { title: 'Event Not Found | Nabora' };

  const title = `${event.title} — ${event.city} | Nabora`;
  const description = event.description ??
    `Hiring for ${event.roles?.length ?? 0} roles at ${event.venue}, ${event.city}. Apply now on Nabora.`;
  const url = `${SITE}/events/${id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website' },
  };
}

export default async function PublicEventPage({ params }: EventPageParams) {
  const { id } = await params;
  const event = await fetchEvent(id);
  if (!event) notFound();

  const org = event.organization;
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);
  const sameDay = format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description ?? undefined,
    startDate: event.startDate,
    endDate: event.endDate,
    location: {
      '@type': 'Place',
      name: event.venue,
      address: { '@type': 'PostalAddress', addressLocality: event.city, addressCountry: 'IN' },
    },
    organizer: { '@type': 'Organization', name: org?.name ?? 'Nabora' },
    url: `${SITE}/events/${id}`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-[var(--color-neutral-50)]">

        {/* Event Hero */}
        <div className="bg-white border-b border-[var(--color-neutral-200)]">
          <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-2xl font-extrabold text-[var(--color-neutral-900)] leading-tight">{event.title}</h1>
                {org && (
                  <div className="flex items-center gap-2 mt-2">
                    {org.logoUrl && <img src={org.logoUrl} alt={org.name} className="w-6 h-6 rounded-full object-cover" />}
                    <span className="text-sm font-semibold text-[var(--color-neutral-700)]">{org.name}</span>
                    {org.isVerified && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">✓ Verified</span>}
                  </div>
                )}
              </div>
              <StatusBadge status={event.status} />
            </div>

            <div className="flex flex-col gap-1.5 text-sm text-[var(--color-neutral-600)]">
              <span>📅 {sameDay
                ? `${format(start, 'd MMM yyyy, h:mm a')} – ${format(end, 'h:mm a')}`
                : `${format(start, 'd MMM yyyy')} – ${format(end, 'd MMM yyyy')}`}
              </span>
              <span>📍 {event.venue}, {event.city}</span>
            </div>

            {event.description && (
              <p className="text-sm text-[var(--color-neutral-600)] leading-relaxed">{event.description}</p>
            )}
          </div>
        </div>

        {/* Roles */}
        <div className="max-w-2xl mx-auto px-6 py-6">
          <h2 className="text-sm font-bold text-[var(--color-neutral-700)] uppercase tracking-wide mb-4">Available Roles</h2>
          {event.roles?.length > 0 ? (
            <div className="flex flex-col gap-3">
              {event.roles.map((role: any) => {
                const job = role.jobs?.[0];
                const applyUrl = job
                  ? `${SITE}/jobs/${job.citySlug}/${job.categorySlug}/${job.slug}`
                  : null;

                return (
                  <div key={role.id} className="bg-white rounded-2xl border border-[var(--color-neutral-200)] p-4 flex flex-col gap-3 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-sm text-[var(--color-neutral-900)]">{role.title}</h3>
                        {role.description && <p className="text-xs text-[var(--color-neutral-500)] mt-0.5">{role.description}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm text-[var(--color-neutral-900)]">₹{role.payRate}</p>
                        <p className="text-[10px] text-[var(--color-neutral-400)]">{role.payUnit.toLowerCase()}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--color-neutral-500)]">
                        {job?.vacancies ?? role.vacancies} vacanc{(job?.vacancies ?? role.vacancies) === 1 ? 'y' : 'ies'}
                        {job?.status === 'CLOSED' && <span className="ml-2 text-red-500 font-semibold">· Filled</span>}
                      </span>
                      {applyUrl && job?.status === 'PUBLISHED' ? (
                        <a
                          href={applyUrl}
                          className="px-4 py-2 bg-[var(--color-primary-500)] text-white text-xs font-bold rounded-xl hover:bg-[var(--color-primary-600)] transition"
                        >
                          Apply for this role →
                        </a>
                      ) : (
                        <span className="text-xs text-[var(--color-neutral-400)] italic">
                          {event.status === 'DRAFT' ? 'Accepting applications soon' : 'Position filled'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-neutral-400)] italic">Roles will be announced soon.</p>
          )}
        </div>
      </div>
    </>
  );
}
