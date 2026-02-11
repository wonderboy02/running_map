'use client';

import { Route, MapPin, Tag } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { CATEGORIES } from '@/types';
import type { Spot, Overlay } from '@/types';

interface RecommendedTermsProps {
  overlays: Overlay[];
  spots: Spot[];
  onOverlayTap: (overlay: Overlay) => void;
  onSpotTap: (spot: Spot) => void;
  onCategoryTap: (category: string) => void;
}

export default function RecommendedTerms({
  overlays,
  spots,
  onOverlayTap,
  onSpotTap,
  onCategoryTap,
}: RecommendedTermsProps) {
  const highlightedSpots = spots.filter((s) => s.is_highlighted);

  return (
    <div className="py-2">
      {/* 섹션 1: 러닝 코스 */}
      {overlays.length > 0 && (
        <div className="px-4 py-3">
          <h3 className="text-text text-[clamp(13px,3.5vw,15px)] font-semibold mb-2.5">
            러닝 코스
          </h3>
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {overlays.map((overlay) => (
              <button
                key={overlay.id}
                onClick={() => onOverlayTap(overlay)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[clamp(12px,3vw,14px)] whitespace-nowrap flex-shrink-0 active:bg-primary/20 transition-colors"
              >
                <Route className="w-3.5 h-3.5" />
                <span>{overlay.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {overlays.length > 0 && highlightedSpots.length > 0 && <Separator />}

      {/* 섹션 2: 인기 장소 */}
      {highlightedSpots.length > 0 && (
        <div className="px-4 py-3">
          <h3 className="text-text text-[clamp(13px,3.5vw,15px)] font-semibold mb-2.5">
            인기 장소
          </h3>
          <div className="flex flex-col gap-1">
            {highlightedSpots.map((spot) => (
              <button
                key={spot.id}
                onClick={() => onSpotTap(spot)}
                className="flex items-start gap-2.5 py-2.5 text-left rounded-lg active:bg-surface-dim transition-colors px-1"
              >
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-highlight-dark" />
                <div className="min-w-0 flex-1">
                  <p className="text-text text-[clamp(13px,3.5vw,15px)] font-medium truncate">
                    {spot.name}
                  </p>
                  <p className="text-text-secondary text-[clamp(12px,3vw,13px)] truncate">
                    {spot.address}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {(overlays.length > 0 || highlightedSpots.length > 0) && <Separator />}

      {/* 섹션 3: 카테고리 */}
      <div className="px-4 py-3">
        <h3 className="text-text text-[clamp(13px,3.5vw,15px)] font-semibold mb-2.5">
          카테고리
        </h3>
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => onCategoryTap(category)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-dim text-text text-[clamp(12px,3vw,14px)] whitespace-nowrap flex-shrink-0 active:bg-border transition-colors"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>{category}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
