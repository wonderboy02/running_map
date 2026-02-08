'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { MapPin, ExternalLink, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { openNaverMap } from '@/lib/naver-map-utils';
import Link from 'next/link';
import type { Spot } from '@/types';

interface BottomSheetProps {
  spot: Spot | null;
  onClose: () => void;
}

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  러너스팟: 'bg-blue-50 text-blue-700 border-blue-200',
  샤워: 'bg-slate-50 text-slate-700 border-slate-200',
  짐보관: 'bg-gray-50 text-gray-700 border-gray-200',
};

export default function BottomSheet({ spot, onClose }: BottomSheetProps) {
  if (!spot) return null;

  const isRunnerSpot = spot.categories.includes('러너스팟');
  const hasPhotos = spot.photos && spot.photos.length > 0;

  return (
    <Sheet open={!!spot} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="p-0 border-0 rounded-t-3xl overflow-hidden max-h-[85vh]">
        <SheetHeader className="sr-only">
          <SheetTitle>{spot.name}</SheetTitle>
        </SheetHeader>

        <div className="relative">
          {/* Drag Handle */}
          <div className="absolute top-0 left-0 right-0 flex justify-center py-3 z-10">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </div>

          {/* Header: 3가지 케이스 */}
          {isRunnerSpot && hasPhotos ? (
            // Case A: 러너스팟 + 사진 있음
            <div className="relative h-48 overflow-hidden">
              <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none">
                {spot.photos.map((photo, i) => (
                  <img
                    key={i}
                    src={photo}
                    alt={`${spot.name} ${i + 1}`}
                    className="w-full h-48 object-cover flex-shrink-0 snap-center"
                  />
                ))}
              </div>
              {spot.photos.length > 1 && (
                <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-full text-white text-xs font-medium">
                  1/{spot.photos.length}
                </div>
              )}
            </div>
          ) : isRunnerSpot ? (
            // Case B: 러너스팟 + 사진 없음 (Placeholder)
            <div className="relative h-32 bg-gray-100 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <p className="text-sm font-medium">사진 없음</p>
              </div>
            </div>
          ) : (
            // Case C: 샤워/짐보관 (미니멀 라인)
            <div className="h-1 bg-gray-200" />
          )}

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Title & Address */}
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900 leading-tight">
                  {spot.name}
                </h2>
                {spot.is_highlighted && (
                  <Badge className="bg-amber-500/10 text-amber-700 border-amber-200 flex-shrink-0">
                    ⭐ 추천
                  </Badge>
                )}
              </div>

              <div className="flex items-start gap-2 text-gray-600">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p className="text-sm leading-relaxed">{spot.address}</p>
              </div>
            </div>

            {/* Categories */}
            <div className="flex flex-wrap gap-2">
              {spot.categories.map((cat) => {
                const colorClass = CATEGORY_BADGE_COLORS[cat] || 'bg-gray-100 text-gray-700 border-gray-200';
                return (
                  <Badge key={cat} variant="outline" className={colorClass}>
                    {cat}
                  </Badge>
                );
              })}
            </div>

            {/* Description */}
            {spot.description && (
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {spot.description}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              {/* Primary: Naver Map */}
              <Button
                onClick={() => openNaverMap(spot)}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
              >
                네이버 지도에서 보기
                <ExternalLink className="w-4 h-4 ml-1.5" />
              </Button>

              {/* Secondary: Detail Page */}
              <Button
                variant="outline"
                className="w-full h-11 font-medium rounded-lg"
                asChild
              >
                <Link href={`/spot/${spot.id}`}>
                  상세 정보
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
