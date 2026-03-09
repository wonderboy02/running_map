'use client';

import { RefObject } from 'react';
import { MapPin, Route, Mail } from 'lucide-react';
import Image from 'next/image';
import type { Spot, Course } from '@/types';

interface DrawerListViewProps {
  spots: Spot[];
  courses: Course[];
  activeTab: 'spot' | 'course';
  onTabChange: (tab: 'spot' | 'course') => void;
  titleRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  onSpotClick: (spot: Spot) => void;
  onCourseClick: (course: Course) => void;
}

const GRID_PREVIEW_COUNT = 4;

function getDifficultyLabel(difficulty: number): string {
  if (difficulty <= 3) return '하';
  if (difficulty <= 6) return '중';
  return '상';
}

function SpotGridCard({
  spot,
  index,
  onClick,
}: {
  spot: Spot;
  index: number;
  onClick: () => void;
}) {
  const hasPhoto = spot.photos && spot.photos.length > 0;
  const hasFeatures = spot.features && spot.features.length > 0;

  return (
    <button onClick={onClick} className="w-full text-left">
      {/* 사진 영역 */}
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-surface-dim">
        {hasPhoto ? (
          <Image
            src={spot.photos[0]}
            alt={spot.name}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <MapPin className="h-8 w-8 text-text-muted" />
          </div>
        )}

        {/* 번호 */}
        <span className="absolute top-2 left-2 text-sm font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">
          {index + 1}
        </span>

        {/* 하단 그래디언트 + 이름/주소 */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2.5 pt-8">
          <p className="text-[clamp(13px,3.5vw,15px)] font-semibold leading-tight text-white">
            {spot.name}
          </p>
          <p className="mt-0.5 text-[clamp(11px,2.8vw,12px)] leading-tight text-white/80 line-clamp-1">
            {spot.address}
          </p>
        </div>
      </div>

      {/* Feature 태그 */}
      {hasFeatures && (
        <div className="mt-1.5 flex gap-1 overflow-hidden">
          {spot.features.slice(0, 3).map((feature) => (
            <span
              key={feature}
              className="flex-shrink-0 rounded-full bg-surface-dim px-2 py-0.5 text-[clamp(10px,2.5vw,11px)] text-text-secondary"
            >
              {feature}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

function CourseGridCard({
  course,
  onClick,
}: {
  course: Course;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="w-full text-left">
      {/* 지도 썸네일 */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-surface-dim">
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
      </div>

      {/* 텍스트 */}
      <div className="mt-1.5">
        <p className="text-[clamp(13px,3.5vw,14px)] font-semibold text-text leading-tight line-clamp-1">
          {course.name}
        </p>
        <div className="mt-0.5 flex min-h-[18px] items-center gap-1.5">
          {course.difficulty != null && (
            <span className="text-[clamp(11px,2.8vw,12px)] font-medium text-course">
              {getDifficultyLabel(course.difficulty)}
            </span>
          )}
          {course.difficulty != null && course.distance_km != null && (
            <span className="text-text-muted">·</span>
          )}
          {course.distance_km != null && (
            <span className="text-[clamp(11px,2.8vw,12px)] text-text-secondary">
              {course.distance_km}km
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export default function DrawerListView({
  spots,
  courses,
  activeTab,
  onTabChange,
  titleRef,
  contentRef,
  onSpotClick,
  onCourseClick,
}: DrawerListViewProps) {
  const runnerSpots = spots.filter((spot) => spot.category === '러너스팟');
  const activeCourses = courses.filter((c) => c.is_active);

  const currentItems = activeTab === 'spot' ? runnerSpots : activeCourses;

  return (
    <>
      {/* === titleRef: SNAP.TITLE 경계 === */}
      <div ref={titleRef} className="px-4 pb-3">
        {/* 세그먼트 토글 */}
        <div className="flex rounded-full bg-surface-dim p-1">
          <button
            onClick={() => onTabChange('spot')}
            className={`flex-1 rounded-full py-1.5 text-[clamp(12px,3vw,13px)] font-medium transition-colors ${
              activeTab === 'spot'
                ? 'bg-primary text-primary-foreground'
                : 'text-text-secondary'
            }`}
          >
            러너스팟
          </button>
          <button
            onClick={() => onTabChange('course')}
            className={`flex-1 rounded-full py-1.5 text-[clamp(12px,3vw,13px)] font-medium transition-colors ${
              activeTab === 'course'
                ? 'bg-primary text-primary-foreground'
                : 'text-text-secondary'
            }`}
          >
            러닝코스
          </button>
        </div>

        {/* 섹션 헤더 */}
        <div className="mt-3 flex items-center gap-2.5">
          {/* 정적 UI 에셋 — preloadMarkerImages() 캐시 공유를 위해 <img> 사용 */}
          <img
            src={activeTab === 'spot' ? '/markers/runner-default.png' : '/markers/course-default.png'}
            alt={activeTab === 'spot' ? '러너스팟' : '러닝코스'}
            width={32}
            height={32}
            className="h-8 w-8"
          />
          <div>
            <div className="text-[clamp(14px,3.8vw,16px)] font-bold text-text leading-tight">
              {activeTab === 'spot' ? '러너스팟' : '러닝코스'}
            </div>
            <div className="text-[clamp(11px,2.8vw,12px)] text-text-secondary">
              {activeTab === 'spot'
                ? `${runnerSpots.length}개 장소`
                : `${activeCourses.length}개 코스`}
            </div>
          </div>
        </div>
      </div>

      {/* === contentRef: SNAP.CONTENT 경계 (첫 4개) === */}
      <div ref={contentRef} className="px-4">
        {currentItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            {activeTab === 'spot' ? (
              <MapPin className="h-10 w-10 text-text-muted mb-2" />
            ) : (
              <Route className="h-10 w-10 text-text-muted mb-2" />
            )}
            <p className="text-sm text-text-secondary">
              {activeTab === 'spot'
                ? '필터에서 러너스팟을 켜면 장소가 표시됩니다.'
                : '등록된 러닝코스가 없습니다.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {activeTab === 'spot'
              ? runnerSpots.slice(0, GRID_PREVIEW_COUNT).map((spot, i) => (
                  <SpotGridCard
                    key={spot.id}
                    spot={spot}
                    index={i}
                    onClick={() => onSpotClick(spot)}
                  />
                ))
              : activeCourses.slice(0, GRID_PREVIEW_COUNT).map((course) => (
                  <CourseGridCard
                    key={course.id}
                    course={course}
                    onClick={() => onCourseClick(course)}
                  />
                ))}
          </div>
        )}
      </div>

      {/* 나머지 아이템 (SNAP.FULL에서 보임) */}
      {currentItems.length > GRID_PREVIEW_COUNT && (
        <div className="mt-3 px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {activeTab === 'spot'
              ? runnerSpots.slice(GRID_PREVIEW_COUNT).map((spot, i) => (
                  <SpotGridCard
                    key={spot.id}
                    spot={spot}
                    index={i + GRID_PREVIEW_COUNT}
                    onClick={() => onSpotClick(spot)}
                  />
                ))
              : activeCourses.slice(GRID_PREVIEW_COUNT).map((course) => (
                  <CourseGridCard
                    key={course.id}
                    course={course}
                    onClick={() => onCourseClick(course)}
                  />
                ))}
          </div>
        </div>
      )}

      {/* 제휴문의 */}
      <div className="px-4 py-4 text-center">
        <a
          href="mailto:contact@runnersspot.com"
          className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          <Mail className="h-3 w-3" />
          제휴문의
        </a>
      </div>
    </>
  );
}
