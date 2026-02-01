"use client";

import Link from "next/link";
import type { Spot } from "@/types";

interface SpotCardProps {
  spot: Spot;
}

export default function SpotCard({ spot }: SpotCardProps) {
  return (
    <div>
      <div className="mb-1 flex items-start justify-between">
        <h3 className="text-text text-lg font-bold">{spot.name}</h3>
        {spot.is_highlighted && (
          <span className="bg-highlight/10 text-highlight-dark ml-2 flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium">
            추천
          </span>
        )}
      </div>

      <p className="text-text-secondary mb-2 text-sm">{spot.address}</p>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {spot.categories.map((cat) => (
          <span
            key={cat}
            className="bg-surface-dim text-text-secondary rounded-full px-2.5 py-0.5 text-xs"
          >
            {cat}
          </span>
        ))}
      </div>

      {spot.phone && (
        <p className="text-text-secondary mb-3 text-sm">
          <span className="mr-1.5">&#128222;</span>
          <a href={`tel:${spot.phone}`} className="underline">
            {spot.phone}
          </a>
        </p>
      )}

      <Link
        href={`/spot/${spot.id}`}
        className="text-primary block text-center text-sm font-medium"
      >
        상세 정보 보기
      </Link>
    </div>
  );
}
