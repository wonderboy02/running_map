'use client';

import { useMemo, useEffect, useRef } from 'react';
import { useGeocode } from '@/hooks/useGeocode';
import type { Spot, Course } from '@/types';
import type { GeocodeResult } from '@/hooks/useGeocode';
import { track } from '@/lib/analytics';

interface UnifiedSearchResults {
  courseResults: Course[];
  spotResults: Spot[];
  externalResults: GeocodeResult[];
  isLoading: boolean;
}

/** 스팟 관련도 점수 — 가산 방식 (높을수록 상위 노출) */
function scoreSpot(spot: Spot, q: string): number {
  let score = 0;
  const name = spot.name.toLowerCase();

  // name: 정확 > 시작 > 부분 (중첩 방지, 최대 하나만)
  if (name === q) score += 100;
  else if (name.startsWith(q)) score += 80;
  else if (name.includes(q)) score += 60;

  if (spot.search_tags?.some((tag) => tag.toLowerCase().includes(q))) score += 50;
  if (spot.address.toLowerCase().includes(q)) score += 30;
  if (spot.category.toLowerCase().includes(q)) score += 20;
  if (spot.features.some((feat) => feat.toLowerCase().includes(q))) score += 20;

  return score;
}

/** 코스 관련도 점수 — 가산 방식 */
function scoreCourse(course: Course, q: string): number {
  let score = 0;
  const name = course.name.toLowerCase();

  if (name === q) score += 100;
  else if (name.startsWith(q)) score += 80;
  else if (name.includes(q)) score += 60;

  if (course.search_tags?.some((tag) => tag.toLowerCase().includes(q))) score += 50;
  if (course.description?.toLowerCase().includes(q)) score += 30;

  return score;
}

export function useUnifiedSearch(
  query: string,
  spots: Spot[],
  courses: Course[],
): UnifiedSearchResults {
  const { results: externalResults, loading: isLoading, search, clear } = useGeocode();

  // 1. Local course 검색 (동기, 즉시) — 관련도 점수 정렬
  const courseResults = useMemo(() => {
    if (!query || query.trim().length < 1) return [];
    const q = query.toLowerCase().trim();
    return courses
      .map((course) => ({ course, score: scoreCourse(course, q) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ course }) => course);
  }, [query, courses]);

  // 2. Local spot 검색 (동기, 즉시) — 관련도 점수 정렬
  const spotResults = useMemo(() => {
    if (!query || query.trim().length < 1) return [];
    const q = query.toLowerCase().trim();
    return spots
      .map((spot) => ({ spot, score: scoreSpot(spot, q) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ spot }) => spot);
  }, [query, spots]);

  // 3. 네이버 API 검색 (useGeocode에 위임, 500ms debounce + AbortController)
  useEffect(() => {
    if (query.trim().length >= 2) {
      search(query);
    } else {
      clear();
    }
  }, [query, search, clear]);

  // 4. search_query 이벤트: 외부 검색 로딩 완료(true→false) 시 전송
  const wasLoadingRef = useRef(false);
  useEffect(() => {
    if (wasLoadingRef.current && !isLoading && query.trim().length >= 2) {
      track('search_query', {
        query: query.trim(),
        query_length: query.trim().length,
        result_count_spots: spotResults.length,
        result_count_courses: courseResults.length,
        result_count_external: externalResults.length,
      });
    }
    wasLoadingRef.current = isLoading;
  }, [isLoading, query, spotResults.length, courseResults.length, externalResults.length]);

  return { courseResults, spotResults, externalResults, isLoading };
}
