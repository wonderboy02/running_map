'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Overlay } from '@/types';

export function useOverlays() {
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOverlays() {
      setLoading(true);
      const { data, error } = await supabase
        .from('overlays')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setOverlays(data as Overlay[]);
      }
      setLoading(false);
    }

    fetchOverlays();
  }, []);

  return { overlays, loading, error };
}
