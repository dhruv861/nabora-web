'use client';

import React, { useState, useTransition, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Search, Bell, Sparkles, Navigation, ChevronDown, Check, RefreshCw, MessageCircle } from 'lucide-react';
import { useLocationStore } from '@/store/useLocationStore';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/lib/api';
import { JobCard } from '@/components/JobCard';
import { EmptyState } from '@/components/EmptyState';
import { useChatSocket } from '@/hooks/useChatSocket';
import { toast } from 'sonner';

const POPULAR_CITIES = [
  { name: 'Ahmedabad', slug: 'ahmedabad', lat: 23.0225, lng: 72.5714 },
  { name: 'Gandhinagar', slug: 'gandhinagar', lat: 23.2156, lng: 72.6369 },
  { name: 'Surat', slug: 'surat', lat: 21.1702, lng: 72.8311 },
  { name: 'Vadodara', slug: 'vadodara', lat: 22.3072, lng: 73.1812 },
  { name: 'Mumbai', slug: 'mumbai', lat: 19.0760, lng: 72.8777 },
];

function FeedComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const { lat, lng, area, city, requestLocation, setLocation, isLoading: isLocLoading, error: locError } = useLocationStore();
  const { user, isAuthenticated } = useAuthStore();

  const currentSection = searchParams.get('section') || (isAuthenticated ? 'recommended' : 'nearby');

  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useChatSocket();

  const handleSectionChange = (section: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('section', section);
    startTransition(() => { router.push(`/feed?${params.toString()}`); });
  };

  React.useEffect(() => { if (!lat || !lng) requestLocation(); }, [lat, lng, requestLocation]);

  const fetchJobs = async ({ pageParam }: { pageParam: string | null }) => {
    const params: Record<string, any> = { section: currentSection, limit: 10 };
    if (lat && lng) { params.lat = lat; params.lng = lng; }
    if (pageParam) params.cursor = pageParam;
    const response = await api.get('/jobs', { params });
    return response.data.data as { jobs: any[]; nextCursor: string | null };
  };

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: isJobsLoading, refetch } = useInfiniteQuery({
    queryKey: ['jobs-feed', currentSection, lat, lng],
    queryFn: fetchJobs,
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const { data: savedJobsData } = useInfiniteQuery({
    queryKey: ['saved-jobs'],
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      const response = await api.get('/users/me/saved-jobs', { params: pageParam ? { cursor: pageParam } : {} });
      return response.data.data as { jobs: any[]; nextCursor: string | null };
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: isAuthenticated,
  });

  // Real unread notification count
  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: async () => { const res = await api.get('/notifications/unread-count'); return res.data.data as { count: number }; },
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });
  const unreadCount = unreadData?.count ?? 0;

  // Unread chat count
  const { data: chats } = useQuery({
    queryKey: ['my-chats'],
    queryFn: async () => { const res = await api.get('/chats'); return res.data.data as any[]; },
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });
  const unreadChatCount = (chats ?? []).filter((c: any) => {
    const lastMsg = c.lastMessage;
    return lastMsg && lastMsg.sender?.id !== user?.id &&
      (!c.myLastReadAt || new Date(lastMsg.createdAt) > new Date(c.myLastReadAt));
  }).length;

  const savedJobIds = new Set(savedJobsData?.pages.flatMap((page) => page.jobs.map((j) => j.id)) ?? []);

  const saveJobMutation = useMutation({
    mutationFn: async ({ jobId, isSaved }: { jobId: string; isSaved: boolean }) => {
      if (isSaved) await api.delete(`/users/me/saved-jobs/${jobId}`);
      else await api.post(`/users/me/saved-jobs/${jobId}`);
    },
    onSuccess: (_, variables) => {
      toast.success(variables.isSaved ? 'Job removed from saved list' : 'Job saved!');
      queryClient.invalidateQueries({ queryKey: ['saved-jobs'] });
    },
    onError: () => toast.error('Failed to update saved status.'),
  });

  const observerTargetRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage(); },
      { threshold: 0.5 },
    );
    const target = observerTargetRef.current;
    if (target) observer.observe(target);
    return () => { if (target) observer.unobserve(target); };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const selectManualCity = (cityItem: typeof POPULAR_CITIES[number]) => {
    setLocation({ lat: cityItem.lat, lng: cityItem.lng, city: cityItem.name, citySlug: cityItem.slug, area: cityItem.name });
    setShowCityDropdown(false);
    toast.success(`Location set to ${cityItem.name}`);
  };

  const jobsList = data?.pages.flatMap((page) => page.jobs) ?? [];

  // Feed section tabs — Recommended only shown when authenticated
  const FEED_TABS = [
    ...(isAuthenticated ? [{ id: 'recommended', label: 'Recommended', icon: <Sparkles size={14} /> }] : []),
    { id: 'nearby', label: 'Nearby', icon: <MapPin size={14} /> },
    { id: 'featured', label: 'Featured', icon: null },
    { id: 'new', label: 'New', icon: null },
  ];

  return (
    <div className="min-h-screen pb-safe bg-[var(--color-neutral-50)] overflow-y-auto flex flex-col" style={{ height: '100vh', scrollbarWidth: 'none' }}>
      <header className="app-header flex items-center justify-between px-4 sticky top-0 bg-white/95 backdrop-blur-md border-b border-[var(--color-neutral-200)] shadow-sm z-30">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-[var(--color-primary-500)] flex items-center justify-center shadow-md">
            <span className="text-white font-extrabold text-lg">N</span>
          </div>
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-[var(--color-primary-600)] to-[var(--color-primary-800)] bg-clip-text text-transparent">nabora</span>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowCityDropdown(!showCityDropdown)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full hover:bg-[var(--color-neutral-100)] text-xs font-semibold text-[var(--color-neutral-800)] border border-[var(--color-neutral-200)] transition"
          >
            <MapPin size={14} className="text-[var(--color-primary-500)]" />
            <span className="max-w-[100px] truncate">{area || city || 'Set Location'}</span>
            <ChevronDown size={12} className="text-[var(--color-neutral-500)]" />
          </button>
          {showCityDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowCityDropdown(false)} />
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-[var(--color-neutral-200)] shadow-xl z-50 py-2">
                <button onClick={() => { requestLocation(); setShowCityDropdown(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-left hover:bg-[var(--color-primary-50)] text-[var(--color-primary-600)] font-medium">
                  <Navigation size={14} />GPS Auto-Detect
                </button>
                <div className="h-[1px] bg-[var(--color-neutral-100)] my-1" />
                {POPULAR_CITIES.map((c) => (
                  <button key={c.slug} onClick={() => selectManualCity(c)} className="w-full flex items-center justify-between px-4 py-2 text-xs text-left hover:bg-[var(--color-neutral-50)] text-[var(--color-neutral-700)]">
                    <span>{c.name}</span>
                    {city?.toLowerCase() === c.slug && <Check size={14} className="text-[var(--color-primary-500)]" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button onClick={() => router.push('/notifications')} className="p-2 rounded-full hover:bg-[var(--color-neutral-100)] relative">
          <Bell size={20} className="text-[var(--color-neutral-600)]" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-[var(--color-error-500)] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </header>

      <main className="max-w-[var(--content-max)] mx-auto w-full px-4 flex-1 flex flex-col gap-4 mt-4">
        <div onClick={() => router.push('/jobs/search')} className="flex items-center gap-3 px-4 py-3 bg-white border border-[var(--color-neutral-200)] rounded-2xl shadow-sm cursor-pointer hover:border-[var(--color-primary-300)] transition group">
          <Search size={18} className="text-[var(--color-neutral-400)] group-hover:text-[var(--color-primary-500)] transition" />
          <span className="text-sm text-[var(--color-neutral-400)] font-medium">Search for nearby jobs...</span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {FEED_TABS.map((tab) => {
            const isActive = currentSection === tab.id;
            return (
              <button key={tab.id} onClick={() => handleSectionChange(tab.id)} disabled={isPending}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                  isActive
                    ? 'bg-[var(--color-primary-500)] text-white border-[var(--color-primary-500)] shadow-md shadow-purple-200'
                    : 'bg-white text-[var(--color-neutral-600)] border-[var(--color-neutral-200)] hover:border-[var(--color-neutral-300)]'
                }`}
              >
                {tab.icon}{tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 mb-24">
          {isJobsLoading ? (
            Array.from({ length: 5 }).map((_, idx) => <JobCard key={idx} job={{} as any} variant="skeleton" />)
          ) : jobsList.length > 0 ? (
            jobsList.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                isSaved={savedJobIds.has(job.id)}
                onSave={(id) => saveJobMutation.mutate({ jobId: id, isSaved: savedJobIds.has(id) })}
                onApply={() => router.push(`/jobs/${job.citySlug}/${job.categorySlug}/${job.slug}`)}
              />
            ))
          ) : (
            <EmptyState title="No Jobs Found" description="No jobs found in this section. Try a different location or section." action={{ label: 'Change Location', onClick: () => setShowCityDropdown(true) }} />
          )}
          <div ref={observerTargetRef} className="h-10 flex justify-center items-center">
            {isFetchingNextPage && (
              <div className="flex items-center gap-2 text-xs text-[var(--color-neutral-500)]">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-primary-500)] border-t-transparent" />
                Loading more...
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-[var(--color-neutral-200)] flex items-center justify-around px-4 shadow-lg z-30 pb-safe">
        <button onClick={() => router.push('/feed')} className="flex flex-col items-center justify-center gap-1 text-[var(--color-primary-500)] font-bold text-[10px]">
          <Sparkles size={20} /><span>Feed</span>
        </button>
        <button onClick={() => router.push('/jobs/search')} className="flex flex-col items-center justify-center gap-1 text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-700)] font-medium text-[10px]">
          <Search size={20} /><span>Search</span>
        </button>
        <button onClick={() => router.push('/jobs/create')} className="flex flex-col items-center justify-center gap-1 text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-700)] font-medium text-[10px]">
          <div className="w-10 h-10 rounded-full bg-[var(--color-primary-500)] text-white flex items-center justify-center shadow-lg -mt-5 hover:bg-[var(--color-primary-600)] transition">
            <span className="text-xl font-bold">+</span>
          </div>
          <span className="mt-0.5">Post Job</span>
        </button>
        <button onClick={() => router.push('/chats')} className="flex flex-col items-center justify-center gap-1 text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-700)] font-medium text-[10px] relative">
          <MessageCircle size={20} />
          {unreadChatCount > 0 && (
            <span className="absolute -top-0.5 right-2 min-w-[16px] h-4 bg-[var(--color-error-500)] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
              {unreadChatCount > 9 ? '9+' : unreadChatCount}
            </span>
          )}
          <span>Messages</span>
        </button>
        <button onClick={() => router.push('/profile')} className="flex flex-col items-center justify-center gap-1 text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-700)] font-medium text-[10px]">
          <div className="w-5 h-5 rounded-full bg-[var(--color-neutral-200)] overflow-hidden">
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              : <span className="text-[10px] font-bold flex items-center justify-center w-full h-full bg-[var(--color-primary-100)] text-[var(--color-primary-700)]">{user?.name?.slice(0, 1) || 'U'}</span>}
          </div>
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
}

export default function FeedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-primary-500)] border-t-transparent" /></div>}>
      <FeedComponent />
    </Suspense>
  );
}
