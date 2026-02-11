'use client';

import { RefObject } from 'react';
import { Route, Gauge, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Overlay } from '@/types';

interface DrawerOverlayDetailProps {
  overlay: Overlay;
  titleRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
}

export default function DrawerOverlayDetail({
  overlay,
  titleRef,
  contentRef,
  onClose,
}: DrawerOverlayDetailProps) {
  return (
    <>
      {/* Close Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="absolute top-2 right-2 z-20 h-8 w-8 rounded-full"
        aria-label="닫기"
      >
        <X className="h-4 w-4" />
      </Button>

      {/* === titleRef: snap 1 경계 === */}
      <div ref={titleRef} className="px-4 pt-3 pb-2 pr-12">
        <h2 className="text-[clamp(18px,5vw,22px)] font-bold text-gray-900 leading-tight tracking-tight mb-2">
          {overlay.name}
        </h2>
        <div className="flex items-center gap-4 text-gray-600">
          {overlay.distance_km != null && (
            <div className="flex items-center gap-1.5">
              <Route className="w-4 h-4 text-emerald-600" />
              <span className="text-[clamp(13px,3.5vw,15px)] font-medium">
                {overlay.distance_km}km
              </span>
            </div>
          )}
          {overlay.difficulty != null && (
            <div className="flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-emerald-600" />
              <span className="text-[clamp(13px,3.5vw,15px)] font-medium">
                난이도 {overlay.difficulty}/10
              </span>
            </div>
          )}
        </div>
      </div>

      {/* === contentRef: snap 2 경계 === */}
      <div ref={contentRef} className="px-4 pb-4 space-y-4">
        {overlay.description && (
          <div className="p-3.5 bg-gray-50 rounded-xl">
            <p className="text-[clamp(13px,3.5vw,15px)] text-gray-700 leading-relaxed">
              {overlay.description}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
