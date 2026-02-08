'use client';

import { useRef, useState, useEffect } from 'react';
import { Sheet, SheetRef } from 'react-modal-sheet';
import { MapPin, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Spot } from '@/types';

interface DefaultDrawerProps {
  spots: Spot[];
  onSpotClick: (spot: Spot) => void;
}

export default function DefaultDrawer({ spots, onSpotClick }: DefaultDrawerProps) {
  // 러너스팟만 필터링
  const runnerSpots = spots.filter(spot => spot.categories.includes('러너스팟'));

  const ref = useRef<SheetRef>(null);

  // Hydration 문제 해결: 클라이언트에서만 렌더링
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <Sheet
      ref={ref}
      isOpen={true}
      onClose={() => ref.current?.snapTo(1)} // 닫기 시도하면 minimized로
      snapPoints={[0, 0.12, 1]} // 0% (닫힘), 12% (minimized), 100% (expanded)
      initialSnap={1} // 1번 인덱스 = 12% (minimized)
      disableDrag={false} // 드래그 가능
    >
      <Sheet.Container style={{ maxHeight: '75vh' }}>
        <Sheet.Header />

        <Sheet.Content>
          {/* Minimized/Expanded 상태를 snap point로 자동 처리 */}
          <div className="px-4 pb-4">
            {/* Summary - 항상 보임 */}
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">러너스팟</div>
                <div className="text-xs text-gray-500">{runnerSpots.length}개 장소</div>
              </div>
            </div>

            {/* List - 확장 시 보임 */}
            <div className="divide-y divide-gray-200">
              {runnerSpots.map((spot) => (
                <button
                  key={spot.id}
                  onClick={() => {
                    onSpotClick(spot);
                    ref.current?.snapTo(1); // 선택 후 minimized로
                  }}
                  className="w-full py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <h3 className="font-semibold text-gray-900">{spot.name}</h3>
                    {spot.is_highlighted && (
                      <Badge className="bg-amber-500/10 text-amber-700 border-amber-200 flex-shrink-0">
                        <Star className="w-3 h-3 mr-1" fill="currentColor" />
                        추천
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-start gap-2 mb-1.5">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-600 line-clamp-1">{spot.address}</p>
                  </div>
                  {spot.description && (
                    <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                      {spot.description}
                    </p>
                  )}
                  {/* 사진 Placeholder */}
                  <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                    <p className="text-sm text-gray-400">사진 없음</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Sheet.Content>
      </Sheet.Container>

      {/* Backdrop (투명) - 배경 클릭 가능하게 */}
      <Sheet.Backdrop style={{ backgroundColor: 'transparent' }} />
    </Sheet>
  );
}
