'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertTriangle, Search } from 'lucide-react';
import type { Spot } from '@/types';

type CheckStatus = 'pending' | 'ok' | 'not-found' | 'error';

interface CheckResult extends Spot {
  checkStatus: CheckStatus;
  errorMessage?: string;
}

export default function AdminCheckPage() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [results, setResults] = useState<CheckResult[]>([]);
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [filter, setFilter] = useState<'all' | 'ok' | 'not-found' | 'error'>('all');

  // DB에서 모든 장소 가져오기
  useEffect(() => {
    async function fetchSpots() {
      const { data } = await supabase
        .from('spots')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        setSpots(data);
      }
    }

    fetchSpots();
  }, []);

  // 점검 시작
  const handleStartCheck = async () => {
    if (spots.length === 0) return;

    setChecking(true);
    setResults([]);
    setProgress({ current: 0, total: spots.length });

    const newResults: CheckResult[] = [];

    for (let i = 0; i < spots.length; i++) {
      const spot = spots[i];
      setProgress({ current: i + 1, total: spots.length });

      try {
        // 네이버 API 검색
        const url = new URL('/api/admin/search-places', window.location.origin);
        url.searchParams.set('query', spot.name);
        url.searchParams.set('display', '5');
        url.searchParams.set('start', '1');

        const response = await fetch(url.toString());
        const data = await response.json();

        if (data.success && data.items) {
          // exact match 확인
          const exactMatch = data.items.some(
            (item: any) => item.cleanName === spot.name
          );

          newResults.push({
            ...spot,
            checkStatus: exactMatch ? 'ok' : 'not-found',
          });
        } else {
          newResults.push({
            ...spot,
            checkStatus: 'error',
            errorMessage: data.error || 'API 오류',
          });
        }
      } catch (error) {
        newResults.push({
          ...spot,
          checkStatus: 'error',
          errorMessage: '네트워크 오류',
        });
      }

      // API 호출 간 딜레이 (100ms)
      if (i < spots.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    setResults(newResults);
    setChecking(false);
  };

  // 필터링된 결과
  const filteredResults = results.filter((result) =>
    filter === 'all' ? true : result.checkStatus === filter
  );

  // 통계
  const stats = {
    total: results.length,
    ok: results.filter((r) => r.checkStatus === 'ok').length,
    notFound: results.filter((r) => r.checkStatus === 'not-found').length,
    error: results.filter((r) => r.checkStatus === 'error').length,
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">장소 점검</h2>
        <p className="text-sm text-text-secondary">
          DB에 저장된 모든 장소를 네이버 API로 검색하여 존재 여부를 확인합니다.
        </p>
      </div>

      {/* 점검 시작 */}
      <div className="bg-surface rounded-lg border border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold mb-1">전체 장소 점검</h3>
            <p className="text-sm text-text-secondary">
              총 {spots.length}개 장소가 등록되어 있습니다.
            </p>
          </div>
          <Button
            onClick={handleStartCheck}
            disabled={checking || spots.length === 0}
            size="lg"
          >
            {checking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                점검 중...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                점검 시작
              </>
            )}
          </Button>
        </div>

        {/* 진행 상황 */}
        {checking && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">
                {progress.current} / {progress.total}
              </span>
              <span className="text-text-secondary">
                {Math.round((progress.current / progress.total) * 100)}%
              </span>
            </div>
            <Progress value={(progress.current / progress.total) * 100} />
          </div>
        )}
      </div>

      {/* 통계 */}
      {results.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-6 text-sm">
            <div>
              전체: <strong>{stats.total}건</strong>
            </div>
            <div className="text-green-700">
              정상: <strong>{stats.ok}건</strong>
            </div>
            <div className="text-red-700">
              찾을 수 없음: <strong>{stats.notFound}건</strong>
            </div>
            {stats.error > 0 && (
              <div className="text-orange-700">
                오류: <strong>{stats.error}건</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 결과 테이블 */}
      {results.length > 0 && (
        <div className="bg-surface rounded-lg border border-border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">점검 결과</h3>
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                전체 ({stats.total})
              </Button>
              <Button
                variant={filter === 'ok' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('ok')}
              >
                정상 ({stats.ok})
              </Button>
              <Button
                variant={filter === 'not-found' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('not-found')}
              >
                찾을 수 없음 ({stats.notFound})
              </Button>
              {stats.error > 0 && (
                <Button
                  variant={filter === 'error' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('error')}
                >
                  오류 ({stats.error})
                </Button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr className="text-left">
                  <th className="pb-2 font-medium">장소명</th>
                  <th className="pb-2 font-medium">주소</th>
                  <th className="pb-2 font-medium">카테고리</th>
                  <th className="pb-2 font-medium text-center">상태</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((result) => (
                  <tr key={result.id} className="border-b border-border">
                    <td className="py-3">
                      <div className="font-medium">{result.name}</div>
                    </td>
                    <td className="py-3">
                      <div className="text-text-secondary text-xs">
                        {result.address}
                      </div>
                    </td>
                    <td className="py-3">
                      <Badge variant="outline">
                        {result.category}
                      </Badge>
                    </td>
                    <td className="py-3 text-center">
                      {result.checkStatus === 'ok' && (
                        <Badge className="bg-green-500 text-white hover:bg-green-600">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          정상
                        </Badge>
                      )}
                      {result.checkStatus === 'not-found' && (
                        <Badge className="bg-red-500 text-white hover:bg-red-600">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          찾을 수 없음
                        </Badge>
                      )}
                      {result.checkStatus === 'error' && (
                        <Badge className="bg-orange-500 text-white hover:bg-orange-600">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          오류
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredResults.length === 0 && (
            <div className="text-center py-8 text-sm text-text-secondary">
              해당 필터에 맞는 결과가 없습니다.
            </div>
          )}
        </div>
      )}

      {/* 초기 상태 */}
      {!checking && results.length === 0 && spots.length > 0 && (
        <div className="text-center py-12 bg-surface rounded-lg border border-border">
          <p className="text-text-secondary">
            "점검 시작" 버튼을 클릭하여 장소 점검을 시작하세요.
          </p>
        </div>
      )}

      {spots.length === 0 && (
        <div className="text-center py-12 bg-surface rounded-lg border border-border">
          <p className="text-text-secondary">등록된 장소가 없습니다.</p>
        </div>
      )}
    </div>
  );
}
