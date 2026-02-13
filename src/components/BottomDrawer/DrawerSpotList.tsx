'use client';

import { RefObject } from 'react';
import { MapPin, Mail } from 'lucide-react';
import Image from 'next/image';
import type { Spot } from '@/types';

interface DrawerSpotListProps {
  spots: Spot[];
  titleRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  onSpotClick: (spot: Spot) => void;
}

function SpotListItem({ spot, onClick }: { spot: Spot; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full py-3 hover:bg-surface-dim transition-colors text-left"
    >
      <div className="mb-1.5">
        <h3 className="font-semibold text-text">{spot.name}</h3>
      </div>
      <div className="flex items-start gap-2 mb-1.5">
        <MapPin className="w-4 h-4 text-text-muted mt-0.5 flex-shrink-0" />
        <p className="text-sm text-text-secondary line-clamp-1">{spot.address}</p>
      </div>
      {spot.description && (
        <p className="text-sm text-text-secondary mb-2 line-clamp-2">{spot.description}</p>
      )}
      {spot.photos && spot.photos.length > 0 ? (
        <div className="relative w-full h-32 rounded-lg overflow-hidden">
          <Image
            src={spot.photos[0]}
            alt={spot.name}
            fill
            className="object-cover"
            sizes="(max-width: 430px) 100vw, 430px"
          />
          {spot.photos.length > 1 && (
            <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 rounded-full text-white text-xs">
              +{spot.photos.length - 1}
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-32 bg-surface-dim rounded-lg flex items-center justify-center">
          <p className="text-sm text-text-muted">사진 없음</p>
        </div>
      )}
    </button>
  );
}

export default function DrawerSpotList({
  spots,
  titleRef,
  contentRef,
  onSpotClick,
}: DrawerSpotListProps) {
  const runnerSpots = spots.filter((spot) => spot.categories.includes('러너스팟'));

  return (
    <>
      {/* === titleRef: snap 1 경계 === */}
      <div ref={titleRef} className="px-4 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-info-muted rounded-lg">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold text-text">러너스팟</div>
            <div className="text-xs text-text-secondary">{runnerSpots.length}개 장소</div>
          </div>
        </div>
      </div>

      {/* === contentRef: snap 2 경계 (처음 2개 미리보기) === */}
      <div ref={contentRef} className="px-4">
        <div className="divide-y divide-border">
          {runnerSpots.slice(0, 2).map((spot) => (
            <SpotListItem key={spot.id} spot={spot} onClick={() => onSpotClick(spot)} />
          ))}
        </div>
      </div>

      {/* 나머지 아이템 (full snap에서 보임) */}
      {runnerSpots.length > 2 && (
        <div className="px-4">
          <div className="divide-y divide-border">
            {runnerSpots.slice(2).map((spot) => (
              <SpotListItem key={spot.id} spot={spot} onClick={() => onSpotClick(spot)} />
            ))}
          </div>
        </div>
      )}

      {/* 제휴문의 */}
      <div className="px-4 py-4 text-center">
        <a
          href="mailto:contact@runnersspot.com"
          className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          <Mail className="h-3 w-3" />
          제휴문의
        </a>
      </div>
    </>
  );
}
