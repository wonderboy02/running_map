'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Search, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { CATEGORIES } from '@/types';
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
  const [manualCoords, setManualCoords] = useState(false);
  const [addressQuery, setAddressQuery] = useState(spot?.address ?? '');
  const [showResults, setShowResults] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

    if (isEdit && spot) {
      const { error } = await supabase.from('spots').update(form).eq('id', spot.id);

      if (error) {
        toast.error('수정에 실패했습니다: ' + error.message);
        setSaving(false);
        return;
      }
      toast.success('장소가 수정되었습니다.');
    } else {
      const { error } = await supabase.from('spots').insert(form);

      if (error) {
        toast.error('추가에 실패했습니다: ' + error.message);
        setSaving(false);
        return;
      }
      toast.success('장소가 추가되었습니다.');
    }

    router.push('/admin');
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
                <MapPin className={`mt-0.5 h-4 w-4 flex-shrink-0 ${result.source === 'place' ? 'text-highlight-dark' : 'text-primary'}`} />
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
                  isActive ? 'bg-primary text-white hover:bg-primary-dark' : ''
                }`}
                onClick={() => toggleCategory(cat)}
              >
                {cat}
              </Badge>
            );
          })}
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

      {/* 하이라이트 */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="highlight"
          checked={form.is_highlighted}
          onCheckedChange={(checked) => updateField('is_highlighted', !!checked)}
        />
        <Label htmlFor="highlight" className="cursor-pointer font-normal">
          추천 장소로 하이라이트
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
