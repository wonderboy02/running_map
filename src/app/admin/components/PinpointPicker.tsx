'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  const { map, isReady } = useNaverMap(mapContainerRef);
  const markersRef = useRef<naver.maps.Marker[]>([]);
  const overlayRef = useRef<naver.maps.GroundOverlay | null>(null);
  const clickListenerRef = useRef<naver.maps.MapEventListener | null>(null);
  const draggedRef = useRef(false);

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

    // 기존 오버레이 제거
    if (overlayRef.current) {
      overlayRef.current.setMap(null);
      overlayRef.current = null;
    }

    if (overlayImageUrl && bounds) {
      // NW/SE → SW/NE 변환 (LatLngBounds 용)
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

    // 기존 리스너 제거
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

    // 새 마커 생성
    localPins.forEach((pin, idx) => {
      const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(pin.lat, pin.lng),
        map,
        icon: getCoursePinIcon(true),
        zIndex: 100,
        draggable: true,
      });

      // 드래그 guard: dragstart → 플래그 ON, click에서 무시
      naver.maps.Event.addListener(marker, 'dragstart', () => {
        draggedRef.current = true;
      });

      // 드래그 종료 → 새 위치로 업데이트
      naver.maps.Event.addListener(marker, 'dragend', () => {
        const pos = marker.getPosition();
        setLocalPins((prev) =>
          prev.map((p, i) => (i === idx ? { lat: pos.lat(), lng: pos.lng() } : p)),
        );
      });

      // 클릭(드래그 없이) → 삭제
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

  const handleConfirm = () => {
    onConfirm(localPins);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const hasOverlay = !!overlayImageUrl && !!bounds;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[85dvh] max-w-[min(600px,calc(100%-1rem))] flex-col gap-0 p-0"
        showCloseButton={false}
      >
        <DialogHeader className="shrink-0 border-b px-4 py-3">
          <DialogTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              핀포인트 선택
            </span>
            <span className="text-text-secondary text-sm font-normal">
              {localPins.length}개 선택
            </span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            지도를 클릭하여 핀포인트를 추가하고, 핀을 클릭하여 삭제합니다.
          </DialogDescription>
        </DialogHeader>

        {!hasOverlay && (
          <div className="bg-highlight-muted text-highlight-foreground flex shrink-0 items-center gap-2 px-4 py-2 text-xs">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            오버레이 이미지 또는 좌표가 설정되지 않았습니다. 핀은 자유롭게 배치할 수 있습니다.
          </div>
        )}

        <div ref={mapContainerRef} className="min-h-0 flex-1" />

        <div className="shrink-0 border-t">
          <p className="text-text-muted px-4 py-1.5 text-center text-[11px]">
            지도 클릭: 핀 추가 · 핀 클릭: 삭제
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
      </DialogContent>
    </Dialog>
  );
}
