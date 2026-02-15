'use client';

import { RefObject, useState } from 'react';
import { MapPin, Phone, Clock, ChevronRight, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { openNaverMap } from '@/lib/naver-map-utils';
import { isValidHttpUrl } from '@/lib/utils';
import Image from 'next/image';
import { WEEKDAYS, WEEKDAY_LABELS } from '@/types';
import type { Spot, Weekday } from '@/types';

interface DrawerSpotDetailProps {
  spot: Spot;
  titleRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
}

function getTodayKey(): Weekday {
  return (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const)[new Date().getDay()];
}

export default function DrawerSpotDetail({
  spot,
  titleRef,
  contentRef,
  onClose,
}: DrawerSpotDetailProps) {
  const [hoursOpen, setHoursOpen] = useState(false);

  const isRunnerSpot = spot.categories.includes('러너스팟');
  const hasPhotos = isRunnerSpot && spot.photos && spot.photos.length > 0;
  const hasFeatures = spot.features && spot.features.length > 0;

  const todayKey = getTodayKey();
  const todayHours = spot.operating_hours?.[todayKey];

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

      {/* === titleRef: SNAP.TITLE 경계 — 이름 + 주소 + 운영시간 + 시설 === */}
      <div ref={titleRef}>
        <div className="h-4" />

        {/* 1. Spot Name & 2. Address */}
        <div className="px-4 pb-3 pr-12">
          <h2 className="text-[clamp(18px,5vw,22px)] font-bold text-text leading-tight tracking-tight mb-2">
            {spot.name}
          </h2>
          <div className="flex items-start gap-2 text-text-secondary">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p className="text-[clamp(13px,3.5vw,15px)] leading-relaxed">{spot.address}</p>
          </div>
        </div>

        {/* 3. Operating Hours — today only + dialog trigger */}
        {spot.operating_hours && (
          <button
            type="button"
            onClick={() => setHoursOpen(true)}
            className="flex items-center gap-3 w-full text-left px-4 pb-3"
          >
            <Clock className="w-4 h-4 text-text-muted flex-shrink-0" />
            <span className="text-[clamp(13px,3.5vw,15px)] text-text flex-1">
              {todayHours ? `${WEEKDAY_LABELS[todayKey]} ${todayHours}` : `${WEEKDAY_LABELS[todayKey]} 정보 없음`}
            </span>
            <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
          </button>
        )}

        {/* 4. Features */}
        {hasFeatures && (
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none px-4 pb-4">
            {spot.features.map((feature) => (
              <span
                key={feature}
                className="flex-shrink-0 rounded-full bg-surface-dim px-2.5 py-1 text-[clamp(11px,2.8vw,13px)] text-text-secondary"
              >
                {feature}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* === contentRef: SNAP.CONTENT 경계 — 전화 + 설명 + 사진 === */}
      <div ref={contentRef} className="px-4 pb-4 space-y-4">
        {/* 5. Phone */}
        {spot.phone && (
          <div className="flex items-center gap-3">
            <Phone className="w-4 h-4 text-text-muted flex-shrink-0" />
            <a
              href={`tel:${spot.phone}`}
              className="text-primary text-[clamp(13px,3.5vw,15px)] underline"
            >
              {spot.phone}
            </a>
          </div>
        )}

        {/* 6. Description */}
        {spot.description && (
          <div className="p-3.5 bg-surface-dim rounded-xl">
            <p className="text-[clamp(13px,3.5vw,15px)] text-text-secondary leading-relaxed whitespace-pre-line">
              {spot.description}
            </p>
          </div>
        )}

        {/* 7. Photo Gallery */}
        {hasPhotos && (
          <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4">
            {spot.photos.map((photo, i) => (
              <div
                key={i}
                className="relative w-56 aspect-[3/2] flex-shrink-0 rounded-xl overflow-hidden"
              >
                <Image
                  src={photo}
                  alt={`${spot.name} ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="224px"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* === SNAP.FULL 영역 — 액션 버튼 === */}
      <div className="px-4 pb-6">
        {/* Action Button — custom URL or Naver Map */}
        {spot.extra_data?.custom_url ? (
          <Button
            onClick={() => {
              if (isValidHttpUrl(spot.extra_data?.custom_url)) {
                window.open(spot.extra_data.custom_url, '_blank', 'noopener,noreferrer');
              }
            }}
            className="w-full h-11 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl text-[clamp(13px,3.5vw,15px)] flex items-center justify-center gap-2 shadow-sm"
          >
            <ExternalLink className="w-[18px] h-[18px]" />
            새 창에서 자세히 보기
          </Button>
        ) : (
          <Button
            onClick={() => openNaverMap(spot)}
            className="w-full h-11 bg-naver hover:bg-naver-hover text-white font-semibold rounded-xl text-[clamp(13px,3.5vw,15px)] flex items-center justify-center gap-2 shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            네이버 지도에서 보기
          </Button>
        )}
      </div>

      {/* Operating Hours Dialog */}
      <Dialog open={hoursOpen} onOpenChange={setHoursOpen}>
        <DialogContent className="max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">운영시간</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-1">
            {WEEKDAYS.map((day) => {
              const hours = spot.operating_hours?.[day];
              const isToday = day === todayKey;
              return (
                <div
                  key={day}
                  className={`flex text-[clamp(13px,3.5vw,15px)] ${isToday ? 'font-semibold text-text' : 'text-text-secondary'}`}
                >
                  <span className="w-8">{WEEKDAY_LABELS[day]}</span>
                  <span>{hours ?? '휴무'}</span>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
