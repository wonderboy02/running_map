'use client';

import { useState, useCallback } from 'react';
import { Eye, EyeOff, LocateFixed, Send } from 'lucide-react';
import { toast } from 'sonner';
import FeedbackDialog from '@/components/FeedbackDialog';

interface FloatingControlsProps {
  map: naver.maps.Map | null;
  showOverlays: boolean;
  onToggleOverlays: (checked: boolean) => void;
}

export default function FloatingControls({
  map,
  showOverlays,
  onToggleOverlays,
}: FloatingControlsProps) {
  const [locating, setLocating] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

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
      { enableHighAccuracy: true, timeout: 5000 },
    );
  }, [map]);

  return (
    <>
      {/* 오른쪽 상단: 오버레이 토글 */}
      <div className="fixed right-3 top-[104px] z-[35] flex flex-col items-center">
        <button
          onClick={() => onToggleOverlays(!showOverlays)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white shadow-md transition-colors"
          aria-label="오버레이 토글"
        >
          {showOverlays ? (
            <Eye className="h-[18px] w-[18px] text-primary" />
          ) : (
            <EyeOff className="h-[18px] w-[18px] text-gray-400" />
          )}
        </button>
        <span className="mt-0.5 text-[10px] font-medium text-gray-500">
          {showOverlays ? '코스 ON' : '코스 OFF'}
        </span>
      </div>

      {/* 오른쪽 하단: 내 위치 + 피드백 */}
      <div className="fixed bottom-[60px] right-4 z-[35] flex flex-col items-center gap-2">
        <button
          onClick={handleLocate}
          disabled={locating}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-md transition-colors"
          aria-label="현재 위치"
        >
          <LocateFixed
            className={`h-5 w-5 ${locating ? 'animate-pulse text-primary' : ''}`}
          />
        </button>

        <button
          onClick={() => setFeedbackOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-md transition-transform hover:scale-105"
          aria-label="의견 보내기"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>

      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  );
}
