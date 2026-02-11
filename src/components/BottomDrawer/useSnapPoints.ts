'use client';

import { useState, useCallback, useEffect, RefObject } from 'react';

const HEADER_HEIGHT = 40; // Sheet.Header (drag handle) 높이
const FALLBACK_SNAP_POINTS = [0, HEADER_HEIGHT, 0.15, 0.45, 1];

interface UseSnapPointsOptions {
  titleRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
}

/**
 * DOM 측정 기반 snap point 계산 훅
 *
 * 반환 배열: [0, peekPx, titlePx, contentPx, maxHeight]
 *   index 0: closed (disableDismiss로 도달 불가)
 *   index 1: peek — drag handle bar만 노출
 *   index 2: title — titleRef 영역까지 노출
 *   index 3: content — contentRef 영역까지 노출
 *   index 4: full — 75vh 전체, 스크롤 가능
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
    const contentSnap = titleSnap + contentEl.offsetHeight;
    // maxHeight는 Sheet.Container의 CSS maxHeight: 75vh가 처리
    // 라이브러리가 마지막 snap을 반드시 1(fully open)로 요구
    const maxPx = window.innerHeight * 0.75;

    setSnapPoints([
      0,
      peekSnap,
      Math.max(Math.min(titleSnap, maxPx - 40), peekSnap + 20),
      Math.max(Math.min(contentSnap, maxPx - 20), titleSnap + 20),
      1,
    ]);
  }, [titleRef, contentRef]);

  useEffect(() => {
    window.addEventListener('resize', recalculate);
    return () => window.removeEventListener('resize', recalculate);
  }, [recalculate]);

  return { snapPoints, recalculate };
}
