'use client';

import { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNaverMap } from '@/hooks/useNaverMap';
import { useGpxDataLayer } from '@/hooks/useGpxDataLayer';

interface CourseMapPreviewProps {
  onClose: () => void;
  gpxSource: File | string | null;
}

export default function CourseMapPreview({
  onClose,
  gpxSource,
}: CourseMapPreviewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const { map, isReady } = useNaverMap(mapContainerRef);

  useGpxDataLayer({ map, isReady, gpxSource });

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.userAgent);
  const captureShortcut = isMac ? 'Cmd+Shift+4' : 'Win+Shift+S';

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label="코스 미리보기"
      onClick={handleBackdropClick}
    >
      <div className="bg-background w-full max-w-[min(600px,calc(100%-1rem))] overflow-hidden rounded-lg border shadow-lg">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="flex items-center gap-1.5 text-base font-semibold">
            <Map className="h-4 w-4" />
            코스 미리보기
          </span>
        </div>

        {/* 지도 */}
        <div ref={mapContainerRef} style={{ width: '100%', height: '500px' }} />

        {/* 하단 */}
        <div className="border-t">
          <p className="text-text-muted px-4 py-1.5 text-center text-[11px]">
            캡처: {captureShortcut} → 드래그로 영역 선택 → 썸네일에 붙여넣기
          </p>
          <div className="px-4 pb-3">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onClose}
            >
              닫기
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
