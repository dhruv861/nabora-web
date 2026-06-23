import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LocationState {
  lat: number | null;
  lng: number | null;
  city: string | null;
  citySlug: string | null;
  area: string | null;
  isLoading: boolean;
  error: string | null;
}

interface LocationActions {
  setLocation(coords: {
    lat: number;
    lng: number;
    city: string;
    citySlug: string;
    area: string;
  }): void;
  requestLocation(): Promise<void>;
  clearError(): void;
}

type LocationStore = LocationState & LocationActions;

export const useLocationStore = create<LocationStore>()(
  persist(
    (set) => ({
      // ── State ──────────────────────────────────────────────────────────────
      lat: null,
      lng: null,
      city: null,
      citySlug: null,
      area: null,
      isLoading: false,
      error: null,

      // ── Actions ────────────────────────────────────────────────────────────
      setLocation: (coords) =>
        set({
          lat: coords.lat,
          lng: coords.lng,
          city: coords.city,
          citySlug: coords.citySlug,
          area: coords.area,
          error: null,
        }),

      clearError: () => set({ error: null }),

      requestLocation: async () => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
          set({ error: 'Geolocation is not supported by your browser.' });
          return;
        }

        set({ isLoading: true, error: null });

        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false,
              timeout: 10000,
              maximumAge: 5 * 60 * 1000, // reuse cached position up to 5 min
            }),
          );

          const { latitude: lat, longitude: lng } = position.coords;

          // Reverse-geocode using OpenStreetMap Nominatim (no API key required)
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } },
          );
          const data = (await res.json()) as {
            address: {
              city?: string;
              town?: string;
              village?: string;
              suburb?: string;
              neighbourhood?: string;
              state_district?: string;
            };
          };

          const addr = data.address;
          const city = addr.city ?? addr.town ?? addr.village ?? addr.state_district ?? 'Unknown';
          const area = addr.suburb ?? addr.neighbourhood ?? addr.town ?? city;
          const citySlug = city.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

          set({ lat, lng, city, citySlug, area, isLoading: false });
        } catch (err: unknown) {
          const msg =
            err instanceof GeolocationPositionError
              ? err.code === 1
                ? 'Location access denied. Please enable location in browser settings.'
                : 'Could not determine your location. Try again.'
              : 'Could not determine your location. Try again.';
          set({ isLoading: false, error: msg });
        }
      },
    }),
    {
      name: 'nabora-location',
      // Only persist coordinates and city — NOT isLoading or error
      partialize: (state) => ({
        lat: state.lat,
        lng: state.lng,
        city: state.city,
        citySlug: state.citySlug,
        area: state.area,
      }),
    },
  ),
);
