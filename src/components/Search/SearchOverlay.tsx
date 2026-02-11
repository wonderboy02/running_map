'use client';

import { useCallback } from 'react';
import RecommendedTerms from './RecommendedTerms';
import SearchResultsList from './SearchResultsList';
import { useUnifiedSearch } from '@/hooks/useUnifiedSearch';
import type { Spot, Course } from '@/types';

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
  onLocationSelect: (lat: number, lng: number) => void;
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

  const handleAnimationEnd = useCallback(() => {
    if (isClosing) {
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
    (lat: number, lng: number) => {
      onLocationSelect(lat, lng);
      onRequestClose();
    },
    [onLocationSelect, onRequestClose],
  );

  if (!isOpen && !isClosing) return null;

  return (
    <div
      className={`fixed top-12 inset-x-0 bottom-0 z-[35] bg-surface ${
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
            onCourseSelect={handleCourseSelect}
            onSpotSelect={handleSpotSelect}
            onLocationSelect={handleLocationSelect}
          />
        )}
      </div>
    </div>
  );
}
