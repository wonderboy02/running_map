'use client';

import { useRef, useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { Sheet, SheetRef } from 'react-modal-sheet';
import { useSnapPoints } from './useSnapPoints';
import DrawerSpotDetail from './DrawerSpotDetail';
import DrawerSpotList from './DrawerSpotList';
import DrawerCourseDetail from './DrawerCourseDetail';
import type { Spot, DrawerSelection } from '@/types';

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
  const [currentSnap, setCurrentSnap] = useState(1);

  // Hydration 문제 방지: 클라이언트에서만 렌더링
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // 마운트 후 초기 snap point 측정
  useEffect(() => {
    if (!mounted) return;
    const raf = requestAnimationFrame(() => recalculate());
    return () => cancelAnimationFrame(raf);
  }, [mounted, recalculate]);

  // selection 변경 시: 콘텐츠 전환 → snap point 재계산 + snap 이동
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const targetSnap = selection ? 2 : 1;

    // rAF: 새 콘텐츠 DOM 커밋 대기 → flushSync로 snap points 동기 갱신 → 즉시 snapTo
    const raf = requestAnimationFrame(() => {
      flushSync(() => recalculate());
      sheetRef.current?.snapTo(targetSnap);
    });

    return () => cancelAnimationFrame(raf);
  }, [selection]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) return null;

  return (
    <Sheet
      ref={sheetRef}
      isOpen={true}
      onClose={() => sheetRef.current?.snapTo(1)}
      snapPoints={snapPoints}
      initialSnap={1}
      disableDismiss={true}
      onSnap={setCurrentSnap}
      style={{ zIndex: 30 }}
    >
      <Sheet.Container style={{ maxHeight: '75vh' }}>
        <Sheet.Header />
        <Sheet.Content disableScroll={({ currentSnap }) => currentSnap !== 4}>
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
        {...(currentSnap >= 4 ? { onTap: () => sheetRef.current?.snapTo(1) } : {})}
      />
    </Sheet>
  );
}
