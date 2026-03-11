'use client';

import { Crosshair, Loader2, MessageCircleMore, Navigation } from 'lucide-react';
import { BOTTOM_NAV_HEIGHT } from '@/components/BottomNavigation';

const FLOATING_BOTTOM_OFFSET = 60; // BottomDrawer peek 높이 기준 여백

interface FloatingControlsProps {
  isFollowing: boolean;
  isLocating: boolean;
  onToggleFollow: () => void;
  onFeedbackClick: () => void;
}

export default function FloatingControls({
  isFollowing,
  isLocating,
  onToggleFollow,
  onFeedbackClick,
}: FloatingControlsProps) {
  return (
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
          onClick={onFeedbackClick}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-md transition-transform hover:scale-105"
          aria-label="의견 보내기"
        >
          <MessageCircleMore className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
