'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, ExternalLink, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { openNaverMap } from '@/lib/naver-map-utils';
import { getCategoryBadgeStyle } from '@/lib/category-config';
import Image from 'next/image';
import type { Spot } from '@/types';

export default function SpotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [spot, setSpot] = useState<Spot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSpot() {
      const { data, error } = await supabase
        .from('spots')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error || !data) {
        router.push('/');
        return;
      }

      setSpot(data as Spot);
      setLoading(false);
    }

    fetchSpot();
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <p className="text-text-secondary text-sm">불러오는 중...</p>
      </div>
    );
  }

  if (!spot) return null;

  const isRunnerSpot = spot.categories.includes('러너스팟');
  const hasPhotos = spot.photos && spot.photos.length > 0;

  const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const weekdayLabels: Record<string, string> = {
    mon: '월',
    tue: '화',
    wed: '수',
    thu: '목',
    fri: '금',
    sat: '토',
    sun: '일',
  };

  return (
    <div className="bg-surface flex h-dvh flex-col">
      <header className="border-border flex h-12 items-center border-b px-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="text-text-secondary -ml-1 gap-1 min-h-[40px]"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="text-[clamp(13px,3.5vw,15px)]">뒤로</span>
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Header: 3가지 케이스 */}
        {isRunnerSpot && hasPhotos ? (
          // Case A: 러너스팟 + 사진 있음
          <div className="scrollbar-none flex gap-1 overflow-x-auto">
            {spot.photos.map((photo, i) => (
              <div key={i} className="relative h-48 w-72 flex-shrink-0">
                <Image
                  src={photo}
                  alt={`${spot.name} 사진 ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="288px"
                />
              </div>
            ))}
          </div>
        ) : isRunnerSpot ? (
          // Case B: 러너스팟 + 사진 없음 (Placeholder)
          <div className="relative h-32 bg-surface-dim flex items-center justify-center">
            <div className="text-center text-text-secondary">
              <p className="text-sm font-medium">사진 없음</p>
            </div>
          </div>
        ) : (
          // Case C: 샤워/짐보관 (미니멀 라인)
          <div className="h-1 bg-border" />
        )}

        <div className="px-4 py-4">
          <div className="mb-2 flex items-start justify-between">
            <h1 className="text-[clamp(18px,5vw,22px)] font-bold tracking-tight leading-tight">{spot.name}</h1>
            {spot.is_highlighted && (
              <Badge
                variant="secondary"
                className="bg-highlight-muted text-highlight-foreground ml-2 flex-shrink-0 text-[clamp(12px,3vw,13px)] px-2 py-0.5"
              >
                추천
              </Badge>
            )}
          </div>

          <p className="text-text-secondary mb-4 text-[clamp(13px,3.5vw,15px)] leading-relaxed">{spot.address}</p>

          <div className="mb-4 flex flex-wrap gap-1.5">
            {spot.categories.map((cat) => (
                <Badge key={cat} variant="outline" className={`${getCategoryBadgeStyle(cat)} text-[clamp(12px,3vw,14px)] px-2.5 py-1`}>
                  {cat}
                </Badge>
            ))}
          </div>

          {spot.description && (
            <div className="mb-4">
              <h2 className="mb-1.5 text-[clamp(13px,3.5vw,15px)] font-semibold">소개</h2>
              <p className="text-text-secondary text-[clamp(13px,3.5vw,15px)] leading-relaxed">{spot.description}</p>
            </div>
          )}

          {spot.phone && (
            <div className="mb-4">
              <h2 className="mb-1.5 text-[clamp(13px,3.5vw,15px)] font-semibold">연락처</h2>
              <a href={`tel:${spot.phone}`} className="text-primary text-[clamp(13px,3.5vw,15px)] underline min-h-[40px] inline-flex items-center">
                {spot.phone}
              </a>
            </div>
          )}

          {spot.operating_hours && (
            <div className="mb-4">
              <h2 className="mb-1.5 text-[clamp(13px,3.5vw,15px)] font-semibold">운영시간</h2>
              <div className="space-y-1">
                {weekdays.map((day) => {
                  const hours = spot.operating_hours?.[day];
                  if (!hours) return null;
                  return (
                    <div key={day} className="flex text-[clamp(13px,3.5vw,15px)]">
                      <span className="text-text-secondary w-6">{weekdayLabels[day]}</span>
                      <span className="text-text">{hours}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Naver Map Button - 네이버 그린 */}
          <div className="mt-5">
            <Button
              onClick={() => openNaverMap(spot)}
              className="w-full h-11 bg-naver hover:bg-naver-hover text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm text-[clamp(13px,3.5vw,15px)]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              네이버 지도에서 보기
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
