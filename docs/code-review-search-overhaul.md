# Code Review: Search Overhaul (`feature/search-overhaul`)

> **리뷰 일자**: 2026-02-11
> **브랜치**: `feature/search-overhaul`
> **리뷰어**: Claude Opus 4.6 (Architect Review + Manual Review)

---

## 변경 요약

기존 `SearchBar` 드롭다운 방식을 **풀스크린 검색 오버레이**로 전면 교체하는 작업.

| 구분 | 파일 |
|------|------|
| **수정** | `page.tsx`, `Header.tsx`, `FilterChips.tsx`, `globals.css`, `package.json` |
| **신규** | `Search/SearchOverlay.tsx`, `Search/SearchResultsList.tsx`, `Search/RecommendedTerms.tsx`, `useUnifiedSearch.ts` |
| **삭제** | `SearchBar.tsx` |
| **미추적** | `SEARCH_IMPLEMENTATION.md` |

---

## High Priority - 반드시 수정

### 1. `useGeocode` 로직 복붙 (코드 중복)

**파일**: `src/hooks/useUnifiedSearch.ts:43-64`

`useGeocode`의 debounce/fetch 로직을 거의 그대로 복사함. `useGeocode`는 Admin(`SpotForm.tsx`, `admin/courses/page.tsx`)에서 여전히 사용 중이므로 삭제 불가.

| 항목 | `useGeocode` | `useUnifiedSearch` |
|------|-------------|-------------------|
| Debounce | `useRef` + 500ms setTimeout | `useRef` + 500ms setTimeout |
| 최소 쿼리 길이 | 2자 | 2자 |
| API 엔드포인트 | `/api/geocode?query=...` | `/api/geocode?query=...` |
| 응답 파싱 | `data.addresses` | `data.addresses \|\| []` |
| 에러 처리 | catch → 빈 배열 | catch → 빈 배열 |

**권장 수정 (compose 패턴):**

```typescript
export function useUnifiedSearch(query: string, spots: Spot[], courses: Course[]) {
  const { results: externalResults, loading: isLoading, search, clear } = useGeocode();

  const courseResults = useMemo(() => { /* 기존 유지 */ }, [query, courses]);
  const spotResults = useMemo(() => { /* 기존 유지 */ }, [query, spots]);

  useEffect(() => {
    query.trim().length >= 2 ? search(query) : clear();
  }, [query, search, clear]);

  return { courseResults, spotResults, externalResults, isLoading };
}
```

---

### 2. Dead Code: `src/hooks/useSearch.ts`

어디서도 import하지 않음. `useUnifiedSearch`가 동일한 spot 필터링 로직을 내장하여 완전히 대체됨. **삭제 필요.**

---

### 3. Exit 애니메이션 일관성 없음

**파일**: `SearchOverlay.tsx`, `page.tsx`

| 경로 | 동작 | 애니메이션 |
|------|------|-----------|
| "취소" 버튼 | `handleClose` → `isExiting=true` → animationEnd → `onClose()` | O (정상) |
| 결과 선택 | 부모에서 즉시 `setIsSearchActive(false)` | X (즉시 unmount) |

`handleCourseSelect`, `handleSearchSpotSelect`, `handleSearchLocationSelect` 모두 부모에서 직접 `setIsSearchActive(false)` 호출하여 SearchOverlay의 `handleClose`를 거치지 않음.

**권장**: 모든 close 경로를 오버레이의 애니메이션 메커니즘을 통하도록 통일하거나, 결과 선택 시 의도적으로 즉시 닫기라면 exit 애니메이션 자체를 제거.

---

## Medium Priority - 코드 품질

### 4. 불필요한 `useCallback` 3개

**파일**: `src/components/Search/SearchOverlay.tsx:56-75`

props를 그대로 포워딩하는 wrapper. 자식 컴포넌트가 `React.memo`가 아니므로 성능 이점 없음.

```typescript
// ❌ 불필요한 래핑
const handleCourseSelect = useCallback(
  (course: Course) => { onCourseSelect(course); },
  [onCourseSelect],
);

// ✅ 직접 전달
<SearchResultsList onCourseSelect={onCourseSelect} ... />
```

`handleClose`, `handleClearQuery`는 추가 로직이 있으므로 유지 OK.

---

### 5. dismiss 로직 4회 반복

**파일**: `src/app/page.tsx`

```typescript
setIsSearchActive(false);
setSearchQuery('');
```

이 2줄이 `handleSearchClose`, `handleCourseSelect`, `handleSearchSpotSelect`, `handleSearchLocationSelect` 4군데에서 반복.

**권장:**

```typescript
function dismissSearch() {
  setIsSearchActive(false);
  setSearchQuery('');
}
```

---

### 6. 미사용 ref: `overlayRef`

**파일**: `src/components/Search/SearchOverlay.tsx:34`

```typescript
const overlayRef = useRef<HTMLDivElement>(null);  // 선언만 하고 읽지 않음
```

`ref={overlayRef}`로 할당되지만 어디서도 접근하지 않음. **삭제 필요.**

---

### 7. 하드코딩 색상 (디자인 시스템 위반)

**파일**: `src/components/Search/RecommendedTerms.tsx:38, 90`

프로젝트는 시맨틱 CSS 변수(`bg-surface-dim`, `text-text`, `text-text-secondary`)를 사용하는데, 이 파일만 Tailwind 기본 색상 사용:

```tsx
// ❌ 하드코딩
className="bg-blue-50 text-blue-700"   // line 38
className="bg-gray-100 text-gray-700"  // line 90

// ✅ 시맨틱 변수 사용 권장
className="bg-surface-dim text-text"
```

---

### 8. `SEARCH_IMPLEMENTATION.md` 커밋 불필요

구현 완료된 일회성 기획 문서. 코드와 이미 차이 발생:
- Spec: `Header`가 `onSearchClose` prop 수신 → 실제: 해당 prop 없음
- Spec: `useUnifiedSearch`가 `searchExternal` 노출 → 실제: 내부 `useEffect` 사용

프로젝트에 이미 `IMPLEMENTATION.md`, `docs/changelog-v0.2.md`가 있으므로 중복. **커밋에서 제외.**

---

## Low Priority - 개선 권장

### 9. 중복 조건: `isOpen` prop

**파일**: `SearchOverlay.tsx:84`, `page.tsx:113`

부모가 `{isSearchActive && <SearchOverlay/>}`로 조건부 렌더링 → `isOpen`은 마운트 시 항상 `true`.

**권장**: 둘 중 하나만 사용:
- (A) 부모의 조건부 렌더링 제거 → `SearchOverlay`가 `isOpen`으로 자체 visibility 관리
- (B) `isOpen` prop 제거 (현재 의미 없으므로)

(A) 방식이 exit 애니메이션 이슈(#3)도 함께 해결 가능.

---

### 10. 헤더 로고 애니메이션이 사용자에게 보이지 않음

**파일**: `src/components/Header.tsx:16-23`

오버레이가 `fixed inset-0 z-[60]`으로 즉시 전체 화면을 덮으므로, Header(`z-40`)의 로고 fade-out 애니메이션은 뒤에 가려짐.

**권장**: 오버레이 진입에 약간의 딜레이를 두거나, 보이지 않는 애니메이션 코드를 제거.

---

### 11. `AbortController` 미사용

**파일**: `src/hooks/useUnifiedSearch.ts:53` (또는 `useGeocode.ts:34`)

빠른 타이핑 시 이전 debounced fetch가 이미 발생한 경우, 응답이 늦게 도착하면 stale 결과가 잠깐 표시될 수 있음.

**권장**: `useGeocode` 리팩터링 시 `AbortController` 패턴 함께 적용.

```typescript
const controllerRef = useRef<AbortController | null>(null);

// fetch 전
controllerRef.current?.abort();
controllerRef.current = new AbortController();
const res = await fetch(url, { signal: controllerRef.current.signal });
```

---

### 12. `RecommendedTerms`에서 `is_active` 필터 누락

**파일**: `src/components/Search/RecommendedTerms.tsx:28`

`Course` 타입에 `is_active` 필드가 있지만, 추천 코스 목록에서 비활성 코스를 필터링하지 않음. `useCourses`에서 이미 필터링한다면 OK, 아니면 `.filter(o => o.is_active)` 추가 필요.

---

### 13. TypeScript 버전 pinning

**파일**: `package.json`

`"^5"` → `"5.9.3"` 정확 고정. 패치 업데이트도 받지 못함.

- 의도적이면 OK
- 아니면 `"~5.9.3"` (패치만 허용) 권장

---

## 잘된 점

- **컴포넌트 분리**: `SearchBar` 모놀리스를 `SearchOverlay` / `SearchResultsList` / `RecommendedTerms` 3개 책임으로 잘 분리 (SRP)
- **검색 우선순위**: course → spot → 외부 API 순서가 `SearchResultsList`에서 명확하게 분리
- **상태 관리**: `page.tsx`에서 검색 상태를 리프팅하여 controlled component 패턴 적용 (이 규모에 적절)
- **`useMemo` 적절 사용**: `useUnifiedSearch`의 로컬 필터링에 `useMemo` 적용 (키스트로크마다 재필터링 방지)
- **CSS 애니메이션**: globals.css에 keyframe 정의하여 JS 번들 증가 없이 애니메이션 구현

---

## 액션 아이템 체크리스트

- [ ] `useUnifiedSearch`에서 `useGeocode` compose 패턴으로 리팩터링
- [ ] `src/hooks/useSearch.ts` 삭제
- [ ] Exit 애니메이션 경로 통일 (또는 의도적 즉시 닫기 결정)
- [ ] `SearchOverlay.tsx`에서 불필요한 `useCallback` 3개 제거
- [ ] `page.tsx`에서 `dismissSearch()` 헬퍼 추출
- [ ] `SearchOverlay.tsx`에서 미사용 `overlayRef` 제거
- [ ] `RecommendedTerms.tsx` 하드코딩 색상 → 시맨틱 변수
- [ ] `SEARCH_IMPLEMENTATION.md` 커밋에서 제외
- [ ] `isOpen` prop 정리 (#9 참고)
- [ ] `AbortController` 추가 (`useGeocode` 리팩터링 시)
- [ ] `RecommendedTerms`에서 `is_active` 필터 확인
- [ ] TypeScript 버전 pinning 방식 결정
