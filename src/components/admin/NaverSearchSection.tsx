'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';
import { useNaverSearch } from '@/hooks/useNaverSearch';
import { SearchResultsTable } from './SearchResultsTable';
import { checkDuplicateBatch } from '@/lib/duplicate-checker';

export function NaverSearchSection() {
  const [query, setQuery] = useState('');
  const [bulkQuery, setBulkQuery] = useState('');
  const { search, results, loading, error, total } = useNaverSearch();
  const [resultsWithDuplicateCheck, setResultsWithDuplicateCheck] = useState<any[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [bulkSearching, setBulkSearching] = useState(false);
  const [bulkStats, setBulkStats] = useState<{
    total: number;
    noResults: number;
    success: number;
    duplicate: number;
  } | null>(null);

  const handleSearch = async () => {
    if (query.trim().length < 2) return;
    await search(query, 5); // display=5 (Naver API 최댓값)
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleBulkSearch = async () => {
    if (!bulkQuery.trim()) return;

    setBulkSearching(true);
    setCheckingDuplicates(false);
    setBulkStats(null);

    try {
      // 줄바꿈으로 검색어 분리
      const queries = bulkQuery
        .split('\n')
        .map(q => q.trim())
        .filter(q => q.length >= 2);

      if (queries.length === 0) {
        return;
      }

      console.log(`[Bulk Search] ${queries.length}개 검색어 처리 시작`);

      // 통계 추적
      let noResultsCount = 0;
      let successCount = 0;

      // 각 검색어를 순차적으로 검색
      const allResults: any[] = [];

      for (let i = 0; i < queries.length; i++) {
        const searchQuery = queries[i];
        console.log(`[Bulk Search] ${i + 1}/${queries.length}: "${searchQuery}"`);

        try {
          const url = new URL('/api/admin/search-places', window.location.origin);
          url.searchParams.set('query', searchQuery);
          url.searchParams.set('display', '5');
          url.searchParams.set('start', '1');

          const response = await fetch(url.toString());
          const data = await response.json();

          if (data.success && data.items) {
            // 검색어와 정확히 일치하는 결과만 필터링
            const exactMatches = data.items.filter((item: any) =>
              item.cleanName === searchQuery
            );

            console.log(`   → ${data.items.length}개 결과 중 ${exactMatches.length}개 정확 일치`);

            if (exactMatches.length === 0) {
              noResultsCount++;
              // 결과 없음 항목 추가 (테이블에 표시용)
              allResults.push({
                cleanName: searchQuery,
                roadAddress: '검색 결과 없음',
                latitude: 0,
                longitude: 0,
                telephone: '',
                category: '',
                link: '',
                mapx: '0',
                mapy: '0',
                title: searchQuery,
                address: '',
                noResult: true // 특별 플래그
              });
            } else {
              successCount++;
              allResults.push(...exactMatches);
            }
          } else {
            noResultsCount++;
          }

          // API 호출 간 딜레이 (100ms)
          if (i < queries.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (err) {
          console.error(`[Bulk Search] "${searchQuery}" 검색 실패:`, err);
          noResultsCount++;
        }
      }

      console.log(`[Bulk Search] 총 ${allResults.length}개 정확 일치 결과`);

      // 중복 제거 (이름 + 주소 기준)
      const uniqueResults = Array.from(
        new Map(
          allResults.map(item => [
            `${item.cleanName}_${item.roadAddress}`,
            item
          ])
        ).values()
      );

      console.log(`[Bulk Search] 중복 제거 후 ${uniqueResults.length}개`);

      // 중복 체크 실행 (결과 없음 항목 제외)
      setCheckingDuplicates(true);
      const itemsToCheck = uniqueResults.filter(item => !item.noResult);
      const duplicateChecks = await checkDuplicateBatch(
        itemsToCheck.map(item => ({
          name: item.cleanName,
          roadAddress: item.roadAddress
        }))
      );

      // 결과 상태 설정
      let checkIndex = 0;
      const resultsWithStatus = uniqueResults.map((item) => {
        if (item.noResult) {
          return {
            ...item,
            duplicateStatus: 'no-result',
            existingSpots: []
          };
        }

        const status = duplicateChecks[checkIndex];
        checkIndex++;

        return {
          ...item,
          duplicateStatus: status.status,
          existingSpots: status.existingSpots
        };
      });

      // 중복 개수 계산
      const duplicateCount = resultsWithStatus.filter(
        r => r.duplicateStatus === 'duplicate'
      ).length;

      // 통계 설정
      setBulkStats({
        total: queries.length,
        noResults: noResultsCount,
        success: successCount,
        duplicate: duplicateCount
      });

      setResultsWithDuplicateCheck(resultsWithStatus);
    } catch (error) {
      console.error('[Bulk Search] Error:', error);
    } finally {
      setBulkSearching(false);
      setCheckingDuplicates(false);
    }
  };

  // 검색 결과가 바뀌면 중복 체크
  useEffect(() => {
    if (!results || results.length === 0) {
      setResultsWithDuplicateCheck([]);
      return;
    }

    const checkDuplicates = async () => {
      setCheckingDuplicates(true);
      try {
        const duplicateChecks = await checkDuplicateBatch(
          results.map(item => ({
            name: item.cleanName,
            roadAddress: item.roadAddress
          }))
        );

        const resultsWithStatus = results.map((item, index) => ({
          ...item,
          duplicateStatus: duplicateChecks[index].status,
          existingSpots: duplicateChecks[index].existingSpots
        }));

        setResultsWithDuplicateCheck(resultsWithStatus);
      } catch (error) {
        console.error('[NaverSearchSection] Duplicate check error:', error);
        // 에러 시 중복 체크 없이 표시
        setResultsWithDuplicateCheck(
          results.map(item => ({
            ...item,
            duplicateStatus: 'new'
          }))
        );
      } finally {
        setCheckingDuplicates(false);
      }
    };

    checkDuplicates();
  }, [results]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">네이버 장소 검색</h3>
        <p className="text-sm text-text-secondary mb-4">
          검색어를 입력하여 네이버 지역검색 API로 장소를 찾습니다.
        </p>
      </div>

      {/* 단일 검색 */}
      <div className="bg-surface rounded-lg border border-border p-4 space-y-3">
        <h4 className="font-medium text-sm">단일 검색</h4>
        <div className="flex gap-2">
          <Input
            placeholder="장소명 또는 주소 입력 (예: 강남역 카페)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading || bulkSearching}
            className="flex-1"
          />
          <Button
            onClick={handleSearch}
            disabled={loading || bulkSearching || query.trim().length < 2}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                검색 중...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                검색
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 일괄 검색 */}
      <div className="bg-surface rounded-lg border border-border p-4 space-y-3">
        <h4 className="font-medium text-sm">일괄 검색 (크롬 확장 결과 붙여넣기)</h4>
        <p className="text-xs text-text-secondary">
          여러 장소를 한 번에 검색합니다. 한 줄에 하나씩 입력하세요.
        </p>
        <textarea
          placeholder="장소명을 줄바꿈으로 입력&#10;예:&#10;강남역 카페&#10;홍대 사우나&#10;신촌 헬스장"
          value={bulkQuery}
          onChange={(e) => setBulkQuery(e.target.value)}
          disabled={loading || bulkSearching}
          className="w-full h-32 px-3 py-2 border border-border rounded-md resize-y font-mono text-sm"
        />
        <Button
          onClick={handleBulkSearch}
          disabled={loading || bulkSearching || !bulkQuery.trim()}
          className="w-full"
        >
          {bulkSearching ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              일괄 검색 중...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              일괄 검색
            </>
          )}
        </Button>
      </div>

      {/* 일괄 검색 통계 */}
      {bulkStats && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex gap-4">
              <span className="text-gray-700">
                전체: <strong>{bulkStats.total}건</strong>
              </span>
              <span className="text-green-700">
                성공: <strong>{bulkStats.success}건</strong>
              </span>
              <span className="text-red-700">
                결과 없음: <strong>{bulkStats.noResults}건</strong>
              </span>
              <span className="text-orange-700">
                중복: <strong>{bulkStats.duplicate}건</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* 검색 결과 */}
      {checkingDuplicates && (
        <div className="text-center py-4">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-text-secondary" />
          <p className="text-sm text-text-secondary mt-2">중복 확인 중...</p>
        </div>
      )}

      {!checkingDuplicates && resultsWithDuplicateCheck.length > 0 && (
        <div className="bg-surface rounded-lg border border-border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">
              검색 결과{' '}
              <span className="text-text-secondary text-sm">
                ({resultsWithDuplicateCheck.length}건)
              </span>
            </h4>
          </div>

          <SearchResultsTable results={resultsWithDuplicateCheck} />
        </div>
      )}

      {!loading && !checkingDuplicates && results && results.length === 0 && (
        <div className="text-center py-8 bg-surface rounded-lg border border-border">
          <p className="text-text-secondary">검색 결과가 없습니다.</p>
        </div>
      )}
    </div>
  );
}
