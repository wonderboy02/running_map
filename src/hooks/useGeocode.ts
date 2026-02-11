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
  const controllerRef = useRef<AbortController | null>(null);

  const search = useCallback((query: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    controllerRef.current?.abort();

    if (!query || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    timerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      controllerRef.current = controller;

      try {
        const res = await fetch(
          `/api/geocode?query=${encodeURIComponent(query.trim())}`,
          { signal: controller.signal },
        );
        const data = await res.json();
        setResults(data.addresses || []);
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setResults([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 500);
  }, []);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    controllerRef.current?.abort();
    setResults([]);
    setLoading(false);
  }, []);

  return { results, loading, search, clear };
}
