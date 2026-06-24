'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { LoadingState } from '@/components/LoadingState';
import { ArrowLeft, Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PortfolioPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile', user?.id],
    queryFn: async () => {
      const res = await api.get(`/users/${user!.id}`);
      return res.data.data as any;
    },
    enabled: !!user?.id,
  });

  const items: any[] = profile?.workerProfile?.portfolioItems ?? [];

  const deleteMutation = useMutation({
    mutationFn: async (itemId: string) => { await api.delete(`/users/me/portfolio/${itemId}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      toast.success('Item removed.');
    },
    onError: () => toast.error('Failed to remove item.'),
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('File too large (max 5MB)'); return; }

    setUploading(true);
    try {
      // Step 1: upload to R2 via upload endpoint
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'PORTFOLIO');
      const uploadRes = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const imageUrl: string = uploadRes.data.data.url;

      // Step 2: create portfolio item
      await api.post('/users/me/portfolio', { imageUrl });
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      toast.success('Portfolio item added!');
    } catch {
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (isLoading) return <LoadingState />;

  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)] flex flex-col">
      <header className="sticky top-0 bg-white border-b border-[var(--color-neutral-200)] shadow-sm z-20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/profile')} className="p-1.5 rounded-xl hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] transition">
            <ArrowLeft size={20} />
          </button>
          <span className="font-bold text-sm text-[var(--color-neutral-800)]">Portfolio</span>
        </div>
        <Button size="sm" onClick={() => fileInputRef.current?.click()} isLoading={uploading}>
          {uploading ? 'Uploading...' : '+ Add'}
        </Button>
      </header>

      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />

      <main className="max-w-2xl mx-auto w-full px-4 py-5">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-neutral-100)] flex items-center justify-center">
              <Camera size={28} className="text-[var(--color-neutral-400)]" />
            </div>
            <div className="text-center">
              <p className="font-bold text-sm text-[var(--color-neutral-700)]">No portfolio items yet</p>
              <p className="text-xs text-[var(--color-neutral-400)] mt-1">Upload photos of your work to attract employers</p>
            </div>
            <Button onClick={() => fileInputRef.current?.click()} isLoading={uploading}>Upload First Photo</Button>
          </div>
        ) : (
          <>
            <p className="text-xs text-[var(--color-neutral-400)] mb-4">Tap × to remove an item · {items.length} photo{items.length !== 1 ? 's' : ''}</p>
            <div className="grid grid-cols-3 gap-2">
              {items.map((item: any) => (
                <div key={item.id} className="relative aspect-square rounded-xl overflow-hidden bg-[var(--color-neutral-200)] group">
                  <img src={item.imageUrl} alt={item.title ?? 'Portfolio'} className="w-full h-full object-cover" />
                  <button
                    onClick={() => deleteMutation.mutate(item.id)}
                    disabled={deleteMutation.isPending}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-xs hover:bg-black/80 transition opacity-0 group-hover:opacity-100"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="aspect-square rounded-xl border-2 border-dashed border-[var(--color-neutral-300)] flex items-center justify-center text-[var(--color-neutral-400)] hover:border-[var(--color-primary-400)] hover:text-[var(--color-primary-500)] transition"
              >
                {uploading ? <Loader2 size={20} className="animate-spin" /> : <span className="text-2xl">+</span>}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
