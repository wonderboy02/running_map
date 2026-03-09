'use client';

import { useState } from 'react';
import { Crosshair, Loader2, MessageCircleMore, Navigation } from 'lucide-react';
import FeedbackDialog from '@/components/FeedbackDialog';
import { BOTTOM_NAV_HEIGHT } from '@/components/BottomNavigation';
import { track } from '@/lib/analytics';

const FLOATING_BOTTOM_OFFSET = 60; // BottomDrawer peek 높이 기준 여백

interface FloatingControlsProps {
  showCourses: boolean;
  onToggleCourses: (checked: boolean) => void;
  isFollowing: boolean;
  isLocating: boolean;
  onToggleFollow: () => void;
}

export default function FloatingControls({
  showCourses,
  onToggleCourses,
  isFollowing,
  isLocating,
  onToggleFollow,
}: FloatingControlsProps) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      {/* 오른쪽 상단: 코스 토글 */}
      <div className="fixed right-3 top-[104px] z-[25] flex flex-col items-center">
        <button
          onClick={() => {
            track('course_toggle', { show_courses: !showCourses });
            onToggleCourses(!showCourses);
          }}
          className="h-10 w-10 rounded-full shadow-md transition-transform active:scale-95"
          aria-label="코스 토글"
        >
          {/* 정적 UI 에셋 — 작은 토글 아이콘, next/image 최적화 실익 없음 */}
          <img
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
      <div
        className="fixed right-4 z-[25] flex flex-col items-center gap-2"
        style={{ bottom: `${FLOATING_BOTTOM_OFFSET + BOTTOM_NAV_HEIGHT}px` }}
      >
        <div className="flex flex-col items-center">
          <button
            onClick={onToggleFollow}
            className={`flex h-12 w-12 items-center justify-center rounded-full shadow-md transition-colors ${
              isLocating
                ? 'bg-primary/70 text-white'
                : isFollowing
                  ? 'bg-primary text-white'
                  : 'border border-border bg-surface text-text-secondary'
            }`}
            aria-label={isLocating ? '위치 확인 중' : isFollowing ? '따라가기 해제' : '내 위치로 이동'}
            disabled={isLocating}
          >
            {isLocating ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isFollowing ? (
              <Navigation className="h-5 w-5" />
            ) : (
              <Crosshair className="h-5 w-5" />
            )}
          </button>
        </div>

        <div className="flex flex-col items-center">
          <button
            onClick={() => setFeedbackOpen(true)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-md transition-transform hover:scale-105"
            aria-label="의견 보내기"
          >
            <MessageCircleMore className="h-5 w-5" />
          </button>
        </div>
      </div>

      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  );
}
