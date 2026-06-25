import type { MetadataRoute } from 'next';

export const revalidate = 3600;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1';
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nabora.in';

const CITIES = ['ahmedabad', 'gandhinagar', 'surat', 'vadodara', 'mumbai', 'delhi', 'bangalore', 'pune', 'hyderabad'];
const CATEGORIES = ['promoter', 'photographer', 'event-coordinator', 'videographer', 'hostess', 'event-helper'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE}/feed`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    ...CITIES.map((city) => ({ url: `${SITE}/jobs/${city}`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.9 })),
    ...CITIES.flatMap((city) => CATEGORIES.map((cat) => ({ url: `${SITE}/jobs/${city}/${cat}`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.8 }))),
  ];

  try {
    const [jobsRes, workersRes, orgsRes] = await Promise.allSettled([
      fetch(`${API_URL}/sitemap/jobs`, { next: { revalidate: 3600 } }),
      fetch(`${API_URL}/sitemap/workers`, { next: { revalidate: 3600 } }),
      fetch(`${API_URL}/sitemap/organizations`, { next: { revalidate: 3600 } }),
    ]);

    const jobEntries: MetadataRoute.Sitemap =
      jobsRes.status === 'fulfilled' && jobsRes.value.ok
        ? ((await jobsRes.value.json()).data as any[]).map((j) => ({
            url: `${SITE}/jobs/${j.citySlug}/${j.categorySlug}/${j.slug}`,
            lastModified: new Date(j.updatedAt), changeFrequency: 'hourly' as const, priority: 0.9,
          }))
        : [];

    const workerEntries: MetadataRoute.Sitemap =
      workersRes.status === 'fulfilled' && workersRes.value.ok
        ? ((await workersRes.value.json()).data as any[]).map((w) => ({
            url: `${SITE}/workers/${w.citySlug ?? 'india'}/${w.categorySlug ?? 'worker'}/${w.slug}`,
            lastModified: new Date(w.updatedAt), changeFrequency: 'weekly' as const, priority: 0.7,
          }))
        : [];

    const orgEntries: MetadataRoute.Sitemap =
      orgsRes.status === 'fulfilled' && orgsRes.value.ok
        ? ((await orgsRes.value.json()).data as any[]).map((o) => ({
            url: `${SITE}/organizations/${o.citySlug ?? 'india'}/${o.slug}`,
            lastModified: new Date(o.updatedAt), changeFrequency: 'weekly' as const, priority: 0.6,
          }))
        : [];

    return [...staticRoutes, ...jobEntries, ...workerEntries, ...orgEntries];
  } catch {
    return staticRoutes;
  }
}
