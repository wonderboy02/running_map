'use client';

import { useState, useCallback, useRef } from 'react';

export interface GeocodeResult {
  roadAddress: string;
  jibunAddress: string;
  latitude: number;
  longitude: number;
  source?: 'geocode' | 'place';
  placeName?: string;
  category?: string;
  phone?: string;
}

export function useGeocode() {
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((query: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (!query || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?query=${encodeURIComponent(query.trim())}`);
        const data = await res.json();

        if (data.addresses) {
          setResults(data.addresses);
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500);
  }, []);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setResults([]);
    setLoading(false);
  }, []);

  return { results, loading, search, clear };
}
