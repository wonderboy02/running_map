'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Pencil, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { CATEGORIES } from '@/types';
import type { Spot } from '@/types';

type SortKey = 'created_at' | 'updated_at' | 'name';
type HighlightFilter = 'all' | 'highlighted' | 'normal';

function formatRelativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}개월 전`;
  return `${Math.floor(months / 12)}년 전`;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);

  // 필터/정렬 상태
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [highlightFilter, setHighlightFilter] = useState<HighlightFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');

  async function fetchSpots() {
    const { data } = await supabase
      .from('spots')
      .select('*')
      .order('created_at', { ascending: false });

    setSpots((data as Spot[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchSpots();
  }, []);

  // 필터 + 정렬 적용
  const filteredSpots = useMemo(() => {
    let result = spots;

    // 카테고리 필터
    if (categoryFilter !== 'all') {
      result = result.filter((s) => s.category === categoryFilter);
    }

    // 인기 필터
    if (highlightFilter === 'highlighted') {
      result = result.filter((s) => s.is_highlighted);
    } else if (highlightFilter === 'normal') {
      result = result.filter((s) => !s.is_highlighted);
    }

    // 정렬
    result = [...result].sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name, 'ko');
      // created_at, updated_at: 최신순 (내림차순)
      return new Date(b[sortKey]).getTime() - new Date(a[sortKey]).getTime();
    });

    return result;
  }, [spots, categoryFilter, highlightFilter, sortKey]);

  async function handleDelete(id: string) {
    try {
      // Storage에서 사진 파일 삭제
      const { data: spot } = await supabase.from('spots').select('photos').eq('id', id).single();
      if (spot?.photos && spot.photos.length > 0) {
        try {
          const res = await fetch('/api/admin/spot-photos', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urls: spot.photos }),
          });
          if (!res.ok) console.error('사진 파일 정리 실패:', res.status);
        } catch (err) {
          console.error('사진 파일 정리 중 오류:', err);
        }
      }

      const { error } = await supabase.from('spots').delete().eq('id', id);
      if (error) {
        toast.error('삭제에 실패했습니다: ' + error.message);
        return;
      }
      toast.success('장소가 삭제되었습니다.');
      fetchSpots();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('삭제 중 오류가 발생했습니다.');
    }
  }

  async function handleToggleHighlight(spot: Spot) {
    await supabase.from('spots').update({ is_highlighted: !spot.is_highlighted }).eq('id', spot.id);
    fetchSpots();
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">
          장소 목록{' '}
          <span className="text-text-secondary text-sm font-normal">({filteredSpots.length})</span>
        </h2>
        <Button size="sm" onClick={() => router.push('/admin/spots/new')}>
          <Plus className="mr-1 h-4 w-4" />
          장소 추가
        </Button>
      </div>

      {/* 필터/정렬 바 */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 카테고리</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={highlightFilter} onValueChange={(v) => setHighlightFilter(v as HighlightFilter)}>
          <SelectTrigger size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="highlighted">인기만</SelectItem>
            <SelectItem value="normal">일반만</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">생성일순</SelectItem>
            <SelectItem value="updated_at">수정일순</SelectItem>
            <SelectItem value="name">이름순</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-text-secondary text-sm">불러오는 중...</p>
      ) : filteredSpots.length === 0 ? (
        <p className="text-text-secondary py-8 text-center text-sm">
          {spots.length === 0 ? '등록된 장소가 없습니다.' : '조건에 맞는 장소가 없습니다.'}
        </p>
      ) : (
        <div className="space-y-3">
          {filteredSpots.map((spot) => (
            <Card key={spot.id}>
              <CardContent className="p-3">
                <div className="mb-1 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{spot.name}</h3>
                      {spot.is_highlighted && (
                        <Badge variant="secondary" className="bg-highlight-muted text-highlight-foreground">
                          인기
                        </Badge>
                      )}
                    </div>
                    <p className="text-text-secondary text-xs">{spot.address}</p>
                  </div>
                  <span className="text-text-muted text-xs whitespace-nowrap ml-2">
                    수정 {formatRelativeDate(spot.updated_at)}
                  </span>
                </div>

                <div className="mb-2">
                  <Badge
                    variant="secondary"
                    className="bg-surface-dim text-text-secondary text-xs"
                  >
                    {spot.category}
                  </Badge>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant={spot.is_highlighted ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => handleToggleHighlight(spot)}
                    className={
                      spot.is_highlighted ? 'bg-highlight-muted text-highlight-foreground' : ''
                    }
                  >
                    <Star className="mr-1 h-3 w-3" />
                    {spot.is_highlighted ? '인기 해제' : '인기 등록'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/admin/spots/${spot.id}/edit`)}
                  >
                    <Pencil className="mr-1 h-3 w-3" />
                    수정
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600">
                        <Trash2 className="mr-1 h-3 w-3" />
                        삭제
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>장소 삭제</AlertDialogTitle>
                        <AlertDialogDescription>
                          &quot;{spot.name}&quot;을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수
                          없습니다.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(spot.id)}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          삭제
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
