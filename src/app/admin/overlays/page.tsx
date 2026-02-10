'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Loader2, Plus, Pencil, Trash2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useGeocode, type GeocodeResult } from '@/hooks/useGeocode';
import type { Overlay } from '@/types';

interface OverlayForm {
  name: string;
  nw_lat: number;
  nw_lng: number;
  se_lat: number;
  se_lng: number;
  opacity: number;
  is_active: boolean;
  image: File | null;
}

const EMPTY_FORM: OverlayForm = {
  name: '',
  nw_lat: 0,
  nw_lng: 0,
  se_lat: 0,
  se_lng: 0,
  opacity: 1.0,
  is_active: true,
  image: null,
};

function CoordSearchInput({
  label,
  lat,
  lng,
  onCoordsChange,
}: {
  label: string;
  lat: number;
  lng: number;
  onCoordsChange: (lat: number, lng: number) => void;
}) {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [manualCoords, setManualCoords] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { results, loading, search, clear } = useGeocode();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleInput(value: string) {
    setQuery(value);
    search(value);
    setShowResults(true);
  }

  function handleSelect(result: GeocodeResult) {
    const address = result.placeName || result.roadAddress || result.jibunAddress;
    setQuery(address);
    onCoordsChange(result.latitude, result.longitude);
    setShowResults(false);
    clear();
    toast.success(`"${address}" 좌표가 입력되었습니다.`);
  }

  return (
    <div className="space-y-2">
      <Label className="font-medium">{label}</Label>

      {/* 장소 검색 */}
      <div className="relative" ref={dropdownRef}>
        <Search className="text-text-secondary pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder="장소명 또는 주소 검색"
          className="pl-9"
        />
        {loading && (
          <Loader2 className="text-text-secondary absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin" />
        )}

        {showResults && results.length > 0 && (
          <div className="border-border bg-surface absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border shadow-lg">
            {results.map((result, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(result)}
                className="hover:bg-surface-dim flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors"
              >
                <MapPin className={`mt-0.5 h-4 w-4 flex-shrink-0 ${result.source === 'place' ? 'text-highlight-dark' : 'text-primary'}`} />
                <div className="min-w-0 flex-1">
                  {result.placeName ? (
                    <>
                      <p className="text-text truncate font-medium">{result.placeName}</p>
                      <p className="text-text-secondary truncate text-xs">{result.roadAddress}</p>
                    </>
                  ) : (
                    <p className="text-text truncate font-medium">{result.roadAddress}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 직접 입력 토글 */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id={`manual-${label}`}
          checked={manualCoords}
          onCheckedChange={(checked) => setManualCoords(!!checked)}
        />
        <Label htmlFor={`manual-${label}`} className="cursor-pointer text-xs font-normal">
          좌표 직접 입력
        </Label>
      </div>

      {/* 위도/경도 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">위도</Label>
          <Input
            type="number"
            step="any"
            value={lat || ''}
            onChange={(e) => onCoordsChange(Number(e.target.value), lng)}
            readOnly={!manualCoords}
            className={!manualCoords ? 'bg-surface-dim' : ''}
            placeholder="37.xxxx"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">경도</Label>
          <Input
            type="number"
            step="any"
            value={lng || ''}
            onChange={(e) => onCoordsChange(lat, Number(e.target.value))}
            readOnly={!manualCoords}
            className={!manualCoords ? 'bg-surface-dim' : ''}
            placeholder="126.xxxx"
          />
        </div>
      </div>
    </div>
  );
}

export default function AdminOverlaysPage() {
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOverlay, setEditingOverlay] = useState<Overlay | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Overlay | null>(null);
  const [form, setForm] = useState<OverlayForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  async function fetchOverlays() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/overlays');
      const data = await res.json();
      if (data.success) {
        setOverlays(data.data);
      } else {
        toast.error('오버레이 목록을 불러오는데 실패했습니다.');
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.');
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchOverlays();
  }, []);

  function openCreateDialog() {
    setEditingOverlay(null);
    setForm(EMPTY_FORM);
    setImagePreview(null);
    setDialogOpen(true);
  }

  function openEditDialog(overlay: Overlay) {
    setEditingOverlay(overlay);
    setForm({
      name: overlay.name,
      nw_lat: overlay.nw_lat,
      nw_lng: overlay.nw_lng,
      se_lat: overlay.se_lat,
      se_lng: overlay.se_lng,
      opacity: overlay.opacity,
      is_active: overlay.is_active,
      image: null,
    });
    setImagePreview(overlay.image_url);
    setDialogOpen(true);
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setForm((prev) => ({ ...prev, image: file }));
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    if (!form.name) {
      toast.error('이름을 입력해주세요.');
      setSaving(false);
      return;
    }

    if (!editingOverlay && !form.image) {
      toast.error('이미지를 선택해주세요.');
      setSaving(false);
      return;
    }

    if (!form.nw_lat || !form.nw_lng || !form.se_lat || !form.se_lng) {
      toast.error('좌표를 모두 입력해주세요.');
      setSaving(false);
      return;
    }

    const formData = new FormData();
    formData.append('name', form.name);
    formData.append('nw_lat', String(form.nw_lat));
    formData.append('nw_lng', String(form.nw_lng));
    formData.append('se_lat', String(form.se_lat));
    formData.append('se_lng', String(form.se_lng));
    formData.append('opacity', String(form.opacity));
    formData.append('is_active', String(form.is_active));
    if (form.image) {
      formData.append('image', form.image);
    }

    try {
      if (editingOverlay) {
        formData.append('id', editingOverlay.id);
        const res = await fetch('/api/admin/overlays', {
          method: 'PATCH',
          body: formData,
        });
        const data = await res.json();
        if (data.success) {
          toast.success('오버레이가 수정되었습니다.');
          setDialogOpen(false);
          fetchOverlays();
        } else {
          toast.error(data.error || '수정에 실패했습니다.');
        }
      } else {
        const res = await fetch('/api/admin/overlays', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data.success) {
          toast.success('오버레이가 추가되었습니다.');
          setDialogOpen(false);
          fetchOverlays();
        } else {
          toast.error(data.error || '추가에 실패했습니다.');
        }
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.');
    }
    setSaving(false);
  }

  async function handleToggleActive(overlay: Overlay) {
    const formData = new FormData();
    formData.append('id', overlay.id);
    formData.append('toggle_active', String(!overlay.is_active));

    try {
      const res = await fetch('/api/admin/overlays', {
        method: 'PATCH',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          `"${overlay.name}" ${!overlay.is_active ? '활성화' : '비활성화'}됨`,
        );
        fetchOverlays();
      } else {
        toast.error(data.error || '변경에 실패했습니다.');
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    try {
      const res = await fetch('/api/admin/overlays', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('오버레이가 삭제되었습니다.');
        fetchOverlays();
      } else {
        toast.error(data.error || '삭제에 실패했습니다.');
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.');
    }
    setDeleteTarget(null);
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">오버레이 관리</h1>
        <Button size="sm" onClick={openCreateDialog}>
          <Plus className="mr-1 h-4 w-4" />
          추가
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : overlays.length === 0 ? (
        <div className="text-text-secondary py-12 text-center text-sm">
          등록된 오버레이가 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {overlays.map((overlay) => (
            <div
              key={overlay.id}
              className="border-border bg-surface flex items-start gap-3 rounded-lg border p-3"
            >
              {/* 썸네일 */}
              <div className="bg-surface-dim flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-md">
                {overlay.image_url ? (
                  <img
                    src={overlay.image_url}
                    alt={overlay.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageIcon className="text-text-secondary h-6 w-6" />
                )}
              </div>

              {/* 정보 */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium">{overlay.name}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      overlay.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {overlay.is_active ? '활성' : '비활성'}
                  </span>
                </div>
                <p className="text-text-secondary mt-0.5 text-xs">
                  NW({overlay.nw_lat.toFixed(4)}, {overlay.nw_lng.toFixed(4)}) →
                  SE({overlay.se_lat.toFixed(4)}, {overlay.se_lng.toFixed(4)})
                  &nbsp;· 투명도 {Math.round(overlay.opacity * 100)}%
                </p>
              </div>

              {/* 액션 */}
              <div className="flex flex-shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleActive(overlay)}
                  className="h-8 px-2 text-xs"
                >
                  {overlay.is_active ? '끄기' : '켜기'}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEditDialog(overlay)}
                  className="h-8 w-8"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteTarget(overlay)}
                  className="h-8 w-8 text-red-500 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 추가/수정 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingOverlay ? '오버레이 수정' : '오버레이 추가'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 이름 */}
            <div className="space-y-1.5">
              <Label>이름 *</Label>
              <Input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="예: 여의도 코스"
                required
              />
            </div>

            {/* 이미지 업로드 */}
            <div className="space-y-1.5">
              <Label>{editingOverlay ? '이미지 (변경 시 선택)' : '이미지 *'}</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
              {imagePreview && (
                <div className="bg-surface-dim mt-2 overflow-hidden rounded-md">
                  <img
                    src={imagePreview}
                    alt="미리보기"
                    className="max-h-40 w-full object-contain"
                  />
                </div>
              )}
            </div>

            {/* 왼쪽 위 좌표 */}
            <CoordSearchInput
              label="왼쪽 위 (NW) 좌표"
              lat={form.nw_lat}
              lng={form.nw_lng}
              onCoordsChange={(lat, lng) =>
                setForm((prev) => ({ ...prev, nw_lat: lat, nw_lng: lng }))
              }
            />

            {/* 오른쪽 아래 좌표 */}
            <CoordSearchInput
              label="오른쪽 아래 (SE) 좌표"
              lat={form.se_lat}
              lng={form.se_lng}
              onCoordsChange={(lat, lng) =>
                setForm((prev) => ({ ...prev, se_lat: lat, se_lng: lng }))
              }
            />

            {/* 투명도 */}
            <div className="space-y-1.5">
              <Label>투명도 ({Math.round(form.opacity * 100)}%)</Label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={form.opacity}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, opacity: parseFloat(e.target.value) }))
                }
                className="w-full accent-primary"
              />
              <div className="text-text-secondary flex justify-between text-xs">
                <span>0% (투명)</span>
                <span>100% (불투명)</span>
              </div>
            </div>

            {/* 활성화 */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="overlay-active"
                checked={form.is_active}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, is_active: !!checked }))
                }
              />
              <Label htmlFor="overlay-active" className="cursor-pointer font-normal">
                활성화
              </Label>
            </div>

            {/* 버튼 */}
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setDialogOpen(false)}
              >
                취소
              </Button>
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? '저장 중...' : editingOverlay ? '수정' : '추가'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>오버레이 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteTarget?.name}&quot;을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Supabase Storage 안내 */}
      {overlays.length === 0 && !loading && (
        <div className="border-border mt-6 rounded-lg border border-dashed p-4">
          <p className="text-text-secondary text-xs">
            <strong>Setup:</strong> Supabase Dashboard에서 &quot;overlays&quot; Storage 버킷을
            생성하세요 (Public 접근 허용).
          </p>
        </div>
      )}
    </div>
  );
}
