'use client';

import { useState } from 'react';
import { Eye, EyeOff, LocateFixed, Navigation, Send } from 'lucide-react';
import FeedbackDialog from '@/components/FeedbackDialog';

interface FloatingControlsProps {
  showCourses: boolean;
  onToggleCourses: (checked: boolean) => void;
  isFollowing: boolean;
  onToggleFollow: () => void;
}

export default function FloatingControls({
  showCourses,
  onToggleCourses,
  isFollowing,
  onToggleFollow,
}: FloatingControlsProps) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      {/* 오른쪽 상단: 코스 토글 */}
      <div className="fixed right-3 top-[104px] z-[25] flex flex-col items-center">
        <button
          onClick={() => onToggleCourses(!showCourses)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white shadow-md transition-colors"
          aria-label="코스 토글"
        >
          {showCourses ? (
            <Eye className="h-[18px] w-[18px] text-primary" />
          ) : (
            <EyeOff className="h-[18px] w-[18px] text-gray-400" />
          )}
        </button>
        <span className="mt-0.5 text-[10px] font-medium text-gray-500">
          {showCourses ? '코스 ON' : '코스 OFF'}
        </span>
      </div>

      {/* 오른쪽 하단: 내 위치 + 피드백 */}
      <div className="fixed bottom-[60px] right-4 z-[25] flex flex-col items-center gap-2">
        <button
          onClick={onToggleFollow}
          className={`flex h-12 w-12 items-center justify-center rounded-full shadow-md transition-colors ${
            isFollowing
              ? 'bg-primary text-white'
              : 'border border-gray-200 bg-white text-gray-700'
          }`}
          aria-label={isFollowing ? '따라가기 해제' : '내 위치로 이동'}
        >
          {isFollowing ? (
            <Navigation className="h-5 w-5" />
          ) : (
            <LocateFixed className="h-5 w-5" />
          )}
        </button>

        <button
          onClick={() => setFeedbackOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-md transition-transform hover:scale-105"
          aria-label="의견 보내기"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>

      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  );
}
