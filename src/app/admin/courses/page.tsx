'use client';

import { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Search,
  Loader2,
  Plus,
  Minus,
  Pencil,
  Trash2,
  Image as ImageIcon,
  Upload,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import type { Course } from '@/types';

interface CourseForm {
  name: string;
  description: string;
  difficulty: number | '';
  distance_km: number | '';
  nw_lat: number;
  nw_lng: number;
  se_lat: number;
  se_lng: number;
  pinpoints: Array<{ lat: number; lng: number }>;
  opacity: number;
  is_active: boolean;
  image: File | null;
  highlight_image: File | null;
}

const EMPTY_FORM: CourseForm = {
  name: '',
  description: '',
  difficulty: '',
  distance_km: '',
  nw_lat: 0,
  nw_lng: 0,
  se_lat: 0,
  se_lng: 0,
  pinpoints: [],
  opacity: 1.0,
  is_active: true,
  image: null,
  highlight_image: null,
};

// --- Bulk Upload ---

interface BulkItem {
  file: File;
  highlightFile: File | null;
  name: string;
  nwPlace: string;
  sePlace: string;
  nwLat: number;
  nwLng: number;
  seLat: number;
  seLng: number;
  nwResultName: string;
  seResultName: string;
  nwWarning: boolean;
  seWarning: boolean;
  status: 'geocoding' | 'ready' | 'error';
  error?: string;
}

function ImageMeta({ url }: { url: string }) {
  const [meta, setMeta] = useState<{
    size: string;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    if (!url) return;

    let cancelled = false;

    async function load() {
      try {
        // fetch → blob으로 파일 크기 + object URL로 해상도 측정
        // (썸네일 <img>가 이미 캐시해둔 이미지를 재활용)
        const res = await fetch(url);
        const blob = await res.blob();
        if (cancelled) return;

        const sizeBytes = blob.size;
        const objectUrl = URL.createObjectURL(blob);

        const img = new window.Image();
        img.src = objectUrl;
        const dims = await new Promise<{ w: number; h: number }>((resolve) => {
          img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
          img.onerror = () => resolve({ w: 0, h: 0 });
        });
        URL.revokeObjectURL(objectUrl);
        if (cancelled) return;

        const sizeStr =
          sizeBytes >= 1024 * 1024
            ? `${(sizeBytes / (1024 * 1024)).toFixed(1)}MB`
            : sizeBytes > 0
              ? `${Math.round(sizeBytes / 1024)}KB`
              : '';

        setMeta({ size: sizeStr, width: dims.w, height: dims.h });
      } catch {
        /* ignore */
      }
    }

    load();
    return () => { cancelled = true; };
  }, [url]);

  if (!meta) return null;

  return (
    <span className="text-text-muted">
      {meta.width > 0 && `${meta.width}×${meta.height}px`}
      {meta.width > 0 && meta.size && ' · '}
      {meta.size}
    </span>
  );
}

function removeSpaces(s: string) {
  return s.replace(/\s/g, '');
}

function parseCourseFilename(filename: string): {
  name: string;
  nwPlace: string;
  sePlace: string;
  isHighlight: boolean;
} | null {
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
  const parts = nameWithoutExt.split('_');
  if (parts.length < 3) return null;

  // _h 접미사 → 하이라이팅 이미지
  const isHighlight = parts[parts.length - 1] === 'h';
  const coreParts = isHighlight ? parts.slice(0, -1) : parts;

  if (coreParts.length < 3) return null;

  // 마지막 두 파트가 SE, NW 장소, 나머지는 이름
  const sePlace = coreParts[coreParts.length - 1];
  const nwPlace = coreParts[coreParts.length - 2];
  const name = coreParts.slice(0, -2).join('_');
  return { name, nwPlace, sePlace, isHighlight };
}

async function geocodePlace(
  query: string,
): Promise<{ lat: number; lng: number; placeName: string } | null> {
  try {
    const res = await fetch(
      `/api/geocode?query=${encodeURIComponent(query.trim())}`,
    );
    const data = await res.json();
    if (data.addresses && data.addresses.length > 0) {
      const first = data.addresses[0];
      return {
        lat: first.latitude,
        lng: first.longitude,
        placeName: first.placeName || first.roadAddress || '',
      };
    }
    return null;
  } catch {
    return null;
  }
}

function BulkUploadDialog({
  open,
  onOpenChange,
  onUploaded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: () => void;
}) {
  const [items, setItems] = useState<BulkItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setItems([]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // 1단계: 기본 이미지 먼저 파싱
    const baseItems = new Map<string, BulkItem>();
    const highlightFiles: { key: string; file: File; filename: string }[] = [];
    const errorItems: BulkItem[] = [];

    for (const file of Array.from(files)) {
      const parsed = parseCourseFilename(file.name);
      if (!parsed) {
        errorItems.push({
          file,
          highlightFile: null,
          name: file.name,
          nwPlace: '',
          sePlace: '',
          nwLat: 0,
          nwLng: 0,
          seLat: 0,
          seLng: 0,
          nwResultName: '',
          seResultName: '',
          nwWarning: false,
          seWarning: false,
          status: 'error',
          error: '파일명 형식 오류 ({이름}_{NW}_{SE}.확장자)',
        });
        continue;
      }

      const key = `${parsed.name}_${parsed.nwPlace}_${parsed.sePlace}`;

      if (parsed.isHighlight) {
        highlightFiles.push({ key, file, filename: file.name });
      } else {
        baseItems.set(key, {
          file,
          highlightFile: null,
          name: parsed.name,
          nwPlace: parsed.nwPlace,
          sePlace: parsed.sePlace,
          nwLat: 0,
          nwLng: 0,
          seLat: 0,
          seLng: 0,
          nwResultName: '',
          seResultName: '',
          nwWarning: false,
          seWarning: false,
          status: 'geocoding',
        });
      }
    }

    // 2단계: 하이라이트 파일을 기본 파일에 매칭
    for (const hl of highlightFiles) {
      const base = baseItems.get(hl.key);
      if (base) {
        base.highlightFile = hl.file;
      } else {
        errorItems.push({
          file: hl.file,
          highlightFile: null,
          name: hl.filename,
          nwPlace: '',
          sePlace: '',
          nwLat: 0,
          nwLng: 0,
          seLat: 0,
          seLng: 0,
          nwResultName: '',
          seResultName: '',
          nwWarning: false,
          seWarning: false,
          status: 'error',
          error: '매칭되는 기본 이미지 없음 (_h 제거한 파일 필요)',
        });
      }
    }

    const newItems = [...baseItems.values(), ...errorItems];
    setItems(newItems);

    // Geocode 비동기 처리
    const updated = [...newItems];
    for (let i = 0; i < updated.length; i++) {
      const item = updated[i];
      if (item.status === 'error') continue;

      const [nwResult, seResult] = await Promise.all([
        geocodePlace(item.nwPlace),
        geocodePlace(item.sePlace),
      ]);

      if (!nwResult || !seResult) {
        updated[i] = {
          ...item,
          status: 'error',
          error: !nwResult && !seResult
            ? 'NW/SE 장소 모두 검색 실패'
            : !nwResult
              ? 'NW 장소 검색 실패'
              : 'SE 장소 검색 실패',
          nwLat: nwResult?.lat ?? 0,
          nwLng: nwResult?.lng ?? 0,
          seLat: seResult?.lat ?? 0,
          seLng: seResult?.lng ?? 0,
          nwResultName: nwResult?.placeName ?? '',
          seResultName: seResult?.placeName ?? '',
          nwWarning: false,
          seWarning: false,
        };
      } else {
        const nwWarning =
          removeSpaces(nwResult.placeName) !== removeSpaces(item.nwPlace);
        const seWarning =
          removeSpaces(seResult.placeName) !== removeSpaces(item.sePlace);

        updated[i] = {
          ...item,
          nwLat: nwResult.lat,
          nwLng: nwResult.lng,
          seLat: seResult.lat,
          seLng: seResult.lng,
          nwResultName: nwResult.placeName,
          seResultName: seResult.placeName,
          nwWarning,
          seWarning,
          status: 'ready',
        };
      }

      setItems([...updated]);
    }
  }

  async function handleBulkUpload() {
    const readyItems = items.filter((item) => item.status === 'ready');
    if (readyItems.length === 0) {
      toast.error('업로드 가능한 항목이 없습니다.');
      return;
    }

    setUploading(true);

    const formData = new FormData();
    const metadata = readyItems.map((item, i) => {
      formData.append(`image_${i}`, item.file);
      if (item.highlightFile) {
        formData.append(`highlight_image_${i}`, item.highlightFile);
      }
      return {
        name: item.name,
        nw_lat: item.nwLat,
        nw_lng: item.nwLng,
        se_lat: item.seLat,
        se_lng: item.seLng,
        opacity: 1.0,
        has_highlight: !!item.highlightFile,
      };
    });
    formData.append('metadata', JSON.stringify(metadata));

    try {
      const res = await fetch('/api/admin/courses/bulk', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        const msg =
          data.errorCount > 0
            ? `${data.successCount}개 성공, ${data.errorCount}개 실패`
            : `${data.successCount}개 업로드 완료`;
        toast.success(msg);

        if (data.errors?.length > 0) {
          data.errors.forEach(
            (err: { name: string; error: string }) =>
              toast.error(`${err.name}: ${err.error}`),
          );
        }

        onOpenChange(false);
        reset();
        onUploaded();
      } else {
        toast.error(data.error || '일괄 업로드에 실패했습니다.');
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.');
    }
    setUploading(false);
  }

  const readyCount = items.filter((i) => i.status === 'ready').length;
  const geocodingCount = items.filter((i) => i.status === 'geocoding').length;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>코스 일괄 추가</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 안내 */}
          <div className="bg-surface-dim rounded-md p-3 text-sm">
            <p className="font-medium">파일명 규칙</p>
            <p className="text-text-secondary mt-1">
              <code className="bg-background rounded px-1 py-0.5 text-xs">
                {'{이름}_{NW장소}_{SE장소}.확장자'}
              </code>
            </p>
            <p className="text-text-secondary mt-1">
              <code className="bg-background rounded px-1 py-0.5 text-xs">
                {'{이름}_{NW장소}_{SE장소}_h.확장자'}
              </code>
              <span className="text-text-muted ml-1">(하이라이팅)</span>
            </p>
            <p className="text-text-secondary mt-2 text-xs">
              예: 여의도코스_여의도공원_63빌딩.png (기본)
            </p>
            <p className="text-text-secondary pl-6 text-xs">
              여의도코스_여의도공원_63빌딩_h.png (하이라이팅)
            </p>
            <p className="text-text-muted mt-1.5 text-xs">
              _h 파일은 동일 이름의 기본 파일과 자동 매칭됩니다. 기본 파일 없이 _h만 업로드할 수 없습니다.
            </p>
          </div>

          {/* 파일 선택 */}
          <div className="space-y-1.5">
            <Label>이미지 파일 선택</Label>
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFilesSelected}
            />
          </div>

          {/* 프리뷰 테이블 */}
          {items.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                프리뷰 ({readyCount}개 준비
                {geocodingCount > 0 && `, ${geocodingCount}개 검색 중`})
              </p>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-border border-b text-left">
                      <th className="pb-1.5 pr-2">이름</th>
                      <th className="pb-1.5 pr-2">NW 장소</th>
                      <th className="pb-1.5 pr-2">SE 장소</th>
                      <th className="pb-1.5 pr-2" title="하이라이팅 이미지">HL</th>
                      <th className="pb-1.5">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i} className="border-border border-b">
                        <td className="py-1.5 pr-2 font-medium">
                          {item.name}
                        </td>
                        <td className="py-1.5 pr-2">
                          {item.status === 'geocoding' ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : item.nwResultName ? (
                            <span className="flex items-center gap-1">
                              {item.nwResultName}
                              {item.nwWarning && (
                                <span
                                  className="inline-flex items-center rounded bg-yellow-100 px-1 py-0.5 text-yellow-700"
                                  title={`입력: ${item.nwPlace}`}
                                >
                                  <AlertTriangle className="h-3 w-3" />
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-text-secondary">
                              {item.nwPlace}
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 pr-2">
                          {item.status === 'geocoding' ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : item.seResultName ? (
                            <span className="flex items-center gap-1">
                              {item.seResultName}
                              {item.seWarning && (
                                <span
                                  className="inline-flex items-center rounded bg-yellow-100 px-1 py-0.5 text-yellow-700"
                                  title={`입력: ${item.sePlace}`}
                                >
                                  <AlertTriangle className="h-3 w-3" />
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-text-secondary">
                              {item.sePlace}
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 pr-2 text-center">
                          {item.highlightFile ? (
                            <span title={item.highlightFile.name}>
                              <ImageIcon className="inline h-3.5 w-3.5 text-amber-500" />
                            </span>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>
                        <td className="py-1.5">
                          {item.status === 'geocoding' && (
                            <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                          )}
                          {item.status === 'ready' && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                          {item.status === 'error' && (
                            <span
                              className="flex items-center gap-1 text-red-500"
                              title={item.error}
                            >
                              <XCircle className="h-4 w-4" />
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 에러 상세 */}
              {items.some((i) => i.status === 'error') && (
                <div className="space-y-1">
                  {items
                    .filter((i) => i.status === 'error')
                    .map((item, i) => (
                      <p key={i} className="text-xs text-red-500">
                        {item.name}: {item.error}
                      </p>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                onOpenChange(false);
                reset();
              }}
            >
              취소
            </Button>
            <Button
              onClick={handleBulkUpload}
              disabled={uploading || readyCount === 0 || geocodingCount > 0}
              className="flex-1"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  업로드 중...
                </>
              ) : (
                <>
                  <Upload className="mr-1 h-4 w-4" />
                  일괄 업로드 ({readyCount}개)
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
                <MapPin className={`mt-0.5 h-4 w-4 flex-shrink-0 ${result.source === 'place' ? 'text-highlight-foreground' : 'text-primary'}`} />
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

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [form, setForm] = useState<CourseForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [highlightPreview, setHighlightPreview] = useState<string | null>(null);
  const [removeHighlight, setRemoveHighlight] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  async function fetchCourses() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/courses');
      const data = await res.json();
      if (data.success) {
        setCourses(data.data);
      } else {
        toast.error('코스 목록을 불러오는데 실패했습니다.');
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.');
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchCourses();
  }, []);

  function openCreateDialog() {
    setEditingCourse(null);
    setForm(EMPTY_FORM);
    setImagePreview(null);
    setHighlightPreview(null);
    setRemoveHighlight(false);
    setDialogOpen(true);
  }

  function openEditDialog(course: Course) {
    setEditingCourse(course);
    setForm({
      name: course.name,
      description: course.description || '',
      difficulty: course.difficulty ?? '',
      distance_km: course.distance_km ?? '',
      nw_lat: course.nw_lat,
      nw_lng: course.nw_lng,
      se_lat: course.se_lat,
      se_lng: course.se_lng,
      pinpoints: course.pinpoints ?? [],
      opacity: course.opacity,
      is_active: course.is_active,
      image: null,
      highlight_image: null,
    });
    setImagePreview(course.image_url);
    setHighlightPreview(course.highlight_image_url);
    setRemoveHighlight(false);
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

  function handleHighlightImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setForm((prev) => ({ ...prev, highlight_image: file }));
      const reader = new FileReader();
      reader.onloadend = () => setHighlightPreview(reader.result as string);
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

    if (!editingCourse && !form.image) {
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
    if (form.description) formData.append('description', form.description);
    if (form.difficulty !== '') formData.append('difficulty', String(form.difficulty));
    if (form.distance_km !== '') formData.append('distance_km', String(form.distance_km));
    formData.append('pinpoints', JSON.stringify(form.pinpoints));
    if (form.image) {
      formData.append('image', form.image);
    }
    if (form.highlight_image) {
      formData.append('highlight_image', form.highlight_image);
    }
    if (removeHighlight) {
      formData.append('remove_highlight_image', 'true');
    }

    try {
      if (editingCourse) {
        formData.append('id', editingCourse.id);
        const res = await fetch('/api/admin/courses', {
          method: 'PATCH',
          body: formData,
        });
        const data = await res.json();
        if (data.success) {
          toast.success('코스가 수정되었습니다.');
          setDialogOpen(false);
          fetchCourses();
        } else {
          toast.error(data.error || '수정에 실패했습니다.');
        }
      } else {
        const res = await fetch('/api/admin/courses', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data.success) {
          toast.success('코스가 추가되었습니다.');
          setDialogOpen(false);
          fetchCourses();
        } else {
          toast.error(data.error || '추가에 실패했습니다.');
        }
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.');
    }
    setSaving(false);
  }

  async function handleToggleActive(course: Course) {
    const formData = new FormData();
    formData.append('id', course.id);
    formData.append('toggle_active', String(!course.is_active));

    try {
      const res = await fetch('/api/admin/courses', {
        method: 'PATCH',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          `"${course.name}" ${!course.is_active ? '활성화' : '비활성화'}됨`,
        );
        fetchCourses();
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
      const res = await fetch('/api/admin/courses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('코스가 삭제되었습니다.');
        fetchCourses();
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
        <h1 className="text-lg font-bold">코스 관리</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setBulkDialogOpen(true)}>
            <Upload className="mr-1 h-4 w-4" />
            일괄 추가
          </Button>
          <Button size="sm" onClick={openCreateDialog}>
            <Plus className="mr-1 h-4 w-4" />
            추가
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : courses.length === 0 ? (
        <div className="text-text-secondary py-12 text-center text-sm">
          등록된 코스가 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <div
              key={course.id}
              className="border-border bg-surface flex items-start gap-3 rounded-lg border p-3"
            >
              {/* 썸네일 */}
              <div className="bg-surface-dim flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-md">
                {course.image_url ? (
                  <img
                    src={course.image_url}
                    alt={course.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageIcon className="text-text-secondary h-6 w-6" />
                )}
              </div>

              {/* 정보 */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium">{course.name}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      course.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {course.is_active ? '활성' : '비활성'}
                  </span>
                </div>
                {(course.distance_km || course.difficulty) && (
                  <p className="text-text-secondary mt-0.5 text-xs">
                    {course.distance_km && `${course.distance_km}km`}
                    {course.distance_km && course.difficulty && ' · '}
                    {course.difficulty && `난이도 ${course.difficulty}/10`}
                  </p>
                )}
                <p className="text-text-secondary mt-0.5 text-xs">
                  NW({course.nw_lat.toFixed(4)}, {course.nw_lng.toFixed(4)}) →
                  SE({course.se_lat.toFixed(4)}, {course.se_lng.toFixed(4)})
                  &nbsp;· 투명도 {Math.round(course.opacity * 100)}%
                </p>
                {course.image_url && (
                  <p className="mt-0.5 text-xs">
                    <ImageMeta url={course.image_url} />
                  </p>
                )}
              </div>

              {/* 액션 */}
              <div className="flex flex-shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleActive(course)}
                  className="h-8 px-2 text-xs"
                >
                  {course.is_active ? '끄기' : '켜기'}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEditDialog(course)}
                  className="h-8 w-8"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteTarget(course)}
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
              {editingCourse ? '코스 수정' : '코스 추가'}
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

            {/* 설명 */}
            <div className="space-y-1.5">
              <Label>설명</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="예: 한강 반포대교~잠수교 왕복 코스"
                rows={2}
              />
            </div>

            {/* 거리 & 난이도 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>거리 (km)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.distance_km}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      distance_km: e.target.value ? parseFloat(e.target.value) : '',
                    }))
                  }
                  placeholder="예: 5.2"
                />
              </div>
              <div className="space-y-1.5">
                <Label>난이도 (1~10)</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={form.difficulty}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      difficulty: e.target.value ? parseInt(e.target.value, 10) : '',
                    }))
                  }
                  placeholder="1~10"
                />
              </div>
            </div>

            {/* 코스 핀포인트 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-medium">핀포인트</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      pinpoints: [...prev.pinpoints, { lat: 0, lng: 0 }],
                    }))
                  }
                >
                  <Plus className="mr-1 h-3 w-3" />
                  추가
                </Button>
              </div>
              {form.pinpoints.length === 0 && (
                <p className="text-text-muted text-xs">
                  핀포인트를 추가하면 지도에 코스 위치가 표시됩니다.
                </p>
              )}
              {form.pinpoints.map((pin, idx) => (
                <div key={idx} className="border-border rounded-md border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-text-secondary text-xs font-medium">
                      핀 {idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          pinpoints: prev.pinpoints.filter((_, i) => i !== idx),
                        }))
                      }
                      className="text-text-muted hover:text-red-500 transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                  </div>
                  <CoordSearchInput
                    label=""
                    lat={pin.lat}
                    lng={pin.lng}
                    onCoordsChange={(lat, lng) =>
                      setForm((prev) => ({
                        ...prev,
                        pinpoints: prev.pinpoints.map((p, i) =>
                          i === idx ? { lat, lng } : p
                        ),
                      }))
                    }
                  />
                </div>
              ))}
            </div>

            {/* 이미지 업로드 */}
            <div className="space-y-1.5">
              <Label>{editingCourse ? '이미지 (변경 시 선택)' : '이미지 *'}</Label>
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

            {/* 하이라이팅 이미지 업로드 */}
            <div className="space-y-1.5">
              <Label>하이라이팅 이미지 (선택)</Label>
              <p className="text-text-secondary text-xs">
                코스 선택 시 강조 표시할 이미지. 미등록 시 기본 이미지 유지.
              </p>
              <Input
                type="file"
                accept="image/*"
                onChange={handleHighlightImageChange}
              />
              {highlightPreview && (
                <div className="bg-surface-dim relative mt-2 overflow-hidden rounded-md">
                  <img
                    src={highlightPreview}
                    alt="하이라이팅 미리보기"
                    className="max-h-40 w-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setHighlightPreview(null);
                      setForm((prev) => ({ ...prev, highlight_image: null }));
                      setRemoveHighlight(true);
                    }}
                    className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white transition-colors hover:bg-black/70"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
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
                id="course-active"
                checked={form.is_active}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, is_active: !!checked }))
                }
              />
              <Label htmlFor="course-active" className="cursor-pointer font-normal">
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
                {saving ? '저장 중...' : editingCourse ? '수정' : '추가'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>코스 삭제</AlertDialogTitle>
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

      {/* 일괄 추가 Dialog */}
      <BulkUploadDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        onUploaded={fetchCourses}
      />

      {/* Supabase Storage 안내 */}
      {courses.length === 0 && !loading && (
        <div className="border-border mt-6 rounded-lg border border-dashed p-4">
          <p className="text-text-secondary text-xs">
            <strong>Setup:</strong> Supabase Dashboard에서 &quot;courses&quot; Storage 버킷을
            생성하세요 (Public 접근 허용).
          </p>
        </div>
      )}
    </div>
  );
}
