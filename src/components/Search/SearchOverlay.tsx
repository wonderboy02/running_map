'use client';

import { useCallback, useEffect, useRef } from 'react';
import RecommendedTerms from './RecommendedTerms';
import SearchResultsList from './SearchResultsList';
import { useUnifiedSearch } from '@/hooks/useUnifiedSearch';
import type { Spot, Course } from '@/types';
import { track } from '@/lib/analytics';

interface SearchOverlayProps {
  isOpen: boolean;
  isClosing: boolean;
  onCloseComplete: () => void;
  onRequestClose: () => void;
  query: string;
  onQueryChange: (q: string) => void;
  spots: Spot[];
  courses: Course[];
  onCourseSelect: (course: Course) => void;
  onSpotSelect: (spot: Spot) => void;
  onLocationSelect: (lat: number, lng: number, name?: string) => void;
}

export default function SearchOverlay({
  isOpen,
  isClosing,
  onCloseComplete,
  onRequestClose,
  query,
  onQueryChange,
  spots,
  courses,
  onCourseSelect,
  onSpotSelect,
  onLocationSelect,
}: SearchOverlayProps) {
  const { courseResults, spotResults, externalResults, isLoading } =
    useUnifiedSearch(query, spots, courses);

  // search_open: 오버레이가 열릴 때 한 번만 추적 + 타임스탬프 저장
  const prevIsOpenRef = useRef(false);
  const openedAtRef = useRef(0);
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      openedAtRef.current = Date.now();
      track('search_open', {});
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  const hasResultsRef = useRef(false);
  hasResultsRef.current = courseResults.length > 0 || spotResults.length > 0 || externalResults.length > 0;

  const handleAnimationEnd = useCallback(() => {
    if (isClosing) {
      track('search_close', {
        had_results: hasResultsRef.current,
        dwell_time_ms: openedAtRef.current > 0 ? Date.now() - openedAtRef.current : 0,
      });
      onCloseComplete();
    }
  }, [isClosing, onCloseComplete]);

  const handleCategoryTap = useCallback(
    (category: string) => {
      onQueryChange(category);
    },
    [onQueryChange],
  );

  const handleCourseSelect = useCallback(
    (course: Course) => {
      onCourseSelect(course);
      onRequestClose();
    },
    [onCourseSelect, onRequestClose],
  );

  const handleSpotSelect = useCallback(
    (spot: Spot) => {
      onSpotSelect(spot);
      onRequestClose();
    },
    [onSpotSelect, onRequestClose],
  );

  const handleLocationSelect = useCallback(
    (lat: number, lng: number, name?: string) => {
      onLocationSelect(lat, lng, name);
      onRequestClose();
    },
    [onLocationSelect, onRequestClose],
  );

  if (!isOpen && !isClosing) return null;

  return (
    <div
      className={`fixed top-12 inset-x-0 bottom-0 z-[38] bg-surface ${
        isClosing ? 'search-panel-exit' : 'search-panel-enter'
      }`}
      onAnimationEnd={handleAnimationEnd}
    >
      <div className="h-full overflow-y-auto">
        {query.trim().length === 0 ? (
          <RecommendedTerms
            courses={courses}
            spots={spots}
            onCourseTap={handleCourseSelect}
            onSpotTap={handleSpotSelect}
            onCategoryTap={handleCategoryTap}
          />
        ) : (
          <SearchResultsList
            courseResults={courseResults}
            spotResults={spotResults}
            externalResults={externalResults}
            isLoading={isLoading}
            query={query}
            onCourseSelect={handleCourseSelect}
            onSpotSelect={handleSpotSelect}
            onLocationSelect={handleLocationSelect}
          />
        )}
      </div>
    </div>
  );
}
