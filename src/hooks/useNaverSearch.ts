'use client';

import { useState } from 'react';

export interface SearchResultItem {
  // 원본 데이터
  title: string;
  category: string;
  telephone: string;
  address: string;
  roadAddress: string;
  mapx: string;
  mapy: string;
  link: string;

  // 변환된 데이터
  cleanName: string;
  latitude: number;
  longitude: number;

  // 중복 체크 결과 (나중에 추가)
  duplicateStatus?: 'new' | 'warning' | 'duplicate' | 'no-result';
  existingSpots?: Array<{
    id: string;
    name: string;
    category: string;
  }>;
}

interface SearchResponse {
  success: boolean;
  items: SearchResultItem[];
  total: number;
  query: string;
  error?: string;
}

export function useNaverSearch() {
  const [results, setResults] = useState<SearchResultItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [total, setTotal] = useState(0);

  const search = async (searchQuery: string, display = 5, start = 1) => {
    if (searchQuery.trim().length < 2) {
      setError('검색어는 2글자 이상 입력해주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    setQuery(searchQuery);

    try {
      const url = new URL('/api/admin/search-places', window.location.origin);
      url.searchParams.set('query', searchQuery);
      url.searchParams.set('display', display.toString());
      url.searchParams.set('start', start.toString());

      const response = await fetch(url.toString());
      const data: SearchResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'API 호출에 실패했습니다.');
      }

      setResults(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error('[useNaverSearch] Error:', err);
      setError(err instanceof Error ? err.message : '검색 중 오류가 발생했습니다.');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResults(null);
    setError(null);
    setQuery('');
    setTotal(0);
  };

  return {
    search,
    reset,
    results,
    loading,
    error,
    query,
    total,
  };
}
