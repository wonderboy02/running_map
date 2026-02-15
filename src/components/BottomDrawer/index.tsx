'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { Sheet, SheetRef } from 'react-modal-sheet';
import { useSnapPoints } from './useSnapPoints';
import DrawerSpotDetail from './DrawerSpotDetail';
import DrawerSpotList from './DrawerSpotList';
import DrawerCourseDetail from './DrawerCourseDetail';
import type { Spot, DrawerSelection } from '@/types';
import { track } from '@/lib/analytics';

/**
 * Snap point 인덱스 상수
 *   0: closed (도달 불가)
 *   1: peek — drag handle만
 *   2: title — 헤더 영역
 *   3: preview — 제목 + 첫 아이템 절반 (초기 상태)
 *   4: content — 주요 콘텐츠
 *   5: full — 75vh, 스크롤 가능
 */
const SNAP = {
  PEEK: 1,
  TITLE: 2,
  PREVIEW: 3,
  CONTENT: 4,
  FULL: 5,
} as const;

interface BottomDrawerProps {
  spots: Spot[];
  selection: DrawerSelection | null;
  onSpotClick: (spot: Spot) => void;
  onDeselect: () => void;
}

export default function BottomDrawer({
  spots,
  selection,
  onSpotClick,
  onDeselect,
}: BottomDrawerProps) {
  const sheetRef = useRef<SheetRef>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const { snapPoints, recalculate } = useSnapPoints({ titleRef, contentRef });
  const [currentSnap, setCurrentSnap] = useState<number>(SNAP.TITLE);
  const currentSnapRef = useRef(SNAP.TITLE);
  const isProgrammaticSnapRef = useRef(false);

  const handleSnap = useCallback(
    (snapIndex: number) => {
      if (isProgrammaticSnapRef.current) {
        isProgrammaticSnapRef.current = false;
      } else if (currentSnapRef.current !== snapIndex) {
        track('drawer_snap', {
          from_snap: currentSnapRef.current,
          to_snap: snapIndex,
          content_type:
            selection?.type === 'spot'
              ? 'spot_detail'
              : selection?.type === 'course'
                ? 'course_detail'
                : 'list',
        });
      }
      currentSnapRef.current = snapIndex;
      setCurrentSnap(snapIndex);
    },
    [selection],
  );

  // Hydration 문제 방지: 클라이언트에서만 렌더링
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // 초기 데이터 로드 후 preview snap 이동
  // rAF: DOM 레이아웃 완료 대기 → flushSync로 snap points 동기 갱신 → 즉시 snapTo
  const needsInitialSnap = useRef(true);

  useEffect(() => {
    if (!mounted || selection || spots.length === 0) return;
    if (!needsInitialSnap.current) return;
    needsInitialSnap.current = false;

    const raf = requestAnimationFrame(() => {
      flushSync(() => recalculate());
      sheetRef.current?.snapTo(SNAP.PREVIEW);
    });

    return () => cancelAnimationFrame(raf);
  }, [mounted, spots.length, selection, recalculate]);

  // selection 변경 시: 콘텐츠 전환 → snap point 재계산 + snap 이동
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const targetSnap = selection ? SNAP.TITLE : SNAP.PEEK;

    // rAF: 새 콘텐츠 DOM 커밋 대기 → flushSync로 snap points 동기 갱신 → 즉시 snapTo
    const raf = requestAnimationFrame(() => {
      flushSync(() => recalculate());
      isProgrammaticSnapRef.current = true;
      sheetRef.current?.snapTo(targetSnap);
    });

    return () => cancelAnimationFrame(raf);
  }, [selection]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) return null;

  return (
    <Sheet
      ref={sheetRef}
      isOpen={true}
      onClose={() => {
        isProgrammaticSnapRef.current = true;
        sheetRef.current?.snapTo(SNAP.PEEK);
      }}
      snapPoints={snapPoints}
      initialSnap={SNAP.TITLE}
      disableDismiss={true}
      onSnap={handleSnap}
      style={{ zIndex: 30 }}
    >
      <Sheet.Container style={{ maxHeight: '75vh' }}>
        <Sheet.Header />
        <Sheet.Content disableScroll={({ currentSnap }) => currentSnap !== SNAP.FULL}>
          {selection?.type === 'spot' ? (
            <DrawerSpotDetail
              spot={selection.data}
              titleRef={titleRef}
              contentRef={contentRef}
              onClose={onDeselect}
            />
          ) : selection?.type === 'course' ? (
            <DrawerCourseDetail
              course={selection.data}
              titleRef={titleRef}
              contentRef={contentRef}
              onClose={onDeselect}
            />
          ) : (
            <DrawerSpotList
              spots={spots}
              titleRef={titleRef}
              contentRef={contentRef}
              onSpotClick={onSpotClick}
            />
          )}
        </Sheet.Content>
      </Sheet.Container>

      {/* 투명 backdrop: peek일 때 지도 터치 가능, 확장 시 클릭하면 peek로 복귀 */}
      {/* NOTE: onTap을 조건부로 전달해야 함. 라이브러리가 onTap 존재 시 항상 pointer-events:auto로 덮어쓰기 때문 */}
      <Sheet.Backdrop
        style={{ backgroundColor: 'transparent' }}
        {...(currentSnap >= SNAP.FULL
          ? {
              onTap: () => {
                isProgrammaticSnapRef.current = true;
                sheetRef.current?.snapTo(SNAP.PEEK);
              },
            }
          : {})}
      />
    </Sheet>
  );
}
