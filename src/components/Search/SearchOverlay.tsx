'use client';

import { useState, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import RecommendedTerms from './RecommendedTerms';
import SearchResultsList from './SearchResultsList';
import { useUnifiedSearch } from '@/hooks/useUnifiedSearch';
import type { Spot, Course } from '@/types';

interface SearchOverlayProps {
  isOpen: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  onClose: () => void;
  spots: Spot[];
  courses: Course[];
  onCourseSelect: (course: Course) => void;
  onSpotSelect: (spot: Spot) => void;
  onLocationSelect: (lat: number, lng: number) => void;
}

export default function SearchOverlay({
  isOpen,
  query,
  onQueryChange,
  onClose,
  spots,
  courses,
  onCourseSelect,
  onSpotSelect,
  onLocationSelect,
}: SearchOverlayProps) {
  const [isExiting, setIsExiting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { courseResults, spotResults, externalResults, isLoading } =
    useUnifiedSearch(query, spots, courses);

  const requestClose = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);
  }, [isExiting]);

  const handleAnimationEnd = useCallback(() => {
    if (isExiting) {
      setIsExiting(false);
      onClose();
    }
  }, [isExiting, onClose]);

  const handleClearQuery = useCallback(() => {
    onQueryChange('');
    inputRef.current?.focus();
  }, [onQueryChange]);

  const handleCategoryTap = useCallback(
    (category: string) => {
      onQueryChange(category);
    },
    [onQueryChange],
  );

  // 결과 선택 시에도 exit 애니메이션을 거친 후 콜백 실행
  const handleCourseSelect = useCallback(
    (course: Course) => {
      onCourseSelect(course);
      requestClose();
    },
    [onCourseSelect, requestClose],
  );

  const handleSpotSelect = useCallback(
    (spot: Spot) => {
      onSpotSelect(spot);
      requestClose();
    },
    [onSpotSelect, requestClose],
  );

  const handleLocationSelect = useCallback(
    (lat: number, lng: number) => {
      onLocationSelect(lat, lng);
      requestClose();
    },
    [onLocationSelect, requestClose],
  );

  if (!isOpen && !isExiting) return null;

  return (
    <div
      className={`fixed inset-0 z-[60] bg-surface flex flex-col ${
        isExiting ? 'search-overlay-exit' : 'search-overlay-enter'
      }`}
      onAnimationEnd={handleAnimationEnd}
    >
      {/* 상단 검색 바 */}
      <div className="flex items-center gap-2.5 px-4 h-12 flex-shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
          <input
            ref={inputRef}
            autoFocus
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="장소, 코스 검색"
            className="w-full h-9 pl-10 pr-9 rounded-full border border-border bg-surface-dim text-[clamp(13px,3.5vw,15px)] outline-none focus:border-primary"
          />
          {query && (
            <button
              type="button"
              onClick={handleClearQuery}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5"
            >
              <X className="w-4 h-4 text-text-secondary" />
            </button>
          )}
        </div>
        <button
          onClick={requestClose}
          className={`text-text-secondary flex-shrink-0 text-[clamp(13px,3.5vw,15px)] min-w-[40px] min-h-[40px] flex items-center justify-center -mr-1.5 ${
            !isExiting ? 'search-cancel-enter' : ''
          }`}
        >
          취소
        </button>
      </div>

      {/* 스크롤 영역 */}
      <div className={`flex-1 overflow-y-auto ${!isExiting ? 'search-content-enter' : ''}`}>
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
