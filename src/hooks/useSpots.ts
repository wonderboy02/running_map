"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { parseLockerSections } from "@/lib/locker-utils";
import type { Spot } from "@/types";

export function useSpots() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSpots() {
      setLoading(true);
      const { data, error } = await supabase
        .from("spots")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setSpots(
          (data ?? []).map((row) => ({
            ...row,
            locker_sections: parseLockerSections(row.locker_sections),
          })) as Spot[],
        );
      }
      setLoading(false);
    }

    fetchSpots();
  }, []);

  return { spots, loading, error };
}
