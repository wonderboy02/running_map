# 코스 하이라이팅 구현 스펙 (Option C: 이미지 교체)

## 개요

코스 핀을 클릭하면 해당 코스의 GroundOverlay 이미지를 **하이라이팅 전용 이미지**로 교체하여 시각적으로 강조한다. 기존 오버레이 표시/숨김 토글(`showCourses`)은 그대로 유지.

### 동작 흐름

```
[미선택 상태]
  모든 코스 → image_url (기본 이미지)로 표시

[코스 핀 클릭]
  선택된 코스 → highlight_image_url (하이라이팅 이미지)로 setUrl() 교체
  나머지 코스 → image_url 유지

[선택 해제 (X 버튼 / 다른 핀 클릭)]
  이전 선택 코스 → image_url로 복원
  (다른 핀 클릭 시) 새 선택 코스 → highlight_image_url로 교체
```

### 핵심 API

```typescript
// Naver Maps GroundOverlay — 이미 프로젝트에 사용 중
groundOverlay.setUrl(url: string)  // 이미지 URL 실시간 교체
```

---

## 1. DB 변경

### 마이그레이션 SQL

```sql
-- supabase/migrations/010_add_course_highlight_image.sql
ALTER TABLE courses
  ADD COLUMN highlight_image_url TEXT;
```

- **nullable**: 하이라이팅 이미지가 없는 코스는 `null` → 선택해도 기본 이미지 유지
- 기존 데이터에 영향 없음 (기본값 `null`)

### 최종 courses 테이블 구조 (하이라이팅 관련)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `image_url` | `TEXT NOT NULL` | 기본 오버레이 이미지 (기존) |
| `highlight_image_url` | `TEXT NULL` | 하이라이팅용 이미지 (신규) |

---

## 2. TypeScript 타입 변경

### `src/types/index.ts`

```diff
 export interface Course {
   id: string;
   name: string;
   image_url: string;
+  highlight_image_url: string | null;
   nw_lat: number;
   nw_lng: number;
   // ... 나머지 동일
 }
```

### `src/lib/supabase/database.ts` (자동 생성)

```bash
npm run gen:types
```

---

## 3. NaverMap 오버레이 effect 변경

### 파일: `src/components/Map/NaverMap.tsx`

**현재 코드** (line 140–183): GroundOverlay effect가 `courses`와 `showCourses`에만 반응.

**변경**: `selection` deps 추가 + `setUrl()` 호출.

```diff
 // GroundOverlay 렌더링 — 인스턴스는 유지하고 showCourses로 가시성만 토글
 useEffect(() => {
   if (!isReady || !map) return;

+  const selectedCourseId =
+    selection?.type === 'course' ? selection.data.id : null;
+
   const currentIds = new Set(courses.map((o) => o.id));
   const existingOverlays = groundOverlaysRef.current;

   // 더 이상 없는 GroundOverlay 제거
   existingOverlays.forEach((groundOverlay, id) => {
     if (!currentIds.has(id)) {
       groundOverlay.setMap(null);
       existingOverlays.delete(id);
     }
   });

   // 새로운 코스 오버레이 추가 또는 기존 가시성 토글
   courses.forEach((course) => {
     const existing = existingOverlays.get(course.id);
+    const isSelected = course.id === selectedCourseId;
+
+    // 하이라이팅 이미지가 있고 선택된 경우 → 하이라이팅 URL 사용
+    const targetUrl = (isSelected && course.highlight_image_url)
+      ? course.highlight_image_url
+      : course.image_url;
+
+    // Vercel Edge 캐싱을 위해 같은 도메인 경로로 변환
+    const imageUrl = targetUrl.replace(
+      /https:\/\/[^/]+\/storage\/v1\/object\/public/,
+      '/storage',
+    );

     if (existing) {
+      existing.setUrl(imageUrl);  // 이미지 교체 (선택/해제 시)
       existing.setMap(showCourses ? map : null);
     } else {
       // NW/SE → SW/NE 변환 (LatLngBounds 용)
       const sw = new naver.maps.LatLng(course.se_lat, course.nw_lng);
       const ne = new naver.maps.LatLng(course.nw_lat, course.se_lng);
       const bounds = new naver.maps.LatLngBounds(sw, ne);

-      // Vercel Edge 캐싱을 위해 같은 도메인 경로로 변환
-      const imageUrl = course.image_url.replace(
-        /https:\/\/[^/]+\/storage\/v1\/object\/public/,
-        '/storage',
-      );

       const groundOverlay = new naver.maps.GroundOverlay(
         imageUrl,
         bounds,
         { opacity: course.opacity, clickable: false },
       );

       groundOverlay.setMap(showCourses ? map : null);
       existingOverlays.set(course.id, groundOverlay);
     }
   });
- }, [isReady, map, courses, showCourses]);
+ }, [isReady, map, courses, showCourses, selection]);
```

### 변경 포인트 요약

| 항목 | 변경 내용 |
|------|----------|
| deps 추가 | `selection` |
| 새 변수 | `selectedCourseId`, `isSelected`, `targetUrl` |
| 기존 코드 이동 | URL 변환 로직을 forEach 안으로 이동 (코스별 URL이 달라지므로) |
| 새 호출 | `existing.setUrl(imageUrl)` — 기존 인스턴스의 이미지 교체 |

### 성능 영향

- `setUrl()` 호출은 이미지 로드만 발생 (DOM 조작 없음)
- 선택 변경 시 모든 오버레이를 순회하지만, 코스 수가 수십 개 수준이므로 무시 가능
- `selection` 변경 시 이미 코스 핀 effect도 재실행되므로 일관성 유지

---

## 4. Admin UI 변경

### 파일: `src/app/admin/courses/page.tsx`

#### 4-1. CourseForm 인터페이스

```diff
 interface CourseForm {
   name: string;
   // ... 기존 필드
   image: File | null;
+  highlight_image: File | null;
 }

 const EMPTY_FORM: CourseForm = {
   // ... 기존 필드
   image: null,
+  highlight_image: null,
 };
```

#### 4-2. 수정 Dialog에서 기존 하이라이팅 이미지 표시

```diff
 function openEditDialog(course: Course) {
   // ... 기존 코드
   setImagePreview(course.image_url);
+  setHighlightPreview(course.highlight_image_url);
   setDialogOpen(true);
 }
```

#### 4-3. 폼에 하이라이팅 이미지 업로드 필드 추가

기존 "이미지" 필드 아래에 추가:

```tsx
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
    <div className="bg-surface-dim mt-2 overflow-hidden rounded-md">
      <img
        src={highlightPreview}
        alt="하이라이팅 미리보기"
        className="max-h-40 w-full object-contain"
      />
    </div>
  )}
</div>
```

#### 4-4. handleSubmit에서 하이라이팅 이미지 전송

```diff
 if (form.image) {
   formData.append('image', form.image);
 }
+if (form.highlight_image) {
+  formData.append('highlight_image', form.highlight_image);
+}
```

---

## 5. API Route 변경

### 파일: `src/app/api/admin/courses/route.ts`

#### 5-1. POST (생성)

```diff
 // 기존 이미지 업로드 후...
+
+// 하이라이팅 이미지 업로드 (선택)
+const highlightFile = formData.get('highlight_image') as File | null;
+if (highlightFile && highlightFile.size > 0) {
+  const hlError = validateImageFile(highlightFile);
+  if (hlError) {
+    return NextResponse.json(
+      { success: false, error: `하이라이팅 이미지: ${hlError}` },
+      { status: 400 },
+    );
+  }
+  const highlight_image_url = await convertAndUpload(highlightFile, COURSE_UPLOAD)
+    .catch(() => null);
+  if (highlight_image_url) {
+    insertData.highlight_image_url = highlight_image_url;
+  }
+}
```

#### 5-2. PATCH (수정)

```diff
 // 기존 이미지 교체 로직 후...
+
+// 하이라이팅 이미지 교체
+const highlightFile = formData.get('highlight_image') as File | null;
+if (highlightFile && highlightFile.size > 0) {
+  const hlError = validateImageFile(highlightFile);
+  if (hlError) {
+    return NextResponse.json(
+      { success: false, error: `하이라이팅 이미지: ${hlError}` },
+      { status: 400 },
+    );
+  }
+
+  const highlight_image_url = await convertAndUpload(highlightFile, COURSE_UPLOAD)
+    .catch(() => null);
+  if (highlight_image_url) {
+    // 새 이미지 업로드 성공 후 기존 이미지 삭제 (실패 시 기존 유지)
+    const { data: existing } = await supabaseServer
+      .from('courses')
+      .select('highlight_image_url')
+      .eq('id', id)
+      .single();
+
+    if (existing?.highlight_image_url) {
+      await removeFromStorage('courses', [existing.highlight_image_url]);
+    }
+
+    updates.highlight_image_url = highlight_image_url;
+  }
+}
```

#### 5-3. DELETE (삭제)

```diff
 // 기존 이미지 URL 가져오기
 const { data: existing } = await supabaseServer
   .from('courses')
-  .select('image_url')
+  .select('image_url, highlight_image_url')
   .eq('id', id)
   .single();

 // Storage에서 이미지 삭제
-if (existing?.image_url) {
-  await removeFromStorage('courses', [existing.image_url]);
-}
+const urlsToDelete = [
+  existing?.image_url,
+  existing?.highlight_image_url,
+].filter(Boolean) as string[];
+
+if (urlsToDelete.length > 0) {
+  await removeFromStorage('courses', urlsToDelete);
+}
```

---

## 6. Bulk Upload 변경

현재 벌크 업로드는 기본 이미지만 처리. 하이라이팅 이미지는 **개별 수정에서만 추가** 가능하도록 유지.

> 향후 필요 시 파일명 컨벤션 확장 가능: `{이름}_{NW}_{SE}.png` + `{이름}_{NW}_{SE}_hl.png`

---

## 7. 수정 파일 목록

| # | 파일 | 변경 내용 | 난이도 |
|---|------|----------|--------|
| 1 | `supabase/migrations/010_add_course_highlight_image.sql` | 컬럼 추가 | 낮음 |
| 2 | `src/types/index.ts` | Course 타입에 필드 추가 | 낮음 |
| 3 | `src/components/Map/NaverMap.tsx` | 오버레이 setUrl() 로직 | 중간 |
| 4 | `src/app/admin/courses/page.tsx` | 하이라이팅 이미지 업로드 UI | 중간 |
| 5 | `src/app/api/admin/courses/route.ts` | POST/PATCH/DELETE 수정 | 중간 |
| 6 | `src/lib/supabase/database.ts` | `npm run gen:types` 재생성 | 자동 |

**총 변경 파일**: 5개 (+ 타입 자동 생성)

---

## 8. 하이라이팅 이미지 제작 가이드

### 이미지 요구사항

| 항목 | 기본 이미지 | 하이라이팅 이미지 |
|------|------------|-------------------|
| **포맷** | PNG (투명 배경) | PNG (투명 배경) |
| **해상도** | 동일 | **기본과 동일한 해상도** |
| **좌표 범위** | NW/SE 좌표 | **기본과 동일** (같은 bounds에 겹쳐야 함) |
| **시각적 차이** | 일반 코스 표시 | 강조 효과 (아래 참고) |

### 강조 효과 추천 옵션

1. **색상 강조**: 기본 이미지의 경로 색을 더 선명하게 (예: 반투명 → 불투명)
2. **테두리/글로우**: 경로 주변에 글로우 효과 추가
3. **컬러 변경**: 기본 = 회색/연한 색, 하이라이팅 = 브랜드 컬러 (오렌지 `#F46A16` 등)
4. **애니메이션 효과 (비추천)**: GroundOverlay는 정적 이미지만 지원, GIF/애니메이션 불가

### 파일 네이밍 권장

```
public/courses/ (또는 Supabase Storage)
├── yeouido-course.png           # 기본
├── yeouido-course-highlight.png # 하이라이팅
├── banpo-course.png
├── banpo-course-highlight.png
└── ...
```

---

## 9. 엣지 케이스

| 케이스 | 동작 |
|--------|------|
| `highlight_image_url`이 `null` | 선택해도 기본 이미지 유지 (교체 없음) |
| 코스 핀 없이 오버레이만 있는 코스 | 핀 클릭이 불가하므로 하이라이팅 불가 (정상) |
| `showCourses = false` 상태에서 코스 선택 | 오버레이 숨김 유지 (선택은 가능하나 오버레이 안 보임) |
| 빠른 연속 클릭 (A → B → C) | 각 클릭마다 `setUrl()` 호출, 마지막 선택만 하이라이팅 |
| 하이라이팅 이미지 로드 실패 | Naver Maps가 내부적으로 처리 (빈 오버레이), 앱 크래시 없음 |

---

## 10. 향후 확장 가능성

- **Opacity 차별화 추가**: Option B 조합 — 선택 시 `highlight_image_url` + opacity 1.0, 비선택 코스 opacity 0.3
- **Pan-to 연동**: 코스 선택 시 해당 코스 bounds 중앙으로 지도 이동 (현재 미구현)
- **Bulk 하이라이팅 업로드**: 파일명 `_hl` 접미사 컨벤션으로 일괄 매칭
