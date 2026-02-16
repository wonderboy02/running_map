'use client';

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { DuplicateStatusBadge } from './DuplicateStatusBadge';
import { SameAddressTooltip } from './SameAddressTooltip';
import type { SearchResultItem } from '@/hooks/useNaverSearch';
import { CATEGORIES } from '@/types';

interface SearchResultsTableProps {
  results: (SearchResultItem & {
    duplicateStatus: 'new' | 'warning' | 'duplicate' | 'no-result';
    existingSpots?: Array<{
      id: string;
      name: string;
      category: string;
    }>;
  })[];
}

export function SearchResultsTable({ results }: SearchResultsTableProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    itemCount: number;
    category: string;
  } | null>(null);

  // 추가 가능한 항목 (중복, 결과 없음 제외)
  const availableItems = results.filter(r => r.duplicateStatus !== 'duplicate' && r.duplicateStatus !== 'no-result');
  const availableIndices = results
    .map((r, i) => ({ ...r, index: i }))
    .filter(r => r.duplicateStatus !== 'duplicate' && r.duplicateStatus !== 'no-result')
    .map(r => r.index);

  const handleSelectAll = () => {
    if (selected.size === availableIndices.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(availableIndices));
    }
  };

  const handleToggleSelect = (index: number, shiftKey: boolean = false) => {
    const newSelected = new Set(selected);

    if (shiftKey && lastSelectedIndex !== null) {
      // Shift 키가 눌렸고 이전 선택이 있으면 범위 선택
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);

      for (let i = start; i <= end; i++) {
        if (availableIndices.includes(i)) {
          newSelected.add(i);
        }
      }
    } else {
      // 일반 토글
      if (newSelected.has(index)) {
        newSelected.delete(index);
      } else {
        newSelected.add(index);
      }
    }

    setSelected(newSelected);
    setLastSelectedIndex(index);
  };

  const [adding, setAdding] = useState(false);

  const handleAddToDB = () => {
    const selectedItems = Array.from(selected)
      .map(index => results[index])
      .filter(item => item.duplicateStatus !== 'duplicate');

    if (selectedItems.length === 0) return;

    if (!selectedCategory) {
      toast.error('카테고리를 선택해주세요.');
      return;
    }

    // Confirm Dialog 표시
    setConfirmDialog({
      open: true,
      title: 'DB에 추가',
      description: `${selectedItems.length}개 장소를 "${selectedCategory}" 카테고리로 DB에 추가하시겠습니까?`,
      itemCount: selectedItems.length,
      category: selectedCategory
    });
  };

  const handleConfirmAdd = async () => {
    if (!confirmDialog) return;

    const selectedItems = Array.from(selected)
      .map(index => results[index])
      .filter(item => item.duplicateStatus !== 'duplicate');

    setConfirmDialog(null);
    setAdding(true);

    try {
      const response = await fetch('/api/admin/spots/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spots: selectedItems.map(item => ({
            name: item.cleanName,
            address: item.roadAddress,
            latitude: item.latitude,
            longitude: item.longitude,
            phone: item.telephone || undefined,
            category: confirmDialog.category,
            extra_data: {
              naver_category: item.category,
              naver_link: item.link
            }
          }))
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        setSelected(new Set()); // 선택 해제
        setSelectedCategory(''); // 카테고리 초기화
        // TODO: 결과 새로고침 또는 중복 체크 다시 실행
      } else {
        toast.error(data.error || 'DB 추가에 실패했습니다.');
      }
    } catch (error) {
      console.error('[AddToDB] Error:', error);
      toast.error('DB 추가 중 오류가 발생했습니다.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* 툴바 */}
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={selected.size === availableIndices.length && availableIndices.length > 0}
            onCheckedChange={handleSelectAll}
            disabled={availableIndices.length === 0}
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
          <div className="flex items-center gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="카테고리 선택" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleAddToDB} disabled={adding || !selectedCategory}>
              {adding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  추가 중...
                </>
              ) : (
                `DB에 추가 (${selected.size}개)`
              )}
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
              <th className="pb-2 font-medium">전화번호</th>
              <th className="pb-2 font-medium text-center">상태</th>
            </tr>
          </thead>
          <tbody>
            {results.map((item, index) => {
              const isDisabled = item.duplicateStatus === 'duplicate' || item.duplicateStatus === 'no-result';
              return (
                <tr
                  key={index}
                  className={`border-b border-border ${
                    isDisabled ? 'opacity-50' : ''
                  }`}
                >
                  <td
                    className="py-3 cursor-pointer"
                    onClick={(e) => {
                      if (!isDisabled) {
                        handleToggleSelect(index, e.shiftKey);
                      }
                    }}
                  >
                    <Checkbox
                      checked={selected.has(index)}
                      disabled={isDisabled}
                      className="pointer-events-none"
                    />
                  </td>
                  <td className="py-3">
                    <div className="font-medium">{item.cleanName}</div>
                  </td>
                  <td className="py-3">
                    <div className="text-text-secondary text-xs">
                      {item.roadAddress}
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="text-text-secondary text-xs">
                      {item.category || '-'}
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="text-text-secondary text-xs">
                      {item.telephone || '-'}
                    </div>
                  </td>
                  <td className="py-3 text-center">
                    <div className="flex items-center justify-center">
                      <DuplicateStatusBadge status={item.duplicateStatus} />
                      {item.duplicateStatus === 'warning' && item.existingSpots && (
                        <SameAddressTooltip
                          roadAddress={item.roadAddress}
                          existingSpots={item.existingSpots}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {availableIndices.length === 0 && results.length > 0 && (
        <div className="text-center py-4 text-sm text-text-secondary">
          모든 항목이 이미 DB에 존재합니다.
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmDialog.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmAdd}>확인</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
