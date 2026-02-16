'use client';

import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import type { Spot } from '@/types';
import { CATEGORIES } from '@/types';
import { BulkEditDialog } from './BulkEditDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function SpotManagementTable() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  // 필터 상태
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [highlightFilter, setHighlightFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_desc');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;

  // 일괄 수정/삭제
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchSpots();
  }, [categoryFilter, highlightFilter, sortBy, page]);

  const fetchSpots = async () => {
    setLoading(true);
    try {
      let query = supabase.from('spots').select('*', { count: 'exact' });

      // 카테고리 필터
      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      // 인기 장소 필터
      if (highlightFilter === 'highlighted') {
        query = query.eq('is_highlighted', true);
      } else if (highlightFilter === 'normal') {
        query = query.eq('is_highlighted', false);
      }

      // 정렬
      if (sortBy === 'created_desc') {
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === 'created_asc') {
        query = query.order('created_at', { ascending: true });
      } else if (sortBy === 'name_asc') {
        query = query.order('name', { ascending: true });
      }

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error('[SpotManagementTable] Error:', error);
        return;
      }

      setSpots((data as Spot[]) || []);
      setTotalCount(count || 0);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selected.size === spots.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(spots.map(s => s.id)));
    }
  };

  const handleToggleSelect = (id: string, shiftKey: boolean = false) => {
    const newSelected = new Set(selected);

    if (shiftKey && lastSelectedId !== null) {
      // Shift 키가 눌렸고 이전 선택이 있으면 범위 선택
      const lastIndex = spots.findIndex(s => s.id === lastSelectedId);
      const currentIndex = spots.findIndex(s => s.id === id);

      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);

        for (let i = start; i <= end; i++) {
          newSelected.add(spots[i].id);
        }
      }
    } else {
      // 일반 토글
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
    }

    setSelected(newSelected);
    setLastSelectedId(id);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const handleDelete = async () => {
    if (selected.size === 0) return;

    setDeleting(true);

    try {
      const response = await fetch('/api/admin/spots/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spotIds: Array.from(selected)
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        setSelected(new Set());
        setDeleteDialogOpen(false);
        fetchSpots(); // 새로고침
      } else {
        toast.error(data.error || '삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('[Delete] Error:', error);
      toast.error('삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  const handleEditSuccess = () => {
    setSelected(new Set());
    fetchSpots(); // 새로고침
  };

  return (
    <div className="space-y-4">
      {/* 필터 & 정렬 */}
      <div className="flex flex-wrap gap-3">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="카테고리" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 카테고리</SelectItem>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={highlightFilter} onValueChange={setHighlightFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="인기 장소" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="highlighted">인기 장소만</SelectItem>
            <SelectItem value="normal">일반만</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="정렬" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_desc">최신순</SelectItem>
            <SelectItem value="created_asc">오래된순</SelectItem>
            <SelectItem value="name_asc">이름순</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-text-secondary" />
          <p className="text-sm text-text-secondary mt-2">불러오는 중...</p>
        </div>
      ) : (
        <>
          {/* 툴바 */}
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selected.size === spots.length && spots.length > 0}
                onCheckedChange={handleSelectAll}
                disabled={spots.length === 0}
              />
              <span className="text-sm text-text-secondary">
                전체 선택{' '}
                {selected.size > 0 && (
                  <span className="font-medium text-primary">
                    (선택: {selected.size}개)
                  </span>
                )}
              </span>
            </div>

            {selected.size > 0 && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditDialogOpen(true)}
                >
                  일괄 수정
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  삭제
                </Button>
              </div>
            )}
          </div>

          {/* 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr className="text-left">
                  <th className="pb-2 w-10"></th>
                  <th className="pb-2 font-medium">장소명</th>
                  <th className="pb-2 font-medium">주소</th>
                  <th className="pb-2 font-medium">카테고리</th>
                  <th className="pb-2 font-medium text-center">상태</th>
                </tr>
              </thead>
              <tbody>
                {spots.map(spot => (
                  <tr key={spot.id} className="border-b border-border">
                    <td
                      className="py-3 cursor-pointer"
                      onClick={(e) => {
                        handleToggleSelect(spot.id, e.shiftKey);
                      }}
                    >
                      <Checkbox
                        checked={selected.has(spot.id)}
                        className="pointer-events-none"
                      />
                    </td>
                    <td className="py-3">
                      <div className="font-medium">{spot.name}</div>
                    </td>
                    <td className="py-3">
                      <div className="text-text-secondary text-xs">
                        {spot.address}
                      </div>
                    </td>
                    <td className="py-3">
                      <Badge variant="secondary" className="text-xs">
                        {spot.category}
                      </Badge>
                    </td>
                    <td className="py-3 text-center">
                      {spot.is_highlighted && (
                        <Badge className="bg-highlight-muted text-highlight-foreground">
                          인기
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {spots.length === 0 && (
            <div className="text-center py-8 text-sm text-text-secondary">
              조건에 맞는 장소가 없습니다.
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                이전
              </Button>

              <span className="text-sm text-text-secondary">
                {page} / {totalPages} 페이지 (총 {totalCount}개)
              </span>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                다음
              </Button>
            </div>
          )}
        </>
      )}

      {/* 일괄 수정 다이얼로그 */}
      <BulkEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        selectedCount={selected.size}
        selectedIds={Array.from(selected)}
        onSuccess={handleEditSuccess}
      />

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>장소 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              선택한 {selected.size}개 장소를 삭제하시겠습니까?
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  삭제 중...
                </>
              ) : (
                '삭제'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
