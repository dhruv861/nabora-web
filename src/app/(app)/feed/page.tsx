import { redirect } from 'next/navigation';

// Sprint 2 will implement the full feed — for now redirect authenticated users here
export default function FeedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-neutral-50)]">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--color-primary-500)] mb-4 shadow-lg">
          <span className="text-white font-bold text-2xl">N</span>
        </div>
        <h1 className="text-xl font-bold text-[var(--color-neutral-900)] mb-2">
          Welcome to Nabora 🎉
        </h1>
        <p className="text-sm text-[var(--color-neutral-500)]">
          Your profile is set up! The job feed is coming in Sprint 2.
        </p>
      </div>
    </div>
  );
}
