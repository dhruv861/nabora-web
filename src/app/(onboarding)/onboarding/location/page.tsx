'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

const STEPS = ['Account Type', 'Profile', 'Skills', 'Location', 'Availability'];
function StepProgress({ current }: { current: number }) {
  return (
    <div className="flex gap-2 mb-8">
      {STEPS.map((_, idx) => (
        <div key={idx} className={`flex-1 h-1 rounded-full transition-all duration-300 ${idx <= current ? 'bg-[var(--color-primary-500)]' : 'bg-[var(--color-neutral-200)]'}`} />
      ))}
    </div>
  );
}

export default function LocationPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number; city?: string; area?: string } | null>(null);
  const [error, setError] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }
    setIsDetecting(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLocation({ lat, lng });

        // Reverse geocode via Nominatim (free, no API key)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
            { headers: { 'User-Agent': 'Nabora/1.0' } },
          );
          const data = await res.json() as {
            address: { city?: string; town?: string; village?: string; suburb?: string; neighbourhood?: string };
          };
          const addr = data.address;
          const detectedCity = addr.city ?? addr.town ?? addr.village ?? '';
          const detectedArea = addr.suburb ?? addr.neighbourhood ?? '';
          setCity(detectedCity);
          setArea(detectedArea);
        } catch {
          // Nominatim failed — user can fill manually
        }
        setIsDetecting(false);
      },
      (err) => {
        setError(err.message);
        setIsDetecting(false);
      },
    );
  };

  const handleNext = async () => {
    if (!location) { setError('Please detect or enter your location'); return; }
    setIsSaving(true);
    try {
      const res = await api.patch<{ data: object }>('/users/me/location', {
        lat: location.lat,
        lng: location.lng,
        city,
        citySlug: city.toLowerCase().replace(/\s+/g, '-'),
        area,
      });
      setUser(res.data.data as Parameters<typeof setUser>[0]);
      router.push('/onboarding/availability');
    } catch {
      setError('Failed to save location. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 py-8">
      <div className="w-full max-w-sm">
        <StepProgress current={3} />
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-neutral-900)]">Your Location</h1>
          <p className="text-sm text-[var(--color-neutral-500)] mt-1">Help us find nearby opportunities</p>
        </div>

        {/* Detect button */}
        <button
          onClick={detectLocation}
          disabled={isDetecting}
          id="detect-location-btn"
          className={[
            'w-full flex items-center gap-3 p-4 rounded-2xl border-2 mb-4 transition-all',
            location
              ? 'border-[var(--color-primary-400)] bg-[var(--color-primary-50)]'
              : 'border-[var(--color-neutral-200)] hover:border-[var(--color-neutral-300)]',
          ].join(' ')}
        >
          <span className="text-2xl">{isDetecting ? '⏳' : location ? '📍' : '🗺️'}</span>
          <div className="text-left">
            <p className="font-medium text-sm text-[var(--color-neutral-800)]">
              {isDetecting ? 'Detecting…' : location ? 'Location detected' : 'Use my current location'}
            </p>
            {location && city && (
              <p className="text-xs text-[var(--color-neutral-500)] mt-0.5">{area ? `${area}, ` : ''}{city}</p>
            )}
          </div>
        </button>

        {/* Manual city/area */}
        <div className="space-y-3 mb-6">
          <input
            type="text"
            placeholder="City (e.g. Ahmedabad)"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-[var(--color-neutral-300)] text-sm outline-none focus:border-[var(--color-primary-400)] focus:ring-2 focus:ring-[var(--color-primary-100)] transition-all"
          />
          <input
            type="text"
            placeholder="Area / Neighbourhood (optional)"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-[var(--color-neutral-300)] text-sm outline-none focus:border-[var(--color-primary-400)] focus:ring-2 focus:ring-[var(--color-primary-100)] transition-all"
          />
        </div>

        {error && <p className="text-sm text-[var(--color-error-500)] mb-4">{error}</p>}

        <Button fullWidth size="lg" isLoading={isSaving} onClick={handleNext}>Continue →</Button>
        <button onClick={() => router.push('/onboarding/availability')} className="mt-3 w-full text-center text-sm text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-600)]">
          Skip for now
        </button>
      </div>
    </div>
  );
}
