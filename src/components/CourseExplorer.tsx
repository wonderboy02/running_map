'use client';

import { useState } from 'react';
import { Route } from 'lucide-react';
import Image from 'next/image';
import type { Course } from '@/types';
import { BOTTOM_NAV_HEIGHT } from '@/components/BottomNavigation';

type DifficultyFilter = '쉬움' | '보통' | '어려움';
type DistanceFilter = '5km 이하' | '5-10km' | '10km 이상';

interface CourseFilters {
  difficulty: DifficultyFilter[];
  distance: DistanceFilter[];
}

const initialFilters: CourseFilters = {
  difficulty: [],
  distance: [],
};

const DISTANCE_OPTIONS: DistanceFilter[] = ['5km 이하', '5-10km', '10km 이상'];
const DIFFICULTY_OPTIONS: DifficultyFilter[] = ['쉬움', '보통', '어려움'];

function getDifficultyLabel(difficulty: number): DifficultyFilter {
  if (difficulty <= 3) return '쉬움';
  if (difficulty <= 6) return '보통';
  return '어려움';
}

function filterCourses(courses: Course[], filters: CourseFilters): Course[] {
  return courses.filter((course) => {
    if (filters.difficulty.length > 0) {
      if (course.difficulty == null) return false;
      if (!filters.difficulty.includes(getDifficultyLabel(course.difficulty))) return false;
    }
    if (filters.distance.length > 0) {
      if (course.distance_km == null) return false;
      const match = filters.distance.some((r) => {
        switch (r) {
          case '5km 이하':
            return course.distance_km! <= 5;
          case '5-10km':
            return course.distance_km! > 5 && course.distance_km! <= 10;
          case '10km 이상':
            return course.distance_km! > 10;
        }
      });
      if (!match) return false;
    }
    return true;
  });
}

function CourseFilterChips({
  filters,
  onChange,
}: {
  filters: CourseFilters;
  onChange: (filters: CourseFilters) => void;
}) {
  const toggleDistance = (value: DistanceFilter) => {
    const next = filters.distance.includes(value)
      ? filters.distance.filter((v) => v !== value)
      : [...filters.distance, value];
    onChange({ ...filters, distance: next });
  };

  const toggleDifficulty = (value: DifficultyFilter) => {
    const next = filters.difficulty.includes(value)
      ? filters.difficulty.filter((v) => v !== value)
      : [...filters.difficulty, value];
    onChange({ ...filters, difficulty: next });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <span className="text-[clamp(11px,2.8vw,12px)] text-text-muted">거리</span>
        {DISTANCE_OPTIONS.map((option) => (
          <button
            key={option}
            aria-pressed={filters.distance.includes(option)}
            onClick={() => toggleDistance(option)}
            className={`rounded-full border px-3 py-1.5 text-[clamp(12px,3vw,13px)] transition-colors ${
              filters.distance.includes(option)
                ? 'border-primary bg-primary/10 font-medium text-primary'
                : 'border-border bg-surface text-text-secondary'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[clamp(11px,2.8vw,12px)] text-text-muted">난이도</span>
        {DIFFICULTY_OPTIONS.map((option) => (
          <button
            key={option}
            aria-pressed={filters.difficulty.includes(option)}
            onClick={() => toggleDifficulty(option)}
            className={`rounded-full border px-3 py-1.5 text-[clamp(12px,3vw,13px)] transition-colors ${
              filters.difficulty.includes(option)
                ? 'border-primary bg-primary/10 font-medium text-primary'
                : 'border-border bg-surface text-text-secondary'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function CourseCard({ course, onClick }: { course: Course; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full overflow-hidden rounded-2xl border border-border bg-surface text-left">
      {/* 썸네일 + 거리 배지 */}
      <div className="relative mx-2.5 mt-2.5 aspect-[4/3] overflow-hidden rounded-xl bg-surface-dim">
        {course.image_url ? (
          <Image
            src={course.image_url}
            alt={course.name}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Route className="h-8 w-8 text-text-muted" />
          </div>
        )}
        {course.distance_km != null && (
          <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-0.5 text-[clamp(10px,2.5vw,11px)] font-semibold text-white">
            {course.distance_km}km
          </span>
        )}
      </div>

      {/* 카드 바디 */}
      <div className="p-2.5 pt-2">
        {/* 태그 배지들 */}
        <div className="mb-1.5 flex flex-wrap gap-1">
          {course.difficulty != null && (
            <span className="rounded-full border border-course/40 px-2 py-0.5 text-[10px] font-medium text-course">
              {getDifficultyLabel(course.difficulty)}
            </span>
          )}
          {(course.search_tags ?? []).slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border px-2 py-0.5 text-[10px] text-text-secondary"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* 코스명 */}
        <p className="text-[clamp(13px,3.5vw,14px)] font-bold leading-tight text-text line-clamp-1">
          {course.name}
        </p>

        {/* 설명 */}
        {course.description && (
          <p className="mt-0.5 text-[clamp(11px,2.8vw,12px)] text-text-muted line-clamp-1">
            {course.description}
          </p>
        )}
      </div>
    </button>
  );
}

interface CourseExplorerProps {
  courses: Course[];
  onCourseClick: (course: Course) => void;
}

export default function CourseExplorer({ courses, onCourseClick }: CourseExplorerProps) {
  const [filters, setFilters] = useState<CourseFilters>(initialFilters);

  const activeCourses = courses.filter((c) => c.is_active);
  const filteredCourses = filterCourses(activeCourses, filters);

  return (
    <div className="flex-1 overflow-y-auto bg-surface" style={{ paddingBottom: BOTTOM_NAV_HEIGHT }}>
      {/* Header 높이만큼 스페이서 — 스크롤 시 사라짐 */}
      <div className="h-12" />
      {/* 고정 필터 영역 */}
      <div className="sticky top-12 z-10 border-b border-border bg-surface px-4 py-3">
        <CourseFilterChips filters={filters} onChange={setFilters} />
        <p className="mt-2 text-[clamp(12px,3vw,13px)] text-text-muted">
          전체 {filteredCourses.length}개 코스
        </p>
      </div>

      {/* 코스 그리드 */}
      <div className="p-4">
        {filteredCourses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Route className="mb-2 h-10 w-10 text-text-muted" />
            <p className="text-sm text-text-secondary">조건에 맞는 코스가 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredCourses.map((course) => (
              <CourseCard key={course.id} course={course} onClick={() => onCourseClick(course)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
