import { MetadataRoute } from 'next';

/**
 * Sitemap generated from nabora-api's sitemap endpoints.
 * Revalidates every hour (ISR).
 * This resolves the Sprint 2 Gap E launch-checklist blocker.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1';

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nabora.in'}`, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nabora.in'}/feed`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
  ];

  try {
    const [jobsRes, workersRes, orgsRes] = await Promise.allSettled([
      fetch(`${API_URL}/sitemap/jobs`, { next: { revalidate: 3600 } }),
      fetch(`${API_URL}/sitemap/workers`, { next: { revalidate: 3600 } }),
      fetch(`${API_URL}/sitemap/organizations`, { next: { revalidate: 3600 } }),
    ]);

    const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nabora.in';

    const jobEntries: MetadataRoute.Sitemap =
      jobsRes.status === 'fulfilled' && jobsRes.value.ok
        ? ((await jobsRes.value.json()).data as any[]).map((j) => ({
            url: `${SITE}/jobs/${j.citySlug}/${j.categorySlug}/${j.slug}`,
            lastModified: new Date(j.updatedAt),
            changeFrequency: 'daily' as const,
            priority: 0.8,
          }))
        : [];

    const workerEntries: MetadataRoute.Sitemap =
      workersRes.status === 'fulfilled' && workersRes.value.ok
        ? ((await workersRes.value.json()).data as any[]).map((w) => ({
            url: `${SITE}/workers/${w.citySlug ?? 'india'}/${w.slug}`,
            lastModified: new Date(w.updatedAt),
            changeFrequency: 'weekly' as const,
            priority: 0.6,
          }))
        : [];

    const orgEntries: MetadataRoute.Sitemap =
      orgsRes.status === 'fulfilled' && orgsRes.value.ok
        ? ((await orgsRes.value.json()).data as any[]).map((o) => ({
            url: `${SITE}/organizations/${o.citySlug ?? 'india'}/${o.slug}`,
            lastModified: new Date(o.updatedAt),
            changeFrequency: 'weekly' as const,
            priority: 0.5,
          }))
        : [];

    return [...staticRoutes, ...jobEntries, ...workerEntries, ...orgEntries];
  } catch {
    // If API is down at build time, return static routes only — never hard fail
    return staticRoutes;
  }
}
