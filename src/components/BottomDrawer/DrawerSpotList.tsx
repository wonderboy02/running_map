'use client';

import { RefObject } from 'react';
import { MapPin, Clock, Mail } from 'lucide-react';
import Image from 'next/image';
import { WEEKDAY_LABELS } from '@/types';
import type { Spot, Weekday } from '@/types';

function getTodayKey(): Weekday {
  return (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const)[new Date().getDay()];
}

interface DrawerSpotListProps {
  spots: Spot[];
  titleRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  onSpotClick: (spot: Spot) => void;
}

function SpotListItem({ spot, onClick }: { spot: Spot; onClick: () => void }) {
  const todayKey = getTodayKey();
  const todayHours = spot.operating_hours?.[todayKey];
  const hasFeatures = spot.features && spot.features.length > 0;

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

      {/* 운영시간 (오늘) */}
      {spot.operating_hours && (
        <div className="flex items-center gap-2 mb-1.5">
          <Clock className="w-4 h-4 text-text-muted flex-shrink-0" />
          <span className="text-sm text-text-secondary">
            {todayHours ? `${WEEKDAY_LABELS[todayKey]} ${todayHours}` : `${WEEKDAY_LABELS[todayKey]} 정보 없음`}
          </span>
        </div>
      )}

      {/* 시설 (features) */}
      {hasFeatures && (
        <div className="flex gap-1.5 flex-wrap mb-2">
          {spot.features.map((feature) => (
            <span
              key={feature}
              className="rounded-full bg-surface-dim px-2 py-0.5 text-xs text-text-secondary"
            >
              {feature}
            </span>
          ))}
        </div>
      )}

      {/* 사진 */}
      {spot.photos && spot.photos.length > 0 ? (
        spot.photos.length === 1 ? (
          <div className="relative w-full h-32 rounded-lg overflow-hidden">
            <Image
              src={spot.photos[0]}
              alt={spot.name}
              fill
              className="object-cover"
              sizes="(max-width: 430px) 100vw, 430px"
            />
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4">
            {spot.photos.map((photo, i) => (
              <div
                key={i}
                className="relative w-40 aspect-[3/2] flex-shrink-0 rounded-lg overflow-hidden"
              >
                <Image
                  src={photo}
                  alt={`${spot.name} ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="160px"
                />
              </div>
            ))}
          </div>
        )
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
        <div className="flex items-center gap-3">
          {/* 러너스팟 선택 마커 아이콘 (16px UI 아이콘 — next/image 대신 <img> 사용: 고정 크기 + 최적화 실익 없음) */}
          <img
            src="/markers/runner-selected.png"
            alt=""
            width={24}
            height={34}
            className="flex-shrink-0"
          />
          <div>
            <div className="text-[clamp(16px,4.5vw,18px)] font-bold text-text leading-tight">러너스팟</div>
            <div className="text-[clamp(12px,3vw,13px)] text-text-secondary mt-0.5">{runnerSpots.length}개 장소</div>
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
