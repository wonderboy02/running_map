'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
          className="text-text-secondary -ml-1 gap-1"
        >
          <ChevronLeft className="h-5 w-5" />
          뒤로
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {spot.photos.length > 0 && (
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
            {spot.categories.map((cat) => (
              <Badge key={cat} className="bg-primary/10 text-primary">
                {cat}
              </Badge>
            ))}
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
        </div>
      </div>
    </div>
  );
}
