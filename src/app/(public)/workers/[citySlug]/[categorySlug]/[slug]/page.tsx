import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Avatar } from '@/components/Avatar';
import { SkillChip } from '@/components/SkillChip';
import { VerificationBadge } from '@/components/VerificationBadge';
import { AvailabilityIndicator } from '@/components/AvailabilityIndicator';
import { ReliabilityBar } from '@/components/ReliabilityBar';
import { StatusBadge } from '@/components/StatusBadge';

interface WorkerPageParams {
  params: Promise<{ citySlug: string; categorySlug: string; slug: string }>;
}

interface WorkerProfile {
  id: string;
  slug: string;
  headline: string | null;
  categorySlug: string | null;
  yearsExp: number;
  isPublic: boolean;
  skills: Array<{ skill: { id: string; name: string; slug: string } }>;
  portfolioItems: Array<{ id: string; title: string | null; imageUrl: string }>;
}

interface User {
  id: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  city: string | null;
  area: string | null;
  availabilityStatus: string;
  verificationLevel: string;
  reliabilityScore: number;
  averageRating: number;
  ratingCount: number;
  completedJobCount: number;
  workerProfile: WorkerProfile | null;
}

async function fetchWorkerBySlug(slug: string): Promise<User | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1';
    const res = await fetch(`${apiUrl}/users/by-slug/${slug}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = await res.json() as { data: User };
    return json.data;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: WorkerPageParams): Promise<Metadata> {
  const { slug } = await params;
  const user = await fetchWorkerBySlug(slug);
  if (!user || !user.workerProfile) {
    return { title: 'Worker Not Found' };
  }

  const profile = user.workerProfile;
  const name = user.name ?? 'Worker';
  const category = profile.categorySlug
    ? profile.categorySlug.charAt(0).toUpperCase() + profile.categorySlug.slice(1)
    : 'Freelancer';
  const city = user.city ?? 'India';
  const title = `${name} — ${category} in ${city}`;
  const description =
    user.bio?.slice(0, 160) ??
    `Hire ${name}, a skilled ${category} based in ${city}. ${profile.yearsExp} years experience. Available for events and short-term work.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      images: user.avatarUrl ? [{ url: user.avatarUrl, width: 400, height: 400 }] : [],
    },
    twitter: { card: 'summary', title, description },
  };
}

export default async function WorkerProfilePage({ params }: WorkerPageParams) {
  const { slug } = await params;
  const user = await fetchWorkerBySlug(slug);

  if (!user || !user.workerProfile || !user.workerProfile.isPublic) {
    notFound();
  }

  const profile = user.workerProfile;
  const name = user.name ?? 'Worker';
  const category = profile.categorySlug ?? 'Freelancer';
  const city = user.city ?? '';

  // JSON-LD structured data (Person schema)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    description: user.bio ?? undefined,
    image: user.avatarUrl ?? undefined,
    jobTitle: profile.headline ?? category,
    address: {
      '@type': 'PostalAddress',
      addressLocality: user.city ?? undefined,
      addressCountry: 'IN',
    },
    knowsAbout: profile.skills.map((s) => s.skill.name),
  };

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="min-h-screen bg-[var(--color-neutral-50)]">
        {/* Hero */}
        <div className="bg-white border-b border-[var(--color-neutral-200)]">
          <div className="max-w-2xl mx-auto px-6 py-8">
            <div className="flex items-start gap-5">
              <Avatar
                src={user.avatarUrl}
                name={name}
                size="xl"
                verificationLevel={user.verificationLevel as 'NONE' | 'BRONZE' | 'SILVER' | 'GOLD'}
              />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold text-[var(--color-neutral-900)] truncate">{name}</h1>
                  <VerificationBadge level={user.verificationLevel as 'NONE' | 'BRONZE' | 'SILVER' | 'GOLD'} />
                </div>
                {profile.headline && (
                  <p className="text-sm text-[var(--color-neutral-600)] mb-2">{profile.headline}</p>
                )}
                <div className="flex flex-wrap gap-3 items-center text-sm text-[var(--color-neutral-500)]">
                  {city && <span>📍 {user.area ? `${user.area}, ` : ''}{city}</span>}
                  {profile.yearsExp > 0 && <span>· {profile.yearsExp}yr exp</span>}
                  <span>· {user.completedJobCount} jobs</span>
                </div>
                <div className="mt-3">
                  <AvailabilityIndicator
                    status={user.availabilityStatus as 'AVAILABLE_NOW' | 'AVAILABLE_THIS_WEEK' | 'BUSY' | 'UNAVAILABLE'}
                  />
                </div>
              </div>
            </div>

            {/* Rating + Reliability */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="bg-[var(--color-neutral-50)] rounded-xl p-3">
                <p className="text-xs text-[var(--color-neutral-500)] mb-1">Rating</p>
                <p className="text-lg font-bold text-[var(--color-neutral-900)]">
                  ⭐ {user.averageRating.toFixed(1)}
                  <span className="text-xs font-normal text-[var(--color-neutral-400)] ml-1">({user.ratingCount})</span>
                </p>
              </div>
              <div className="bg-[var(--color-neutral-50)] rounded-xl p-3">
                <p className="text-xs text-[var(--color-neutral-500)] mb-1">Reliability</p>
                <ReliabilityBar score={user.reliabilityScore} size="md" />
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
          {/* Bio */}
          {user.bio && (
            <section>
              <h2 className="text-sm font-semibold text-[var(--color-neutral-700)] uppercase tracking-wide mb-3">
                About
              </h2>
              <p className="text-sm text-[var(--color-neutral-600)] leading-relaxed">{user.bio}</p>
            </section>
          )}

          {/* Skills */}
          {profile.skills.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-[var(--color-neutral-700)] uppercase tracking-wide mb-3">
                Skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((us) => (
                  <SkillChip key={us.skill.id} label={us.skill.name} variant="default" />
                ))}
              </div>
            </section>
          )}

          {/* Portfolio */}
          {profile.portfolioItems.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-[var(--color-neutral-700)] uppercase tracking-wide mb-3">
                Portfolio
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {profile.portfolioItems.map((item) => (
                  <div key={item.id} className="rounded-xl overflow-hidden aspect-square bg-[var(--color-neutral-200)] relative">
                    <Image
                      src={item.imageUrl}
                      alt={item.title ?? 'Portfolio item'}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, 33vw"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
