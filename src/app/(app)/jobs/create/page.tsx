'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArrowLeft, Check, Plus, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/Button';
import { JobCard } from '@/components/JobCard';
import { toast } from 'sonner';

// ─── Zod Quality Gate Schema ────────────────────────────────────────────────
const jobFormSchema = zod.object({
  title: zod
    .string()
    .min(1, 'Title is required')
    .refine((val) => val.trim().split(/\s+/).filter(Boolean).length >= 5, {
      message: 'Title must be at least 5 words for Quality Gate',
    }),
  description: zod
    .string()
    .min(100, 'Description must be at least 100 characters for Quality Gate'),
  categorySlug: zod.string().min(1, 'Category is required'),
  area: zod.string().min(2, 'Area must be at least 2 characters'),
  city: zod.string().min(2, 'City is required'),
  citySlug: zod.string(),
  payRate: zod.number().min(1, 'Pay rate must be greater than 0'),
  payUnit: zod.enum(['HOUR', 'DAY', 'FIXED']),
  workDate: zod.string().min(1, 'Work date is required'),
  vacancies: zod.number().min(1, 'Vacancies must be at least 1'),
  skillIds: zod.array(zod.string()).min(1, 'Select at least one skill'),
});

type JobFormValues = zod.infer<typeof jobFormSchema>;

function CreateJobComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editJobId = searchParams.get('edit');

  const [step, setStep] = useState(1);

  // Form initialization
  const methods = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      title: '',
      description: '',
      categorySlug: '',
      area: '',
      city: 'Ahmedabad',
      citySlug: 'ahmedabad',
      payRate: 500,
      payUnit: 'DAY',
      workDate: '',
      vacancies: 1,
      skillIds: [],
    },
    mode: 'onTouched',
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    reset,
    formState: { errors },
  } = methods;

  const watchedValues = watch();

  // If in edit mode, fetch the existing draft
  const { isLoading: isFetchingDraft } = useQuery({
    queryKey: ['job-draft', editJobId],
    queryFn: async () => {
      const res = await api.get(`/jobs/my`);
      const list = res.data.data as any[];
      const draft = list.find((j) => j.id === editJobId);
      if (draft) {
        if (draft.status !== 'DRAFT') {
          toast.error('Only draft jobs can be edited.');
          router.push('/feed');
          return null;
        }
        reset({
          title: draft.title,
          description: draft.description,
          categorySlug: draft.categorySlug,
          area: draft.area,
          city: draft.city,
          citySlug: draft.citySlug,
          payRate: draft.payRate,
          payUnit: draft.payUnit as any,
          workDate: new Date(draft.workDate).toISOString().split('T')[0],
          vacancies: draft.vacancies ?? 1,
          skillIds: draft.skills?.map((s: any) => s.skillId) || [],
        });
      }
      return draft;
    },
    enabled: !!editJobId,
  });

  // Fetch skills catalog
  const { data: skillsCatalog } = useQuery({
    queryKey: ['skills-catalog'],
    queryFn: async () => {
      const res = await api.get('/skills');
      return res.data.data as { id: string; name: string; slug: string; category: string }[];
    },
  });

  // Unique categories
  const categories = Array.from(new Set(skillsCatalog?.map((s) => s.category) || []));

  // Filter skills by category selection
  const filteredSkills = skillsCatalog?.filter(
    (s) => s.category.toLowerCase() === watchedValues.categorySlug.toLowerCase()
  ) || [];

  // Mutations for Create / Update
  const mutation = useMutation({
    mutationFn: async (data: JobFormValues) => {
      if (editJobId) {
        await api.patch(`/jobs/${editJobId}`, data);
      } else {
        await api.post('/jobs', data);
      }
    },
    onSuccess: () => {
      toast.success(editJobId ? 'Draft updated successfully!' : 'Draft created successfully!');
      router.push('/jobs/my');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save job draft.');
    },
  });

  // Auto-slugify city
  useEffect(() => {
    if (watchedValues.city) {
      const slug = watchedValues.city
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      setValue('citySlug', slug);
    }
  }, [watchedValues.city, setValue]);

  const handleNextStep = async () => {
    let fieldsToValidate: any[] = [];
    if (step === 1) {
      fieldsToValidate = ['title', 'description', 'categorySlug'];
    } else if (step === 2) {
      fieldsToValidate = ['area', 'city'];
    } else if (step === 3) {
      fieldsToValidate = ['payRate', 'payUnit', 'workDate', 'vacancies'];
    } else if (step === 4) {
      fieldsToValidate = ['skillIds'];
    }

    const isValid = await trigger(fieldsToValidate as any);
    if (isValid) {
      setStep((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setStep((prev) => prev - 1);
  };

  const toggleSkillSelection = (skillId: string) => {
    const current = watchedValues.skillIds || [];
    const next = current.includes(skillId)
      ? current.filter((id) => id !== skillId)
      : [...current, skillId];
    setValue('skillIds', next, { shouldValidate: true });
  };

  const onFormSubmit = (data: JobFormValues) => {
    mutation.mutate(data);
  };

  if (isFetchingDraft) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-primary-500)] border-t-transparent" />
      </div>
    );
  }

  // Pre-process selected skills names to show in preview card
  const selectedSkillsNames = (watchedValues.skillIds || []).map((id) => {
    const s = skillsCatalog?.find((sc) => sc.id === id);
    return { name: s?.name || '', slug: s?.slug || '' };
  });

  // Dummy job representation for preview card
  const previewJobData = {
    id: 'preview',
    slug: 'preview',
    title: watchedValues.title || 'Job Title Preview',
    citySlug: watchedValues.citySlug,
    categorySlug: watchedValues.categorySlug,
    area: watchedValues.area || 'Area Label',
    city: watchedValues.city || 'City Label',
    workDate: watchedValues.workDate || new Date().toISOString(),
    payRate: Number(watchedValues.payRate) || 0,
    payUnit: watchedValues.payUnit,
    isFeatured: false,
    organizationName: 'Your Organization / Personal',
    status: 'DRAFT',
    vacancies: Number(watchedValues.vacancies),
    skills: selectedSkillsNames,
  };

  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)] pb-20">
      <header className="sticky top-0 bg-white border-b border-[var(--color-neutral-200)] shadow-sm z-20 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => {
            if (step > 1) {
              handlePrevStep();
            } else {
              router.back();
            }
          }}
          className="p-1.5 rounded-xl hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] transition"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="font-bold text-sm text-[var(--color-neutral-800)]">
          {editJobId ? 'Edit Job Draft' : 'Post a Job'}
        </span>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6">
        {/* Progress Steps Indicators */}
        <div className="flex justify-between items-center mb-6 px-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <React.Fragment key={i}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                  step === i
                    ? 'bg-[var(--color-primary-500)] text-white border-[var(--color-primary-500)] ring-4 ring-purple-100 shadow-sm'
                    : step > i
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : 'bg-white text-[var(--color-neutral-400)] border-[var(--color-neutral-200)]'
                }`}
              >
                {step > i ? '✓' : i === 5 ? 'P' : i}
              </div>
              {i < 5 && (
                <div
                  className={`flex-1 h-[2px] mx-1 rounded transition-colors ${
                    step > i ? 'bg-emerald-400' : 'bg-[var(--color-neutral-200)]'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-col gap-5">
            {/* Step 1: Info */}
            {step === 1 && (
              <div className="bg-white border border-[var(--color-neutral-200)] rounded-3xl p-5 shadow-sm flex flex-col gap-4">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="text-[var(--color-primary-500)] animate-pulse" size={18} />
                  <h3 className="font-bold text-base text-[var(--color-neutral-900)]">Step 1: Details & Category</h3>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--color-neutral-700)] mb-1.5 uppercase tracking-wider">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Promoter for Brand Activation (min 5 words)"
                    {...register('title')}
                    className="w-full px-3 py-2.5 border border-[var(--color-neutral-200)] rounded-xl text-sm focus:border-[var(--color-primary-500)] focus:outline-none"
                  />
                  {errors.title && (
                    <p className="text-[10px] text-[var(--color-error-500)] font-bold mt-1">{errors.title.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--color-neutral-700)] mb-1.5 uppercase tracking-wider">
                    Job Category *
                  </label>
                  <select
                    {...register('categorySlug')}
                    className="w-full px-3 py-2.5 border border-[var(--color-neutral-200)] rounded-xl text-sm focus:border-[var(--color-primary-500)] focus:outline-none bg-white"
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat.toLowerCase()}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  {errors.categorySlug && (
                    <p className="text-[10px] text-[var(--color-error-500)] font-bold mt-1">{errors.categorySlug.message}</p>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-[var(--color-neutral-700)] uppercase tracking-wider">
                      Detailed Description *
                    </label>
                    <span className="text-[10px] text-[var(--color-neutral-400)] font-semibold">
                      {(watchedValues.description || '').length} / 100 characters min
                    </span>
                  </div>
                  <textarea
                    placeholder="Enter responsibilities, timings, dress code, location landmarks... (min 100 characters)"
                    {...register('description')}
                    rows={6}
                    className="w-full px-3 py-2 border border-[var(--color-neutral-200)] rounded-xl text-sm focus:border-[var(--color-primary-500)] focus:outline-none resize-none"
                  />
                  {errors.description && (
                    <p className="text-[10px] text-[var(--color-error-500)] font-bold mt-1">{errors.description.message}</p>
                  )}
                </div>

                <Button onClick={handleNextStep} fullWidth className="mt-2 py-3">
                  Next Step
                </Button>
              </div>
            )}

            {/* Step 2: Location */}
            {step === 2 && (
              <div className="bg-white border border-[var(--color-neutral-200)] rounded-3xl p-5 shadow-sm flex flex-col gap-4">
                <h3 className="font-bold text-base text-[var(--color-neutral-900)] mb-1">Step 2: Location</h3>

                <div>
                  <label className="block text-xs font-bold text-[var(--color-neutral-700)] mb-1.5 uppercase tracking-wider">
                    Area *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Vastrapur, C.G. Road (min 2 chars)"
                    {...register('area')}
                    className="w-full px-3 py-2.5 border border-[var(--color-neutral-200)] rounded-xl text-sm focus:border-[var(--color-primary-500)] focus:outline-none"
                  />
                  {errors.area && (
                    <p className="text-[10px] text-[var(--color-error-500)] font-bold mt-1">{errors.area.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--color-neutral-700)] mb-1.5 uppercase tracking-wider">
                    City *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ahmedabad, Gandhinagar"
                    {...register('city')}
                    className="w-full px-3 py-2.5 border border-[var(--color-neutral-200)] rounded-xl text-sm focus:border-[var(--color-primary-500)] focus:outline-none"
                  />
                  {errors.city && (
                    <p className="text-[10px] text-[var(--color-error-500)] font-bold mt-1">{errors.city.message}</p>
                  )}
                </div>

                <div className="flex gap-3 mt-2">
                  <Button onClick={handlePrevStep} variant="secondary" className="flex-1 py-3">
                    Back
                  </Button>
                  <Button onClick={handleNextStep} className="flex-1 py-3">
                    Next
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Pay, Date, Openings */}
            {step === 3 && (
              <div className="bg-white border border-[var(--color-neutral-200)] rounded-3xl p-5 shadow-sm flex flex-col gap-4">
                <h3 className="font-bold text-base text-[var(--color-neutral-900)] mb-1">Step 3: Pay & Schedule</h3>

                <div>
                  <label className="block text-xs font-bold text-[var(--color-neutral-700)] mb-1.5 uppercase tracking-wider">
                    Pay Unit *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['DAY', 'HOUR', 'FIXED'].map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => setValue('payUnit', unit as any, { shouldValidate: true })}
                        className={`py-2 rounded-xl text-xs font-bold transition border ${
                          watchedValues.payUnit === unit
                            ? 'bg-[var(--color-primary-100)] text-[var(--color-primary-700)] border-[var(--color-primary-400)] shadow-sm'
                            : 'bg-white text-[var(--color-neutral-700)] border-[var(--color-neutral-200)] hover:border-[var(--color-neutral-300)]'
                        }`}
                      >
                        {unit === 'DAY' ? 'Per Day' : unit === 'HOUR' ? 'Per Hour' : 'Fixed Pay'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--color-neutral-700)] mb-1.5 uppercase tracking-wider">
                    Pay Rate (₹) *
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 800"
                    {...register('payRate', { valueAsNumber: true })}
                    className="w-full px-3 py-2.5 border border-[var(--color-neutral-200)] rounded-xl text-sm focus:border-[var(--color-primary-500)] focus:outline-none"
                  />
                  {errors.payRate && (
                    <p className="text-[10px] text-[var(--color-error-500)] font-bold mt-1">{errors.payRate.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--color-neutral-700)] mb-1.5 uppercase tracking-wider">
                    Work Date *
                  </label>
                  <input
                    type="date"
                    {...register('workDate')}
                    className="w-full px-3 py-2.5 border border-[var(--color-neutral-200)] rounded-xl text-sm focus:border-[var(--color-primary-500)] focus:outline-none"
                  />
                  {errors.workDate && (
                    <p className="text-[10px] text-[var(--color-error-500)] font-bold mt-1">{errors.workDate.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--color-neutral-700)] mb-1.5 uppercase tracking-wider">
                    Vacancies / Openings *
                  </label>
                  <input
                    type="number"
                    placeholder="1"
                    {...register('vacancies', { valueAsNumber: true })}
                    className="w-full px-3 py-2.5 border border-[var(--color-neutral-200)] rounded-xl text-sm focus:border-[var(--color-primary-500)] focus:outline-none"
                  />
                  {errors.vacancies && (
                    <p className="text-[10px] text-[var(--color-error-500)] font-bold mt-1">{errors.vacancies.message}</p>
                  )}
                </div>

                <div className="flex gap-3 mt-2">
                  <Button onClick={handlePrevStep} variant="secondary" className="flex-1 py-3">
                    Back
                  </Button>
                  <Button onClick={handleNextStep} className="flex-1 py-3">
                    Next
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Skills Selection */}
            {step === 4 && (
              <div className="bg-white border border-[var(--color-neutral-200)] rounded-3xl p-5 shadow-sm flex flex-col gap-4">
                <h3 className="font-bold text-base text-[var(--color-neutral-900)] mb-1">Step 4: Required Skills</h3>

                <p className="text-xs text-[var(--color-neutral-500)]">
                  Select the required skills for this job card. (Choose category in step 1 if none show)
                </p>

                <div className="flex flex-wrap gap-2">
                  {filteredSkills.map((s) => {
                    const isSelected = (watchedValues.skillIds || []).includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSkillSelection(s.id)}
                        className={`flex items-center gap-1 px-3 py-2 rounded-full text-xs font-semibold border transition ${
                          isSelected
                            ? 'bg-[var(--color-primary-100)] text-[var(--color-primary-700)] border-[var(--color-primary-400)] shadow-sm'
                            : 'bg-white text-[var(--color-neutral-700)] border-[var(--color-neutral-200)] hover:border-[var(--color-neutral-300)]'
                        }`}
                      >
                        {isSelected && <Check size={12} />}
                        {s.name}
                      </button>
                    );
                  })}
                </div>
                {errors.skillIds && (
                  <p className="text-[10px] text-[var(--color-error-500)] font-bold mt-1">{errors.skillIds.message}</p>
                )}

                <div className="flex gap-3 mt-2">
                  <Button onClick={handlePrevStep} variant="secondary" className="flex-1 py-3">
                    Back
                  </Button>
                  <Button onClick={handleNextStep} className="flex-1 py-3">
                    Preview Card
                  </Button>
                </div>
              </div>
            )}

            {/* Step 5: Card Preview and Save */}
            {step === 5 && (
              <div className="flex flex-col gap-5">
                <div className="bg-[var(--color-primary-50)] border border-[var(--color-primary-100)] p-4 rounded-3xl flex items-start gap-3">
                  <AlertCircle className="text-[var(--color-primary-600)] shrink-0 mt-0.5" size={18} />
                  <div className="text-xs text-[var(--color-primary-800)] leading-relaxed">
                    <span className="font-bold block mb-0.5">Pre-Publish Preview</span>
                    Verify your job card layout. Once you save, the job is saved as a <span className="font-bold">Draft</span>. You can publish it afterwards.
                  </div>
                </div>

                {/* Job Card Preview Component */}
                <div className="pointer-events-none opacity-90 shadow-lg rounded-2xl">
                  <JobCard job={previewJobData as any} />
                </div>

                <div className="flex gap-3">
                  <Button onClick={handlePrevStep} variant="secondary" className="flex-1 py-3">
                    Back
                  </Button>
                  <Button
                    type="submit"
                    isLoading={mutation.isPending}
                    className="flex-1 py-3 font-bold"
                  >
                    Save Draft
                  </Button>
                </div>
              </div>
            )}
          </form>
        </FormProvider>
      </main>
    </div>
  );
}

export default function CreateJobPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-neutral-50)]">
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-primary-500)] border-t-transparent" />
      </div>
    }>
      <CreateJobComponent />
    </Suspense>
  );
}
