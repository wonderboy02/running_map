'use client';

import { useState, useCallback } from 'react';
import { Map, Satellite, Mountain, Layers, LocateFixed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface MapControlsProps {
  map: naver.maps.Map | null;
}

const MAP_TYPES = [
  { id: 'NORMAL', label: '일반', icon: Map },
  { id: 'SATELLITE', label: '위성', icon: Satellite },
  { id: 'HYBRID', label: '혼합', icon: Layers },
  { id: 'TERRAIN', label: '지형', icon: Mountain },
] as const;

export default function MapControls({ map }: MapControlsProps) {
  const [activeType, setActiveType] = useState('NORMAL');
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [locating, setLocating] = useState(false);

  const handleMapTypeChange = useCallback(
    (typeId: string) => {
      if (!map) return;
      const mapTypeId =
        naver.maps.MapTypeId[typeId as keyof typeof naver.maps.MapTypeId];
      if (mapTypeId) {
        map.setMapTypeId(mapTypeId);
        setActiveType(typeId);
      }
      setShowTypeMenu(false);
    },
    [map]
  );

  const handleLocate = useCallback(() => {
    if (!map) return;
    if (!navigator.geolocation) {
      toast.error('이 브라우저에서는 위치 서비스를 사용할 수 없습니다.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const latlng = new naver.maps.LatLng(latitude, longitude);
        map.panTo(latlng);
        map.setZoom(15);
        setLocating(false);
        toast.success('현재 위치로 이동했습니다.');
      },
      () => {
        setLocating(false);
        toast.error('위치 정보를 가져올 수 없습니다.');
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, [map]);

  return (
    <div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
      {/* 지도 유형 전환 */}
      <div className="relative">
        <Button
          variant="outline"
          size="icon"
          className="bg-surface h-9 w-9 shadow-md"
          onClick={() => setShowTypeMenu(!showTypeMenu)}
          aria-label="지도 유형"
        >
          <Layers className="h-4 w-4" />
        </Button>

        {showTypeMenu && (
          <div className="bg-surface border-border absolute right-0 mt-1 w-24 rounded-lg border shadow-lg">
            {MAP_TYPES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleMapTypeChange(id)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors ${
                  activeType === id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'hover:bg-surface-dim'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 현재 위치 */}
      <Button
        variant="outline"
        size="icon"
        className="bg-surface h-9 w-9 shadow-md"
        onClick={handleLocate}
        disabled={locating}
        aria-label="현재 위치"
      >
        <LocateFixed className={`h-4 w-4 ${locating ? 'animate-pulse text-primary' : ''}`} />
      </Button>
    </div>
  );
}
