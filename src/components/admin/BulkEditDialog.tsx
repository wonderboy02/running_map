'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { CATEGORIES } from '@/types';

interface BulkEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  selectedIds: string[];
  onSuccess: () => void;
}

export function BulkEditDialog({
  open,
  onOpenChange,
  selectedCount,
  selectedIds,
  onSuccess
}: BulkEditDialogProps) {
  const [loading, setLoading] = useState(false);

  // 수정 옵션
  const [updateHighlight, setUpdateHighlight] = useState(false);
  const [highlightValue, setHighlightValue] = useState<boolean>(true);

  const [updateCategories, setUpdateCategories] = useState(false);
  const [categoryAction, setCategoryAction] = useState<'add' | 'remove'>('add');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const [updateDescription, setUpdateDescription] = useState(false);
  const [description, setDescription] = useState('');

  const [updatePhone, setUpdatePhone] = useState(false);
  const [phone, setPhone] = useState('');

  const handleToggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleSubmit = async () => {
    if (!updateHighlight && !updateCategories && !updateDescription && !updatePhone) {
      alert('수정할 항목을 선택해주세요.');
      return;
    }

    if (updateCategories && selectedCategories.length === 0) {
      alert('카테고리를 선택해주세요.');
      return;
    }

    setLoading(true);

    try {
      const updates: any = {};

      if (updateHighlight) {
        updates.is_highlighted = highlightValue;
      }

      if (updateCategories) {
        updates.categories = {
          action: categoryAction,
          values: selectedCategories
        };
      }

      if (updateDescription) {
        updates.description = description.trim() || null;
      }

      if (updatePhone) {
        updates.phone = phone.trim() || null;
      }

      const response = await fetch('/api/admin/spots/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spotIds: selectedIds,
          updates
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message);
        onOpenChange(false);
        onSuccess(); // 테이블 새로고침
        resetForm();
      } else {
        alert(`오류: ${data.error}`);
      }
    } catch (error) {
      console.error('[BulkEdit] Error:', error);
      alert('일괄 수정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUpdateHighlight(false);
    setHighlightValue(true);
    setUpdateCategories(false);
    setCategoryAction('add');
    setSelectedCategories([]);
    setUpdateDescription(false);
    setDescription('');
    setUpdatePhone(false);
    setPhone('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>일괄 수정</DialogTitle>
          <DialogDescription>
            선택한 {selectedCount}개 장소를 한 번에 수정합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 하이라이트 설정 */}
          <div className="flex items-start space-x-3">
            <Checkbox
              id="update-highlight"
              checked={updateHighlight}
              onCheckedChange={(checked) => setUpdateHighlight(checked as boolean)}
            />
            <div className="flex-1 space-y-2">
              <Label htmlFor="update-highlight" className="font-medium">
                하이라이트 설정
              </Label>
              {updateHighlight && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={highlightValue ? 'default' : 'outline'}
                    onClick={() => setHighlightValue(true)}
                  >
                    추천 설정
                  </Button>
                  <Button
                    size="sm"
                    variant={!highlightValue ? 'default' : 'outline'}
                    onClick={() => setHighlightValue(false)}
                  >
                    추천 해제
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* 카테고리 수정 */}
          <div className="flex items-start space-x-3">
            <Checkbox
              id="update-categories"
              checked={updateCategories}
              onCheckedChange={(checked) => setUpdateCategories(checked as boolean)}
            />
            <div className="flex-1 space-y-2">
              <Label htmlFor="update-categories" className="font-medium">
                카테고리 수정
              </Label>
              {updateCategories && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={categoryAction === 'add' ? 'default' : 'outline'}
                      onClick={() => setCategoryAction('add')}
                    >
                      추가
                    </Button>
                    <Button
                      size="sm"
                      variant={categoryAction === 'remove' ? 'default' : 'outline'}
                      onClick={() => setCategoryAction('remove')}
                    >
                      제거
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                      <Badge
                        key={cat}
                        variant={selectedCategories.includes(cat) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => handleToggleCategory(cat)}
                      >
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 설명 입력 */}
          <div className="flex items-start space-x-3">
            <Checkbox
              id="update-description"
              checked={updateDescription}
              onCheckedChange={(checked) => setUpdateDescription(checked as boolean)}
            />
            <div className="flex-1 space-y-2">
              <Label htmlFor="update-description" className="font-medium">
                설명 입력
              </Label>
              {updateDescription && (
                <Textarea
                  placeholder="장소 설명을 입력하세요"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              )}
            </div>
          </div>

          {/* 전화번호 입력 */}
          <div className="flex items-start space-x-3">
            <Checkbox
              id="update-phone"
              checked={updatePhone}
              onCheckedChange={(checked) => setUpdatePhone(checked as boolean)}
            />
            <div className="flex-1 space-y-2">
              <Label htmlFor="update-phone" className="font-medium">
                전화번호 입력
              </Label>
              {updatePhone && (
                <Input
                  placeholder="02-1234-5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                수정 중...
              </>
            ) : (
              '적용'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
