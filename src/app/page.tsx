import type { Metadata } from 'next';
import Link from 'next/link';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nabora.in';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Nabora — Find Work Nearby | Hire Workers Nearby',
  description:
    'Nabora is India’s hyperlocal workforce marketplace. Find promoter, photographer, and event coordinator jobs near you — or hire verified local talent instantly.',
  openGraph: {
    title: 'Nabora — Find Work Nearby | Hire Workers Nearby',
    description: 'India’s hyperlocal workforce marketplace. Hire local talent or find event jobs near you.',
    url: SITE,
    siteName: 'Nabora',
    images: [{ url: `${SITE}/og-default.png`, width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'Nabora — Find Work Nearby', description: 'Hyperlocal workforce marketplace for event staffing in India.' },
  alternates: { canonical: SITE },
};

const CATEGORIES = [
  { label: 'Promoter', slug: 'promoter' },
  { label: 'Photographer', slug: 'photographer' },
  { label: 'Event Coordinator', slug: 'event-coordinator' },
  { label: 'Videographer', slug: 'videographer' },
  { label: 'Hostess', slug: 'hostess' },
  { label: 'Event Helper', slug: 'event-helper' },
];

async function fetchJobCount() {
  try {
    const res = await fetch(`${API_URL}/jobs?limit=1&status=PUBLISHED`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data?.meta?.total ?? null;
  } catch { return null; }
}

export default async function HomePage() {
  const jobCount = await fetchJobCount();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Nabora',
    url: SITE,
    description: 'Hyperlocal workforce marketplace for event staffing in India.',
    potentialAction: { '@type': 'SearchAction', target: `${SITE}/jobs/ahmedabad`, 'query-input': 'required name=search_term_string' },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-white flex flex-col">

        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <span className="text-2xl font-extrabold text-[#6c47ff] tracking-tight">nabora</span>
          <Link href="/login" className="px-4 py-2 rounded-xl border border-neutral-200 text-sm font-bold text-neutral-700 hover:bg-neutral-50 transition">
            Sign In
          </Link>
        </header>

        {/* Hero */}
        <section className="flex flex-col items-center text-center px-6 py-20 bg-gradient-to-b from-white to-[#f5f2ff]">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-neutral-900 leading-tight mb-4">
            Find Work Nearby.<br />Hire People Nearby.
          </h1>
          <p className="text-lg text-neutral-500 max-w-md mb-8">
            India’s hyperlocal workforce marketplace for events, promotions, and activations.
            {jobCount ? ` ${jobCount.toLocaleString('en-IN')} jobs available now.` : ''}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
            <Link href="/login" className="flex-1 py-4 bg-[#6c47ff] text-white font-bold rounded-2xl text-center hover:bg-[#5a35e0] transition shadow-lg shadow-purple-200">
              I’m looking for work
            </Link>
            <Link href="/login" className="flex-1 py-4 border-2 border-[#6c47ff] text-[#6c47ff] font-bold rounded-2xl text-center hover:bg-purple-50 transition">
              I want to hire workers
            </Link>
          </div>
        </section>

        {/* How It Works */}
        <section className="px-6 py-16 max-w-4xl mx-auto w-full">
          <h2 className="text-2xl font-extrabold text-neutral-900 text-center mb-10">How It Works</h2>
          <div className="grid sm:grid-cols-2 gap-10">
            <div>
              <h3 className="font-bold text-lg text-[#6c47ff] mb-4">For Workers</h3>
              {['Create your profile and add skills', 'Discover jobs near you on the feed', 'Apply and get hired in minutes'].map((step, i) => (
                <div key={i} className="flex items-start gap-3 mb-4">
                  <div className="w-7 h-7 rounded-full bg-[#6c47ff] text-white flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">{i + 1}</div>
                  <p className="text-neutral-600 text-sm">{step}</p>
                </div>
              ))}
            </div>
            <div>
              <h3 className="font-bold text-lg text-neutral-800 mb-4">For Employers</h3>
              {['Post your job with location and pay', 'Receive applications from nearby workers', 'Hire in minutes, track attendance live'].map((step, i) => (
                <div key={i} className="flex items-start gap-3 mb-4">
                  <div className="w-7 h-7 rounded-full bg-neutral-800 text-white flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">{i + 1}</div>
                  <p className="text-neutral-600 text-sm">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Browse Jobs in Ahmedabad */}
        <section className="px-6 py-12 bg-[#f5f2ff]">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-extrabold text-neutral-900 mb-6">Browse Jobs in Ahmedabad</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/jobs/ahmedabad/${cat.slug}`}
                  className="bg-white rounded-2xl border border-neutral-200 px-4 py-3 text-sm font-bold text-neutral-800 hover:border-[#6c47ff] hover:text-[#6c47ff] transition flex items-center justify-between"
                >
                  {cat.label} <span className="text-neutral-400">→</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Trust */}
        <section className="px-6 py-16 max-w-4xl mx-auto w-full">
          <h2 className="text-xl font-extrabold text-neutral-900 text-center mb-8">Why Nabora</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: '📍', title: 'GPS Attendance Tracking', desc: 'Workers check in with GPS and selfie. Real-time attendance dashboard for coordinators.' },
              { icon: '🛡️', title: 'Verified Worker Profiles', desc: 'Bronze, Silver, and Gold verification tiers. Skill-matched recommendations.' },
              { icon: '📄', title: 'Instant Invoice Generation', desc: 'Auto-generated invoices with GST/TDS calculation the moment a hire is completed.' },
            ].map((item) => (
              <div key={item.title} className="bg-[#f5f2ff] rounded-2xl p-5">
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="font-bold text-sm text-neutral-900 mb-1">{item.title}</h3>
                <p className="text-xs text-neutral-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-neutral-100 px-6 py-8 text-center">
          <p className="text-sm font-extrabold text-[#6c47ff] mb-2">nabora</p>
          <p className="text-xs text-neutral-400">© {new Date().getFullYear()} Nabora. All rights reserved.</p>
          <div className="flex justify-center gap-4 mt-3 text-xs text-neutral-400">
            <Link href="/jobs/ahmedabad" className="hover:text-neutral-600">Jobs in Ahmedabad</Link>
            <Link href="/login" className="hover:text-neutral-600">Sign In</Link>
          </div>
        </footer>
      </div>
    </>
  );
}
