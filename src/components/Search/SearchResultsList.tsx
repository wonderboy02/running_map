'use client';

import { Route, MapPin, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import type { Spot, Course } from '@/types';
import type { GeocodeResult } from '@/hooks/useGeocode';

interface SearchResultsListProps {
  courseResults: Course[];
  spotResults: Spot[];
  externalResults: GeocodeResult[];
  isLoading: boolean;
  onCourseSelect: (course: Course) => void;
  onSpotSelect: (spot: Spot) => void;
  onLocationSelect: (lat: number, lng: number, name?: string) => void;
}

export default function SearchResultsList({
  courseResults,
  spotResults,
  externalResults,
  isLoading,
  onCourseSelect,
  onSpotSelect,
  onLocationSelect,
}: SearchResultsListProps) {
  const hasCourses = courseResults.length > 0;
  const hasSpots = spotResults.length > 0;
  const hasExternal = externalResults.length > 0;
  const hasAnyResult = hasCourses || hasSpots || hasExternal;

  return (
    <div className="py-1">
      {/* 1. 러닝 코스 결과 */}
      {hasCourses && (
        <div className="px-4 py-2">
          <h3 className="text-text-secondary text-[clamp(11px,2.8vw,12px)] font-medium uppercase tracking-wider mb-1.5">
            러닝 코스
          </h3>
          {courseResults.map((course) => (
            <button
              key={course.id}
              onClick={() => onCourseSelect(course)}
              className="flex items-center gap-2.5 w-full py-2.5 text-left rounded-lg active:bg-surface-dim transition-colors px-1"
            >
              <Route className="w-4 h-4 flex-shrink-0 text-primary" />
              <span className="text-text text-[clamp(13px,3.5vw,15px)] font-medium truncate">
                {course.name}
              </span>
            </button>
          ))}
        </div>
      )}

      {hasCourses && (hasSpots || hasExternal) && <Separator />}

      {/* 2. 장소 결과 */}
      {hasSpots && (
        <div className="px-4 py-2">
          <h3 className="text-text-secondary text-[clamp(11px,2.8vw,12px)] font-medium uppercase tracking-wider mb-1.5">
            장소
          </h3>
          {spotResults.map((spot) => (
            <button
              key={spot.id}
              onClick={() => onSpotSelect(spot)}
              className="flex items-start gap-2.5 w-full py-2.5 text-left rounded-lg active:bg-surface-dim transition-colors px-1"
            >
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-text text-[clamp(13px,3.5vw,15px)] font-medium truncate">
                  {spot.name}
                </p>
                <p className="text-text-secondary text-[clamp(12px,3vw,13px)] truncate">
                  {spot.address}
                </p>
                {spot.categories.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {spot.categories.map((cat) => (
                      <Badge key={cat} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {hasSpots && hasExternal && <Separator />}

      {/* 3. 검색 결과 (네이버 API) */}
      {hasExternal && (
        <div className="px-4 py-2">
          <h3 className="text-text-secondary text-[clamp(11px,2.8vw,12px)] font-medium uppercase tracking-wider mb-1.5">
            검색 결과
          </h3>
          {externalResults.map((result, i) => (
            <button
              key={i}
              onClick={() => onLocationSelect(result.latitude, result.longitude, result.placeName || result.roadAddress)}
              className="flex items-start gap-2.5 w-full py-2.5 text-left rounded-lg active:bg-surface-dim transition-colors px-1"
            >
              <MapPin
                className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                  result.source === 'place' ? 'text-highlight-foreground' : 'text-primary'
                }`}
              />
              <div className="min-w-0 flex-1">
                {result.placeName ? (
                  <>
                    <p className="text-text text-[clamp(13px,3.5vw,15px)] font-medium truncate">
                      {result.placeName}
                    </p>
                    <p className="text-text-secondary text-[clamp(12px,3vw,13px)] truncate">
                      {result.roadAddress}
                    </p>
                    {result.category && (
                      <p className="text-text-secondary text-[clamp(11px,2.8vw,12px)] truncate mt-0.5">
                        {result.category}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-text text-[clamp(13px,3.5vw,15px)] font-medium truncate">
                      {result.roadAddress}
                    </p>
                    {result.jibunAddress && result.jibunAddress !== result.roadAddress && (
                      <p className="text-text-secondary text-[clamp(12px,3vw,13px)] truncate">
                        {result.jibunAddress}
                      </p>
                    )}
                  </>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 로딩 스피너 */}
      {isLoading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 text-text-secondary animate-spin" />
        </div>
      )}

      {/* 결과 없음 */}
      {!isLoading && !hasAnyResult && (
        <div className="px-4 py-8 text-center">
          <p className="text-text-secondary text-[clamp(13px,3.5vw,15px)]">
            검색 결과가 없습니다.
          </p>
        </div>
      )}
    </div>
  );
}
