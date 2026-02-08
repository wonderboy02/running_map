'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, ExternalLink, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { openNaverMap } from '@/lib/naver-map-utils';
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

  const CATEGORY_BADGE_COLORS: Record<string, string> = {
    러너스팟: 'bg-blue-50 text-blue-700 border-blue-200',
    샤워: 'bg-slate-50 text-slate-700 border-slate-200',
    짐보관: 'bg-gray-50 text-gray-700 border-gray-200',
  };

  return (
    <div className="bg-surface flex h-dvh flex-col">
      <header className="border-border flex h-12 items-center border-b px-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="text-text-secondary -ml-1 gap-1"
        >
          <ChevronLeft className="h-5 w-5" />
          뒤로
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Header: 3가지 케이스 */}
        {isRunnerSpot && hasPhotos ? (
          // Case A: 러너스팟 + 사진 있음
          <div className="scrollbar-none flex gap-1 overflow-x-auto">
            {spot.photos.map((photo, i) => (
              <img
                key={i}
                src={photo}
                alt={`${spot.name} 사진 ${i + 1}`}
                className="h-48 w-auto flex-shrink-0 object-cover"
              />
            ))}
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

        <div className="p-4">
          <div className="mb-1 flex items-start justify-between">
            <h1 className="text-xl font-bold">{spot.name}</h1>
            {spot.is_highlighted && (
              <Badge
                variant="secondary"
                className="bg-highlight/10 text-highlight-dark ml-2 flex-shrink-0"
              >
                추천
              </Badge>
            )}
          </div>

          <p className="text-text-secondary mb-3 text-sm">{spot.address}</p>

          <div className="mb-4 flex flex-wrap gap-1.5">
            {spot.categories.map((cat) => {
              const colorClass = CATEGORY_BADGE_COLORS[cat] || 'bg-gray-100 text-gray-700 border-gray-200';
              return (
                <Badge key={cat} variant="outline" className={colorClass}>
                  {cat}
                </Badge>
              );
            })}
          </div>

          {spot.description && (
            <div className="mb-4">
              <h2 className="mb-1 text-sm font-semibold">소개</h2>
              <p className="text-text-secondary text-sm leading-relaxed">{spot.description}</p>
            </div>
          )}

          {spot.phone && (
            <div className="mb-4">
              <h2 className="mb-1 text-sm font-semibold">연락처</h2>
              <a href={`tel:${spot.phone}`} className="text-primary text-sm underline">
                {spot.phone}
              </a>
            </div>
          )}

          {spot.operating_hours && (
            <div className="mb-4">
              <h2 className="mb-1 text-sm font-semibold">운영시간</h2>
              <div className="space-y-0.5">
                {weekdays.map((day) => {
                  const hours = spot.operating_hours?.[day];
                  if (!hours) return null;
                  return (
                    <div key={day} className="flex text-sm">
                      <span className="text-text-secondary w-6">{weekdayLabels[day]}</span>
                      <span className="text-text">{hours}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Naver Map Button */}
          <div className="mt-6">
            <Button
              onClick={() => openNaverMap(spot)}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
            >
              네이버 지도에서 보기
              <ExternalLink className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
