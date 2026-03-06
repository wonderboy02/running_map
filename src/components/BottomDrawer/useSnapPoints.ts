'use client';

import { useState, useCallback, useEffect, RefObject } from 'react';
import { BOTTOM_NAV_HEIGHT } from '@/components/BottomNavigation';

const HEADER_HEIGHT = 40; // Sheet.Header (drag handle) 높이
const PREVIEW_CONTENT_RATIO = 0.25; // preview snap에서 보여줄 contentRef 비율 (≈ 첫 아이템 절반)
const FALLBACK_SNAP_POINTS = [0, HEADER_HEIGHT, 0.15, 0.3, 0.45, 1];

interface UseSnapPointsOptions {
  titleRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
}

/**
 * DOM 측정 기반 snap point 계산 훅
 *
 * 반환 배열: [0, peekPx, titlePx, previewPx, contentPx, maxHeight]
 *   index 0: closed (disableDismiss로 도달 불가)
 *   index 1: peek — drag handle bar만 노출
 *   index 2: title — titleRef 영역까지 노출
 *   index 3: preview — title + contentRef의 ~25% (첫 아이템 절반, 초기 상태)
 *   index 4: content — contentRef 영역까지 노출
 *   index 5: full — 75vh - nav bar 높이, 스크롤 가능
 */
export function useSnapPoints({ titleRef, contentRef }: UseSnapPointsOptions) {
  const [snapPoints, setSnapPoints] = useState<number[]>(FALLBACK_SNAP_POINTS);

  const recalculate = useCallback(() => {
    const titleEl = titleRef.current;
    const contentEl = contentRef.current;

    if (!titleEl || !contentEl) {
      setSnapPoints(FALLBACK_SNAP_POINTS);
      return;
    }

    const peekSnap = HEADER_HEIGHT;
    const titleSnap = HEADER_HEIGHT + titleEl.offsetHeight;
    const contentHeight = contentEl.offsetHeight;
    const previewSnap = titleSnap + Math.round(contentHeight * PREVIEW_CONTENT_RATIO);
    const contentSnap = titleSnap + contentHeight;
    const maxPx = window.innerHeight * 0.75 - BOTTOM_NAV_HEIGHT;

    // 각 snap은 이전 snap의 clamped 값 기준으로 최소값 보장
    const clampedTitle = Math.max(Math.min(titleSnap, maxPx - 60), peekSnap + 20);
    const clampedPreview = Math.max(Math.min(previewSnap, maxPx - 40), clampedTitle + 20);
    const clampedContent = Math.max(Math.min(contentSnap, maxPx - 20), clampedPreview + 20);

    setSnapPoints([0, peekSnap, clampedTitle, clampedPreview, clampedContent, 1]);
  }, [titleRef, contentRef]);

  useEffect(() => {
    window.addEventListener('resize', recalculate);
    return () => window.removeEventListener('resize', recalculate);
  }, [recalculate]);

  return { snapPoints, recalculate };
}
