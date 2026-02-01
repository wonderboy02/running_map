"use client";

import { useMemo } from "react";
import type { Spot } from "@/types";

export function useSearch(spots: Spot[], query: string) {
  const results = useMemo(() => {
    if (!query.trim()) return spots;

    const q = query.trim().toLowerCase();

    return spots.filter(
      (spot) =>
        spot.name.toLowerCase().includes(q) ||
        spot.address.toLowerCase().includes(q) ||
        spot.categories.some((cat) => cat.toLowerCase().includes(q)),
    );
  }, [spots, query]);

  return results;
}
