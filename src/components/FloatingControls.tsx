'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { LocateFixed, Send } from 'lucide-react';
import { toast } from 'sonner';
import FeedbackDialog from '@/components/FeedbackDialog';

interface FloatingControlsProps {
  map: naver.maps.Map | null;
  showCourses: boolean;
  onToggleCourses: (checked: boolean) => void;
}

export default function FloatingControls({
  map,
  showCourses,
  onToggleCourses,
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
      {/* 오른쪽 상단: 코스 토글 */}
      <div className="fixed right-3 top-[104px] z-[25] flex flex-col items-center">
        <button
          onClick={() => onToggleCourses(!showCourses)}
          className="h-10 w-10 rounded-full shadow-md transition-transform active:scale-95"
          aria-label="코스 토글"
        >
          <Image
            src={showCourses ? '/logo/course_on.png' : '/logo/course_off.png'}
            alt="코스 토글"
            width={40}
            height={40}
            className="rounded-full"
          />
        </button>
        <span className="text-shadow-outline mt-0.5 text-[10px] font-semibold text-text">
          {showCourses ? '코스 ON' : '코스 OFF'}
        </span>
      </div>

      {/* 오른쪽 하단: 내 위치 + 피드백 */}
      <div className="fixed bottom-[60px] right-4 z-[25] flex flex-col items-center gap-2">
        <button
          onClick={handleLocate}
          disabled={locating}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface text-text-secondary shadow-md transition-colors"
          aria-label="현재 위치"
        >
          <LocateFixed
            className={`h-5 w-5 ${locating ? 'animate-pulse text-primary' : ''}`}
          />
        </button>

        <div className="flex flex-col items-center">
          <button
            onClick={() => setFeedbackOpen(true)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-md transition-transform hover:scale-105"
            aria-label="의견 보내기"
          >
            <Send className="h-5 w-5" />
          </button>
          <span className="text-shadow-outline mt-0.5 text-[10px] font-semibold text-text">
            의견 보내기
          </span>
        </div>
      </div>

      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  );
}
