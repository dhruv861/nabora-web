'use client';

import React, { useEffect, useState, useTransition, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal, X, ArrowLeft, Loader2, Sparkles, MapPin, Calendar, Banknote } from 'lucide-react';
import { api } from '@/lib/api';
import { useLocationStore } from '@/store/useLocationStore';
import { JobCard } from '@/components/JobCard';
import { BottomSheet } from '@/components/BottomSheet';
import { EmptyState } from '@/components/EmptyState';

function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function SearchComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const { lat, lng } = useLocationStore();

  // Search/Filter State
  const [searchText, setSearchText] = useState(searchParams.get('q') || '');
  const debouncedSearch = useDebounce(searchText, 300);

  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    searchParams.get('skills') ? searchParams.get('skills')!.split(',') : []
  );
  const [radius, setRadius] = useState<number>(Number(searchParams.get('radius')) || 20);
  const [payMin, setPayMin] = useState(searchParams.get('payMin') || '');
  const [payMax, setPayMax] = useState(searchParams.get('payMax') || '');
  const [payUnit, setPayUnit] = useState(searchParams.get('payUnit') || '');
  const [workDate, setWorkDate] = useState(searchParams.get('date') || '');

  // UI state
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Sync state changes with URL query parameters
  const updateUrl = (filters: {
    q?: string;
    category?: string;
    skills?: string[];
    radius?: number;
    payMin?: string;
    payMax?: string;
    payUnit?: string;
    date?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.category) params.set('category', filters.category);
    if (filters.skills && filters.skills.length > 0) params.set('skills', filters.skills.join(','));
    if (filters.radius && filters.radius !== 20) params.set('radius', String(filters.radius));
    if (filters.payMin) params.set('payMin', filters.payMin);
    if (filters.payMax) params.set('payMax', filters.payMax);
    if (filters.payUnit) params.set('payUnit', filters.payUnit);
    if (filters.date) params.set('date', filters.date);

    startTransition(() => {
      router.push(`/jobs/search?${params.toString()}`);
    });
  };

  // Sync debounced search to URL
  useEffect(() => {
    updateUrl({
      q: debouncedSearch,
      category: selectedCategory,
      skills: selectedSkills,
      radius,
      payMin,
      payMax,
      payUnit,
      date: workDate,
    });
  }, [debouncedSearch]);

  // Fetch all categories and skills
  const { data: skillsData } = useQuery({
    queryKey: ['skills-all'],
    queryFn: async () => {
      const res = await api.get('/skills');
      return res.data.data as { id: string; name: string; slug: string; category: string }[];
    },
  });

  // Group skills by category
  const categoriesMap = useMemo(() => {
    if (!skillsData) return {};
    const map: Record<string, typeof skillsData> = {};
    skillsData.forEach((skill) => {
      const cat = skill.category || 'Other';
      if (!map[cat]) map[cat] = [];
      map[cat].push(skill);
    });
    return map;
  }, [skillsData]);

  // Fetch Jobs list
  const fetchFilteredJobs = async ({ pageParam }: { pageParam: string | null }) => {
    const params: Record<string, any> = {
      limit: 10,
    };
    if (lat && lng) {
      params.lat = lat;
      params.lng = lng;
      params.radius = radius;
    }
    if (debouncedSearch) params.q = debouncedSearch; // Backend matching handles this or standard text filter
    if (selectedCategory) params.category = selectedCategory;
    if (selectedSkills.length > 0) params.skills = selectedSkills;
    if (payMin) params.payMin = payMin;
    if (payMax) params.payMax = payMax;
    if (payUnit) params.payUnit = payUnit;
    if (workDate) params.date = workDate;
    if (pageParam) params.cursor = pageParam;

    const res = await api.get('/jobs', { params });
    return res.data.data as { jobs: any[]; nextCursor: string | null; total?: number };
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isJobsLoading,
  } = useInfiniteQuery({
    queryKey: ['jobs-search', debouncedSearch, selectedCategory, selectedSkills, radius, payMin, payMax, payUnit, workDate, lat, lng],
    queryFn: fetchFilteredJobs,
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  // Count preview query
  const { data: countData } = useQuery({
    queryKey: ['jobs-search-count', debouncedSearch, selectedCategory, selectedSkills, radius, payMin, payMax, payUnit, workDate, lat, lng],
    queryFn: async () => {
      const params: Record<string, any> = {
        countOnly: true,
      };
      if (lat && lng) {
        params.lat = lat;
        params.lng = lng;
        params.radius = radius;
      }
      if (debouncedSearch) params.q = debouncedSearch;
      if (selectedCategory) params.category = selectedCategory;
      if (selectedSkills.length > 0) params.skills = selectedSkills;
      if (payMin) params.payMin = payMin;
      if (payMax) params.payMax = payMax;
      if (payUnit) params.payUnit = payUnit;
      if (workDate) params.date = workDate;

      const res = await api.get('/jobs', { params });
      return res.data.data as { total: number };
    },
  });

  const jobsList = data?.pages.flatMap((page) => page.jobs) || [];
  const totalCount = countData?.total ?? jobsList.length;

  const toggleSkill = (skillSlug: string) => {
    const updated = selectedSkills.includes(skillSlug)
      ? selectedSkills.filter((s) => s !== skillSlug)
      : [...selectedSkills, skillSlug];
    setSelectedSkills(updated);
    updateUrl({
      q: searchText,
      category: selectedCategory,
      skills: updated,
      radius,
      payMin,
      payMax,
      payUnit,
      date: workDate,
    });
  };

  const clearAllFilters = () => {
    setSelectedCategory('');
    setSelectedSkills([]);
    setRadius(20);
    setPayMin('');
    setPayMax('');
    setPayUnit('');
    setWorkDate('');
    updateUrl({ q: searchText });
  };

  const removeFilterChip = (type: string, val?: string) => {
    const updated = {
      q: searchText,
      category: selectedCategory,
      skills: selectedSkills,
      radius,
      payMin,
      payMax,
      payUnit,
      date: workDate,
    };

    if (type === 'category') {
      setSelectedCategory('');
      updated.category = '';
    } else if (type === 'skill' && val) {
      const nextSkills = selectedSkills.filter((s) => s !== val);
      setSelectedSkills(nextSkills);
      updated.skills = nextSkills;
    } else if (type === 'date') {
      setWorkDate('');
      updated.date = '';
    } else if (type === 'pay') {
      setPayMin('');
      setPayMax('');
      setPayUnit('');
      updated.payMin = '';
      updated.payMax = '';
      updated.payUnit = '';
    } else if (type === 'radius') {
      setRadius(20);
      updated.radius = 20;
    }

    updateUrl(updated);
  };

  const renderFiltersContent = () => (
    <div className="flex flex-col gap-5 text-sm">
      {/* Category Selection */}
      <div>
        <label className="block text-xs font-bold text-[var(--color-neutral-500)] uppercase tracking-wider mb-2">Category</label>
        <div className="flex flex-wrap gap-2">
          {Object.keys(categoriesMap).map((cat) => (
            <button
              key={cat}
              onClick={() => {
                const nextVal = selectedCategory === cat.toLowerCase() ? '' : cat.toLowerCase();
                setSelectedCategory(nextVal);
                updateUrl({
                  q: searchText,
                  category: nextVal,
                  skills: selectedSkills,
                  radius,
                  payMin,
                  payMax,
                  payUnit,
                  date: workDate,
                });
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition border ${
                selectedCategory === cat.toLowerCase()
                  ? 'bg-[var(--color-primary-500)] text-white border-[var(--color-primary-500)]'
                  : 'bg-white text-[var(--color-neutral-700)] border-[var(--color-neutral-200)] hover:border-[var(--color-neutral-300)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Skills selection filter */}
      {selectedCategory && categoriesMap[Object.keys(categoriesMap).find((k) => k.toLowerCase() === selectedCategory) || ''] && (
        <div>
          <label className="block text-xs font-bold text-[var(--color-neutral-500)] uppercase tracking-wider mb-2">Skills in {selectedCategory}</label>
          <div className="flex flex-wrap gap-2">
            {categoriesMap[Object.keys(categoriesMap).find((k) => k.toLowerCase() === selectedCategory) || ''].map((s) => (
              <button
                key={s.slug}
                onClick={() => toggleSkill(s.slug)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${
                  selectedSkills.includes(s.slug)
                    ? 'bg-[var(--color-primary-100)] text-[var(--color-primary-700)] border-[var(--color-primary-300)]'
                    : 'bg-white text-[var(--color-neutral-600)] border-[var(--color-neutral-200)] hover:border-[var(--color-neutral-300)]'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Distance Radius Slider */}
      {lat && lng && (
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs font-bold text-[var(--color-neutral-500)] uppercase tracking-wider">Distance Radius</label>
            <span className="text-xs font-bold text-[var(--color-primary-600)]">{radius} km</span>
          </div>
          <input
            type="range"
            min="5"
            max="100"
            step="5"
            value={radius}
            onChange={(e) => {
              const r = Number(e.target.value);
              setRadius(r);
              updateUrl({
                q: searchText,
                category: selectedCategory,
                skills: selectedSkills,
                radius: r,
                payMin,
                payMax,
                payUnit,
                date: workDate,
              });
            }}
            className="w-full h-1.5 bg-[var(--color-neutral-200)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary-500)]"
          />
          <div className="flex justify-between text-[10px] text-[var(--color-neutral-400)] font-medium mt-1">
            <span>5 km</span>
            <span>20 km</span>
            <span>50 km</span>
            <span>100 km</span>
          </div>
        </div>
      )}

      {/* Work Date */}
      <div>
        <label className="block text-xs font-bold text-[var(--color-neutral-500)] uppercase tracking-wider mb-2">Work Date</label>
        <input
          type="date"
          value={workDate}
          onChange={(e) => {
            setWorkDate(e.target.value);
            updateUrl({
              q: searchText,
              category: selectedCategory,
              skills: selectedSkills,
              radius,
              payMin,
              payMax,
              payUnit,
              date: e.target.value,
            });
          }}
          className="w-full px-3 py-2 border border-[var(--color-neutral-200)] rounded-xl text-xs font-medium text-[var(--color-neutral-700)] focus:border-[var(--color-primary-500)] focus:outline-none"
        />
      </div>

      {/* Pay Filters */}
      <div>
        <label className="block text-xs font-bold text-[var(--color-neutral-500)] uppercase tracking-wider mb-2">Minimum Pay</label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min Pay Rate (₹)"
            value={payMin}
            onChange={(e) => {
              setPayMin(e.target.value);
              updateUrl({
                q: searchText,
                category: selectedCategory,
                skills: selectedSkills,
                radius,
                payMin: e.target.value,
                payMax,
                payUnit,
                date: workDate,
              });
            }}
            className="w-1/2 px-3 py-2 border border-[var(--color-neutral-200)] rounded-xl text-xs font-medium text-[var(--color-neutral-700)] focus:border-[var(--color-primary-500)] focus:outline-none"
          />
          <select
            value={payUnit}
            onChange={(e) => {
              setPayUnit(e.target.value);
              updateUrl({
                q: searchText,
                category: selectedCategory,
                skills: selectedSkills,
                radius,
                payMin,
                payMax,
                payUnit: e.target.value,
                date: workDate,
              });
            }}
            className="w-1/2 px-3 py-2 border border-[var(--color-neutral-200)] rounded-xl text-xs font-medium text-[var(--color-neutral-700)] focus:border-[var(--color-primary-500)] focus:outline-none bg-white"
          >
            <option value="">Any Unit</option>
            <option value="HOUR">Hourly</option>
            <option value="DAY">Daily</option>
            <option value="FIXED">Fixed</option>
          </select>
        </div>
      </div>

      {/* Clear Button */}
      <button
        onClick={clearAllFilters}
        className="w-full py-2.5 bg-[var(--color-neutral-100)] text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-200)] font-bold text-xs rounded-xl transition"
      >
        Clear All Filters
      </button>
    </div>
  );

  return (
    <div className="min-h-screen pb-safe bg-[var(--color-neutral-50)] flex flex-col">
      {/* Search Header */}
      <header className="sticky top-0 bg-white border-b border-[var(--color-neutral-200)] shadow-sm z-30 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push('/feed')}
          className="p-1.5 rounded-xl hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] transition"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search jobs..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[var(--color-neutral-200)] rounded-2xl text-sm focus:border-[var(--color-primary-500)] focus:outline-none bg-[var(--color-neutral-50)]"
          />
          <Search className="absolute left-3.5 top-2.5 text-[var(--color-neutral-400)]" size={16} />
          {searchText && (
            <button
              onClick={() => setSearchText('')}
              className="absolute right-3.5 top-2.5 text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-600)]"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <button
          onClick={() => setIsFilterOpen(true)}
          className={`p-2.5 rounded-xl border transition flex items-center justify-center relative md:hidden ${
            selectedCategory || selectedSkills.length > 0 || radius !== 20 || payMin || workDate
              ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)] text-[var(--color-primary-600)]'
              : 'border-[var(--color-neutral-200)] text-[var(--color-neutral-600)] hover:bg-[var(--color-neutral-50)]'
          }`}
        >
          <SlidersHorizontal size={18} />
          {(selectedCategory || selectedSkills.length > 0 || radius !== 20 || payMin || workDate) && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[var(--color-primary-500)] rounded-full border border-white" />
          )}
        </button>
      </header>

      {/* Main Content Layout */}
      <div className="max-w-[var(--content-max)] mx-auto w-full px-4 flex-1 flex gap-6 mt-4 pb-20">
        {/* Sidebar filters (Desktop only) */}
        <aside className="w-64 hidden md:flex flex-col gap-4 bg-white border border-[var(--color-neutral-200)] rounded-2xl p-4 shadow-sm self-start sticky top-20">
          <div className="flex justify-between items-center border-b border-[var(--color-neutral-100)] pb-2.5">
            <h3 className="font-bold text-[var(--color-neutral-900)]">Filters</h3>
            {(selectedCategory || selectedSkills.length > 0 || radius !== 20 || payMin || workDate) && (
              <button
                onClick={clearAllFilters}
                className="text-[10px] font-bold text-[var(--color-primary-600)] uppercase hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
          {renderFiltersContent()}
        </aside>

        {/* Results List */}
        <main className="flex-1 flex flex-col gap-4">
          {/* Active Filter Chips */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-bold text-[var(--color-neutral-800)]">
              {isJobsLoading ? 'Searching...' : `${totalCount} job${totalCount !== 1 ? 's' : ''} found`}
            </span>

            {selectedCategory && (
              <span className="inline-flex items-center gap-1 bg-[var(--color-neutral-100)] text-[var(--color-neutral-700)] text-xs font-semibold px-2.5 py-1 rounded-full border border-[var(--color-neutral-200)]">
                Category: {selectedCategory}
                <button onClick={() => removeFilterChip('category')} className="hover:text-[var(--color-error-500)] ml-0.5">
                  <X size={12} />
                </button>
              </span>
            )}

            {selectedSkills.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 bg-[var(--color-neutral-100)] text-[var(--color-neutral-700)] text-xs font-semibold px-2.5 py-1 rounded-full border border-[var(--color-neutral-200)]">
                Skill: {s}
                <button onClick={() => removeFilterChip('skill', s)} className="hover:text-[var(--color-error-500)] ml-0.5">
                  <X size={12} />
                </button>
              </span>
            ))}

            {workDate && (
              <span className="inline-flex items-center gap-1 bg-[var(--color-neutral-100)] text-[var(--color-neutral-700)] text-xs font-semibold px-2.5 py-1 rounded-full border border-[var(--color-neutral-200)]">
                Date: {workDate}
                <button onClick={() => removeFilterChip('date')} className="hover:text-[var(--color-error-500)] ml-0.5">
                  <X size={12} />
                </button>
              </span>
            )}

            {payMin && (
              <span className="inline-flex items-center gap-1 bg-[var(--color-neutral-100)] text-[var(--color-neutral-700)] text-xs font-semibold px-2.5 py-1 rounded-full border border-[var(--color-neutral-200)]">
                Min Pay: ₹{payMin}
                <button onClick={() => removeFilterChip('pay')} className="hover:text-[var(--color-error-500)] ml-0.5">
                  <X size={12} />
                </button>
              </span>
            )}

            {radius !== 20 && (
              <span className="inline-flex items-center gap-1 bg-[var(--color-neutral-100)] text-[var(--color-neutral-700)] text-xs font-semibold px-2.5 py-1 rounded-full border border-[var(--color-neutral-200)]">
                Radius: {radius} km
                <button onClick={() => removeFilterChip('radius')} className="hover:text-[var(--color-error-500)] ml-0.5">
                  <X size={12} />
                </button>
              </span>
            )}
          </div>

          {/* Results Render */}
          <div className="flex flex-col gap-3">
            {isJobsLoading ? (
              Array.from({ length: 4 }).map((_, i) => <JobCard key={i} job={{} as any} variant="skeleton" />)
            ) : jobsList.length > 0 ? (
              jobsList.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onApply={(id) => router.push(`/jobs/${job.citySlug}/${job.categorySlug}/${job.slug}`)}
                />
              ))
            ) : (
              <EmptyState
                title="No Search Results"
                description="We couldn't find any jobs matching your search criteria. Try modifying your filters or text search."
                action={{
                  label: 'Reset All Filters',
                  onClick: clearAllFilters,
                }}
              />
            )}

            {/* Load more */}
            {hasNextPage && (
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="w-full py-3 bg-white hover:bg-[var(--color-neutral-100)] text-[var(--color-primary-600)] font-bold text-xs rounded-2xl border border-[var(--color-neutral-200)] shadow-sm transition flex items-center justify-center gap-2"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="animate-spin" size={14} />
                    Loading more...
                  </>
                ) : (
                  'Load More Jobs'
                )}
              </button>
            )}
          </div>
        </main>
      </div>

      {/* Bottom Sheet for Mobile Filters */}
      <BottomSheet isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} title="Filter Jobs">
        {renderFiltersContent()}
      </BottomSheet>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-neutral-50)]">
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-primary-500)] border-t-transparent" />
      </div>
    }>
      <SearchComponent />
    </Suspense>
  );
}
