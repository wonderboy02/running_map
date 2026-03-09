'use client';

import { RefObject } from 'react';
import { Route, Gauge, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Course } from '@/types';
import { getDifficultyLabel } from '@/lib/course-utils';

interface DrawerCourseDetailProps {
  course: Course;
  titleRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
}

export default function DrawerCourseDetail({
  course,
  titleRef,
  contentRef,
  onClose,
}: DrawerCourseDetailProps) {
  return (
    <>
      {/* Close Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="absolute top-2 right-2 z-20 h-8 w-8 rounded-full"
        aria-label="닫기"
      >
        <X className="h-4 w-4" />
      </Button>

      {/* === titleRef: SNAP.TITLE 경계 === */}
      <div ref={titleRef} className="px-4 pt-3 pb-4 pr-12">
        <h2 className="text-[clamp(18px,5vw,22px)] font-bold text-text leading-tight tracking-tight mb-2">
          {course.name}
        </h2>
        <div className="flex items-center gap-4 text-text-secondary">
          {course.distance_km != null && (
            <div className="flex items-center gap-1.5">
              <Route className="w-4 h-4 text-course" />
              <span className="text-[clamp(13px,3.5vw,15px)] font-medium">
                {course.distance_km}km
              </span>
            </div>
          )}
          {course.difficulty != null && (
            <div className="flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-course" />
              <span className="text-[clamp(13px,3.5vw,15px)] font-medium">
                난이도 {getDifficultyLabel(course.difficulty)} ({course.difficulty}/10)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* === contentRef: SNAP.CONTENT 경계 === */}
      <div ref={contentRef} className="px-4 pb-4 space-y-4">
        {course.description && (
          <div className="p-3.5 bg-surface-dim rounded-xl">
            <p className="text-[clamp(13px,3.5vw,15px)] text-text-secondary leading-relaxed whitespace-pre-line">
              {course.description}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
