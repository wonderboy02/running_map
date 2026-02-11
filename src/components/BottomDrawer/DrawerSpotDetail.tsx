'use client';

import { RefObject } from 'react';
import { MapPin, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { openNaverMap } from '@/lib/naver-map-utils';
import Link from 'next/link';
import Image from 'next/image';
import type { Spot } from '@/types';

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  러너스팟: 'bg-blue-50 text-blue-700 border-blue-200',
  샤워: 'bg-slate-50 text-slate-700 border-slate-200',
  짐보관: 'bg-gray-50 text-gray-700 border-gray-200',
};

interface DrawerSpotDetailProps {
  spot: Spot;
  titleRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
}

export default function DrawerSpotDetail({
  spot,
  titleRef,
  contentRef,
  onClose,
}: DrawerSpotDetailProps) {
  const isRunnerSpot = spot.categories.includes('러너스팟');
  const hasPhotos = spot.photos && spot.photos.length > 0;

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
      <div ref={titleRef}>
        {/* Header Image */}
        {isRunnerSpot && hasPhotos ? (
          <div className="relative h-48 overflow-hidden">
            <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none">
              {spot.photos.map((photo, i) => (
                <div key={i} className="relative w-full h-48 flex-shrink-0 snap-center">
                  <Image
                    src={photo}
                    alt={`${spot.name} ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="100vw"
                  />
                </div>
              ))}
            </div>
            {spot.photos.length > 1 && (
              <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-full text-white text-xs font-medium">
                1/{spot.photos.length}
              </div>
            )}
          </div>
        ) : isRunnerSpot ? (
          <div className="relative h-32 bg-gray-100 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <p className="text-sm font-medium">사진 없음</p>
            </div>
          </div>
        ) : (
          <div className="h-4" />
        )}

        {/* Spot Name & Address */}
        <div className="px-4 pt-3 pb-4 pr-12">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h2 className="text-[clamp(18px,5vw,22px)] font-bold text-gray-900 leading-tight tracking-tight">
              {spot.name}
            </h2>
            {spot.is_highlighted && (
              <Badge className="bg-amber-500/10 text-amber-700 border-amber-200 flex-shrink-0 text-[clamp(12px,3vw,13px)] px-2 py-0.5">
                ⭐ 추천
              </Badge>
            )}
          </div>
          <div className="flex items-start gap-2 text-gray-600">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p className="text-[clamp(13px,3.5vw,15px)] leading-relaxed">{spot.address}</p>
          </div>
        </div>
      </div>

      {/* === contentRef: snap 2 경계 === */}
      <div ref={contentRef} className="px-4 pb-4 space-y-4">
        {/* Categories */}
        <div className="flex flex-wrap gap-1.5">
          {spot.categories.map((cat) => {
            const colorClass =
              CATEGORY_BADGE_COLORS[cat] || 'bg-gray-100 text-gray-700 border-gray-200';
            return (
              <Badge
                key={cat}
                variant="outline"
                className={`${colorClass} text-[clamp(12px,3vw,14px)] px-2.5 py-1`}
              >
                {cat}
              </Badge>
            );
          })}
        </div>

        {/* Description */}
        {spot.description && (
          <div className="p-3.5 bg-gray-50 rounded-xl">
            <p className="text-[clamp(13px,3.5vw,15px)] text-gray-700 leading-relaxed">
              {spot.description}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <Button
            onClick={() => openNaverMap(spot)}
            className="w-full h-11 bg-[#03C75A] hover:bg-[#02b350] text-white font-semibold rounded-xl text-[clamp(13px,3.5vw,15px)] flex items-center justify-center gap-2 shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            네이버 지도에서 보기
          </Button>

          <Button
            variant="outline"
            className="w-full h-11 font-medium rounded-xl text-[clamp(13px,3.5vw,15px)]"
            asChild
          >
            <Link href={`/spot/${spot.id}`}>
              상세 정보
              <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}
