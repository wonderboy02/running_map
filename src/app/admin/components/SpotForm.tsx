'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Search, Loader2, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { CATEGORIES, FEATURES, WEEKDAYS, WEEKDAY_LABELS } from '@/types';
import type { Spot, SpotInsert } from '@/types';
import { useGeocode, type GeocodeResult } from '@/hooks/useGeocode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface SpotFormProps {
  spot?: Spot;
}

const EMPTY_FORM: SpotInsert = {
  name: '',
  address: '',
  latitude: 37.5665,
  longitude: 126.978,
  categories: [],
  features: [],
  is_highlighted: false,
  operating_hours: null,
  description: null,
  phone: null,
  photos: [],
  extra_data: {},
};

export default function SpotForm({ spot }: SpotFormProps) {
  const router = useRouter();
  const isEdit = !!spot;

  const [form, setForm] = useState<SpotInsert>(() =>
    spot
      ? {
          name: spot.name,
          address: spot.address,
          latitude: spot.latitude,
          longitude: spot.longitude,
          categories: spot.categories,
          features: spot.features ?? [],
          is_highlighted: spot.is_highlighted,
          operating_hours: spot.operating_hours,
          description: spot.description,
          phone: spot.phone,
          photos: spot.photos,
          extra_data: spot.extra_data,
        }
      : EMPTY_FORM
  );

  const [saving, setSaving] = useState(false);
  const [customFeatureInput, setCustomFeatureInput] = useState('');
  const [manualCoords, setManualCoords] = useState(false);
  const [addressQuery, setAddressQuery] = useState(spot?.address ?? '');
  const [showResults, setShowResults] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 사진 관련 상태
  const [pendingPhotos, setPendingPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>(spot?.photos ?? []);
  const [removedPhotos, setRemovedPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const pendingPhotosRef = useRef(pendingPhotos);
  pendingPhotosRef.current = pendingPhotos;

  const MAX_PHOTOS = 5;
  const totalPhotos = existingPhotos.length + pendingPhotos.length;

  const { results, loading: geocodeLoading, search, clear } = useGeocode();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function updateField<K extends keyof SpotInsert>(key: K, value: SpotInsert[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleCategory(cat: string) {
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }));
  }

  function toggleFeature(feat: string) {
    setForm((prev) => ({
      ...prev,
      features: prev.features.includes(feat)
        ? prev.features.filter((f) => f !== feat)
        : [...prev.features, feat],
    }));
  }

  const customFeatures = useMemo(() => {
    const predefined = new Set<string>(FEATURES);
    return form.features.filter((f) => !predefined.has(f));
  }, [form.features]);

  function addCustomFeature() {
    const value = customFeatureInput.trim();
    if (!value || form.features.includes(value)) {
      setCustomFeatureInput('');
      return;
    }
    setForm((prev) => ({ ...prev, features: [...prev.features, value] }));
    setCustomFeatureInput('');
  }

  function updateOperatingHours(day: string, value: string) {
    setForm((prev) => {
      const hours = { ...(prev.operating_hours ?? {}) };
      if (value) {
        hours[day] = value;
      } else {
        delete hours[day];
      }
      return { ...prev, operating_hours: Object.keys(hours).length > 0 ? hours : null };
    });
  }

  // 사진 핸들러
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      const remaining = MAX_PHOTOS - totalPhotos;
      if (remaining <= 0) return;

      const selected = files.slice(0, remaining);
      const newPending = selected.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));
      setPendingPhotos((prev) => [...prev, ...newPending]);

      // input value 초기화 (같은 파일 재선택 허용)
      e.target.value = '';
    },
    [totalPhotos],
  );

  function removeExistingPhoto(index: number) {
    const url = existingPhotos[index];
    setRemovedPhotos((prev) => [...prev, url]);
    setExistingPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function removePendingPhoto(index: number) {
    setPendingPhotos((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  function moveExistingPhoto(index: number, dir: -1 | 1) {
    setExistingPhotos((prev) => {
      const arr = [...prev];
      const target = index + dir;
      if (target < 0 || target >= arr.length) return prev;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr;
    });
  }

  function movePendingPhoto(index: number, dir: -1 | 1) {
    setPendingPhotos((prev) => {
      const arr = [...prev];
      const realIndex = index;
      const target = realIndex + dir;
      if (target < 0 || target >= arr.length) return prev;
      [arr[realIndex], arr[target]] = [arr[target], arr[realIndex]];
      return arr;
    });
  }

  // 메모리 누수 방지: 언마운트 시 ObjectURL 해제
  useEffect(() => {
    return () => {
      pendingPhotosRef.current.forEach((p) => URL.revokeObjectURL(p.preview));
    };
  }, []);

  function handleAddressInput(value: string) {
    setAddressQuery(value);
    updateField('address', value);
    search(value);
    setShowResults(true);
  }

  function handleSelectAddress(result: GeocodeResult) {
    const address = result.roadAddress || result.jibunAddress;
    setAddressQuery(address);
    updateField('address', address);
    updateField('latitude', result.latitude);
    updateField('longitude', result.longitude);

    // 장소 검색 결과에서 이름이 있고, 현재 이름이 비어있으면 자동 입력
    if (result.placeName && !form.name) {
      updateField('name', result.placeName);
    }
    // 장소 검색 결과에서 전화번호가 있고, 현재 비어있으면 자동 입력
    if (result.phone && !form.phone) {
      updateField('phone', result.phone);
    }

    setShowResults(false);
    clear();
    toast.success(result.placeName ? `"${result.placeName}" 선택됨` : '주소가 선택되었습니다.');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    if (form.categories.length === 0) {
      toast.error('카테고리를 하나 이상 선택하세요.');
      setSaving(false);
      return;
    }

    try {
      // 1. 대기 중 사진 업로드
      let newUrls: string[] = [];
      if (pendingPhotos.length > 0) {
        setUploading(true);
        const formData = new FormData();
        pendingPhotos.forEach((p) => formData.append('images', p.file));

        const res = await fetch('/api/admin/spot-photos', {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          toast.error(`사진 업로드 실패 (HTTP ${res.status})`);
          setSaving(false);
          setUploading(false);
          return;
        }
        const result = await res.json();

        if (!result.success) {
          toast.error('사진 업로드 실패: ' + result.error);
          setSaving(false);
          setUploading(false);
          return;
        }
        newUrls = result.urls;
        setUploading(false);
      }

      // 2. 삭제된 사진 Storage 정리
      if (removedPhotos.length > 0) {
        try {
          const deleteRes = await fetch('/api/admin/spot-photos', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urls: removedPhotos }),
          });
          if (!deleteRes.ok) {
            console.error('사진 파일 정리 실패:', deleteRes.status);
            toast.warning('일부 사진 파일 정리에 실패했습니다.');
          }
        } catch (err) {
          console.error('사진 파일 정리 중 오류:', err);
          toast.warning('사진 파일 정리 중 오류가 발생했습니다.');
        }
      }

      // 3. 최종 photos 배열 조합
      const finalPhotos = [...existingPhotos, ...newUrls];
      const submitData = { ...form, photos: finalPhotos };

      if (isEdit && spot) {
        const { error } = await supabase.from('spots').update(submitData).eq('id', spot.id);
        if (error) {
          toast.error('수정에 실패했습니다: ' + error.message);
          setSaving(false);
          return;
        }
        toast.success('장소가 수정되었습니다.');
      } else {
        const { error } = await supabase.from('spots').insert(submitData);
        if (error) {
          toast.error('추가에 실패했습니다: ' + error.message);
          setSaving(false);
          return;
        }
        toast.success('장소가 추가되었습니다.');
      }

      router.push('/admin');
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('저장 중 오류가 발생했습니다.');
      setSaving(false);
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      {/* 장소명 */}
      <div className="space-y-1.5">
        <Label>장소명 *</Label>
        <Input
          type="text"
          value={form.name}
          onChange={(e) => updateField('name', e.target.value)}
          required
          placeholder="예: 러닝스테이션 강남"
        />
      </div>

      {/* 주소 검색 */}
      <div className="space-y-1.5" ref={dropdownRef}>
        <Label>주소 *</Label>
        <div className="relative">
          <Search className="text-text-secondary pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            type="text"
            value={addressQuery}
            onChange={(e) => handleAddressInput(e.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
            required
            placeholder="주소를 입력하면 자동 검색됩니다"
            className="pl-9"
          />
          {geocodeLoading && (
            <Loader2 className="text-text-secondary absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin" />
          )}
        </div>

        {/* 검색 결과 드롭다운 */}
        {showResults && results.length > 0 && (
          <div className="border-border bg-surface absolute z-50 mt-1 max-h-60 w-[calc(100%-2rem)] overflow-y-auto rounded-lg border shadow-lg">
            {results.map((result, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelectAddress(result)}
                className="hover:bg-surface-dim flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm transition-colors"
              >
                <MapPin className={`mt-0.5 h-4 w-4 flex-shrink-0 ${result.source === 'place' ? 'text-highlight-foreground' : 'text-primary'}`} />
                <div className="min-w-0 flex-1">
                  {result.placeName ? (
                    <>
                      <p className="text-text truncate font-medium">{result.placeName}</p>
                      <p className="text-text-secondary truncate text-xs">{result.roadAddress}</p>
                      {result.category && (
                        <p className="text-text-secondary truncate text-xs">{result.category}</p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-text truncate font-medium">{result.roadAddress}</p>
                      {result.jibunAddress && result.jibunAddress !== result.roadAddress && (
                        <p className="text-text-secondary truncate text-xs">{result.jibunAddress}</p>
                      )}
                    </>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {showResults && !geocodeLoading && addressQuery.length >= 2 && results.length === 0 && (
          <p className="text-text-secondary px-1 text-xs">검색 결과가 없습니다.</p>
        )}
      </div>

      {/* 좌표 */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="manual-coords"
            checked={manualCoords}
            onCheckedChange={(checked) => setManualCoords(!!checked)}
          />
          <Label htmlFor="manual-coords" className="cursor-pointer text-xs font-normal">
            좌표 직접 입력
          </Label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">위도 *</Label>
            <Input
              type="number"
              step="any"
              value={form.latitude}
              onChange={(e) => updateField('latitude', Number(e.target.value))}
              required
              readOnly={!manualCoords}
              className={!manualCoords ? 'bg-surface-dim' : ''}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">경도 *</Label>
            <Input
              type="number"
              step="any"
              value={form.longitude}
              onChange={(e) => updateField('longitude', Number(e.target.value))}
              required
              readOnly={!manualCoords}
              className={!manualCoords ? 'bg-surface-dim' : ''}
            />
          </div>
        </div>
      </div>

      {/* 카테고리 */}
      <div className="space-y-1.5">
        <Label>카테고리 *</Label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const isActive = form.categories.includes(cat);
            return (
              <Badge
                key={cat}
                variant={isActive ? 'default' : 'outline'}
                className={`cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary text-white hover:bg-primary-hover' : ''
                }`}
                onClick={() => toggleCategory(cat)}
              >
                {cat}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* 제공 시설 */}
      <div className="space-y-1.5">
        <Label>제공 시설</Label>
        <div className="grid grid-cols-2 gap-2">
          {FEATURES.map((feat) => (
            <div key={feat} className="flex items-center space-x-2">
              <Checkbox
                id={`feature-${feat}`}
                checked={form.features.includes(feat)}
                onCheckedChange={() => toggleFeature(feat)}
              />
              <Label htmlFor={`feature-${feat}`} className="text-sm font-normal cursor-pointer">
                {feat}
              </Label>
            </div>
          ))}
        </div>

        {/* 커스텀 시설 */}
        {customFeatures.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {customFeatures.map((feat) => (
              <Badge
                key={feat}
                variant="outline"
                className="gap-1 pl-2.5 pr-1.5 py-1 text-sm"
              >
                {feat}
                <button
                  type="button"
                  onClick={() => toggleFeature(feat)}
                  className="rounded-full p-0.5 hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <Input
            type="text"
            value={customFeatureInput}
            onChange={(e) => setCustomFeatureInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustomFeature();
              }
            }}
            placeholder="직접 입력 (예: 수건, 음수대)"
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCustomFeature}
            className="shrink-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 설명 */}
      <div className="space-y-1.5">
        <Label>설명</Label>
        <Textarea
          value={form.description ?? ''}
          onChange={(e) => updateField('description', e.target.value || null)}
          rows={3}
          placeholder="장소에 대한 간단한 설명"
        />
      </div>

      {/* 사진 */}
      <div className="space-y-1.5">
        <Label>
          사진 ({totalPhotos}/{MAX_PHOTOS})
        </Label>
        <div className="grid grid-cols-4 gap-2">
          {/* 기존 사진 */}
          {existingPhotos.map((url, i) => (
            <div
              key={`existing-${i}`}
              className="group relative aspect-square overflow-hidden rounded-lg border bg-gray-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`사진 ${i + 1}`} className="h-full w-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center gap-0.5 bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => moveExistingPhoto(i, -1)}
                    className="rounded-full bg-white/90 p-1 shadow-sm"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                )}
                {i < existingPhotos.length - 1 && (
                  <button
                    type="button"
                    onClick={() => moveExistingPhoto(i, 1)}
                    className="rounded-full bg-white/90 p-1 shadow-sm"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeExistingPhoto(i)}
                className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white shadow-sm"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {/* 대기 중 사진 */}
          {pendingPhotos.map((p, i) => (
            <div
              key={`pending-${i}`}
              className="group relative aspect-square overflow-hidden rounded-lg border border-dashed border-blue-300 bg-blue-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.preview} alt={`새 사진 ${i + 1}`} className="h-full w-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center gap-0.5 bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => movePendingPhoto(i, -1)}
                    className="rounded-full bg-white/90 p-1 shadow-sm"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                )}
                {i < pendingPhotos.length - 1 && (
                  <button
                    type="button"
                    onClick={() => movePendingPhoto(i, 1)}
                    className="rounded-full bg-white/90 p-1 shadow-sm"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => removePendingPhoto(i)}
                className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white shadow-sm"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-blue-500/80 py-0.5 text-center text-[10px] font-medium text-white">
                대기중
              </div>
            </div>
          ))}

          {/* 추가 버튼 */}
          {totalPhotos < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 transition-colors hover:border-gray-400 hover:bg-gray-100 hover:text-gray-500"
            >
              <Plus className="h-5 w-5" />
              <span className="text-[10px] font-medium">추가</span>
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        {uploading && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            사진 업로드 중...
          </div>
        )}
      </div>

      {/* 전화번호 */}
      <div className="space-y-1.5">
        <Label>전화번호</Label>
        <Input
          type="tel"
          value={form.phone ?? ''}
          onChange={(e) => updateField('phone', e.target.value || null)}
          placeholder="02-1234-5678"
        />
      </div>

      {/* 운영시간 */}
      <div className="space-y-1.5">
        <Label>운영시간</Label>
        <div className="space-y-2">
          {WEEKDAYS.map((day) => (
            <div key={day} className="flex items-center gap-2">
              <span className="w-6 text-sm text-muted-foreground">
                {WEEKDAY_LABELS[day]}
              </span>
              <Input
                type="text"
                value={form.operating_hours?.[day] ?? ''}
                onChange={(e) => updateOperatingHours(day, e.target.value)}
                placeholder="09:00 - 21:00"
              />
            </div>
          ))}
        </div>
      </div>

      {/* 인기 장소 */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="highlight"
          checked={form.is_highlighted}
          onCheckedChange={(checked) => updateField('is_highlighted', !!checked)}
        />
        <Label htmlFor="highlight" className="cursor-pointer font-normal">
          인기 장소로 등록 (검색 화면에 노출)
        </Label>
      </div>

      {/* 제출 */}
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>
          취소
        </Button>
        <Button type="submit" disabled={saving} className="flex-1">
          {saving ? '저장 중...' : isEdit ? '수정' : '추가'}
        </Button>
      </div>
    </form>
  );
}
