'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNaverMap } from '@/hooks/useNaverMap';
import { getCoursePinIcon } from '@/lib/marker-config';

interface PinpointPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingPinpoints: Array<{ lat: number; lng: number }>;
  onConfirm: (pinpoints: Array<{ lat: number; lng: number }>) => void;
  overlayImageUrl: string | null;
  bounds: {
    nw_lat: number;
    nw_lng: number;
    se_lat: number;
    se_lng: number;
  } | null;
  opacity: number;
}

export default function PinpointPicker({
  open,
  onOpenChange,
  existingPinpoints,
  onConfirm,
  overlayImageUrl,
  bounds,
  opacity,
}: PinpointPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<naver.maps.Marker[]>([]);
  const overlayRef = useRef<naver.maps.GroundOverlay | null>(null);
  const clickListenerRef = useRef<naver.maps.MapEventListener | null>(null);
  const draggedRef = useRef(false);

  const { map, isReady } = useNaverMap(mapContainerRef);

  const [localPins, setLocalPins] = useState<Array<{ lat: number; lng: number }>>([]);

  // open → localPins 초기화
  useEffect(() => {
    if (open) {
      const validPins = existingPinpoints.filter((p) => p.lat !== 0 || p.lng !== 0);
      setLocalPins(validPins);
    }
  }, [open, existingPinpoints]);

  // GroundOverlay 표시 + fitBounds
  useEffect(() => {
    if (!isReady || !map) return;

    if (overlayRef.current) {
      overlayRef.current.setMap(null);
      overlayRef.current = null;
    }

    if (overlayImageUrl && bounds) {
      const sw = new naver.maps.LatLng(bounds.se_lat, bounds.nw_lng);
      const ne = new naver.maps.LatLng(bounds.nw_lat, bounds.se_lng);
      const overlayBounds = new naver.maps.LatLngBounds(sw, ne);

      const groundOverlay = new naver.maps.GroundOverlay(overlayImageUrl, overlayBounds, {
        opacity,
        clickable: false,
      });
      groundOverlay.setMap(map);
      overlayRef.current = groundOverlay;

      map.fitBounds(overlayBounds, { padding: 40 });
    }

    return () => {
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
    };
  }, [isReady, map, overlayImageUrl, bounds, opacity]);

  // 맵 click 리스너
  useEffect(() => {
    if (!isReady || !map) return;

    if (clickListenerRef.current) {
      naver.maps.Event.removeListener(clickListenerRef.current);
    }

    clickListenerRef.current = naver.maps.Event.addListener(
      map,
      'click',
      (e: { coord: naver.maps.LatLng }) => {
        const coord = e.coord;
        setLocalPins((prev) => [...prev, { lat: coord.lat(), lng: coord.lng() }]);
      },
    );

    return () => {
      if (clickListenerRef.current) {
        naver.maps.Event.removeListener(clickListenerRef.current);
        clickListenerRef.current = null;
      }
    };
  }, [isReady, map]);

  // 마커 리스너 정리 + 지도에서 제거
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((m) => {
      naver.maps.Event.clearListeners(m, 'click');
      naver.maps.Event.clearListeners(m, 'dragstart');
      naver.maps.Event.clearListeners(m, 'dragend');
      m.setMap(null);
    });
    markersRef.current = [];
  }, []);

  // localPins → 마커 동기화
  const syncMarkers = useCallback(() => {
    if (!isReady || !map) return;

    clearMarkers();

    localPins.forEach((pin, idx) => {
      const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(pin.lat, pin.lng),
        map,
        icon: getCoursePinIcon(true),
        zIndex: 100,
        draggable: true,
      });

      naver.maps.Event.addListener(marker, 'dragstart', () => {
        draggedRef.current = true;
      });

      naver.maps.Event.addListener(marker, 'dragend', () => {
        const pos = marker.getPosition();
        setLocalPins((prev) =>
          prev.map((p, i) => (i === idx ? { lat: pos.lat(), lng: pos.lng() } : p)),
        );
      });

      naver.maps.Event.addListener(marker, 'click', () => {
        if (draggedRef.current) {
          draggedRef.current = false;
          return;
        }
        setLocalPins((prev) => prev.filter((_, i) => i !== idx));
      });

      markersRef.current.push(marker);
    });
  }, [isReady, map, localPins, clearMarkers]);

  useEffect(() => {
    syncMarkers();
    return () => clearMarkers();
  }, [syncMarkers, clearMarkers]);

  // ESC 키로 닫기
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  const handleConfirm = () => {
    onConfirm(localPins);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  // 배경(backdrop) 클릭 시 닫기
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onOpenChange(false);
  };

  const hasOverlay = !!overlayImageUrl && !!bounds;

  if (!open) return null;

  // createPortal 사용 (Radix Dialog 대신)
  // → 부모 Dialog가 pickerOpen일 때 닫히므로 inert/focus-trap 충돌 없음
  // → transform 없는 flexbox 센터링으로 Naver Maps 타일 정상 렌더링
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label="핀포인트 선택"
      onClick={handleBackdropClick}
    >
      <div className="bg-background w-full max-w-[min(600px,calc(100%-1rem))] overflow-hidden rounded-lg border shadow-lg">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="flex items-center gap-1.5 text-base font-semibold">
            <MapPin className="h-4 w-4" />
            핀포인트 선택
          </span>
          <span className="text-text-secondary text-sm font-normal">
            {localPins.length}개 선택
          </span>
        </div>

        {/* 오버레이 미설정 안내 */}
        {!hasOverlay && (
          <div className="bg-highlight-muted text-highlight-foreground flex items-center gap-2 px-4 py-2 text-xs">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            오버레이 이미지 또는 좌표가 설정되지 않았습니다. 핀은 자유롭게 배치할 수 있습니다.
          </div>
        )}

        {/* 지도 — 고정 px 높이 필수: Naver Maps SDK가 초기화 시 컨테이너의 offsetHeight를
            읽어 타일을 배치하므로, flex/% 높이는 0px로 계산되어 지도가 렌더링되지 않음 */}
        <div ref={mapContainerRef} style={{ width: '100%', height: '500px' }} />

        {/* 하단 액션 */}
        <div className="border-t">
          <p className="text-text-muted px-4 py-1.5 text-center text-[11px]">
            지도 클릭: 핀 추가 · 핀 클릭: 삭제 · 핀 드래그: 이동
          </p>
          <div className="flex gap-2 px-4 pb-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleCancel}
            >
              취소
            </Button>
            <Button type="button" className="flex-1" onClick={handleConfirm}>
              확인 ({localPins.length}개)
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
