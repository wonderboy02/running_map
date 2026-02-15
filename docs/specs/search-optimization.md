# 검색 최적화 스펙

## 현황 분석

### 현재 검색 아키텍처 (`useUnifiedSearch` + `useGeocode`)

```
사용자 입력
  ├─ 1. 로컬 코스 검색 (동기, 즉시)
  │     course.name 부분 문자열 매칭
  ├─ 2. 로컬 스팟 검색 (동기, 즉시)
  │     spot.name / spot.address / spot.categories 부분 문자열 매칭
  └─ 3. 외부 검색 — 네이버 API (비동기, 500ms debounce)
        Geocoding + Place Search → 도로명주소/장소명 반환
```

### Abort 처리 현황: 구현 완료

- `useGeocode.ts`에서 `AbortController` + `clearTimeout` 이중 취소 구현
- 새 검색어 입력 시 이전 debounce 타이머 제거 + 진행 중 fetch 취소
- `AbortError` 예외 무시 처리 완료

### 현재 문제점

1. **DB 검색 결과 노출 우선순위**: 로컬 결과가 먼저 표시되지만, 매칭 정확도가 단순 `includes()`에 의존
2. **검색 키워드 미지원**: 스팟/코스에 별칭이나 태그를 설정할 수 없어서, "한강" 검색 시 "여의도 한강공원 러너스팟"은 주소에 "한강"이 있어야만 매칭
3. **검색 결과 정렬**: 매칭된 결과의 관련도 정렬 없음 (이름 매칭 vs 주소 매칭 vs 카테고리 매칭 구분 없음)

---

## 구현 계획

### 1. 검색 키워드(태그) 필드 추가

스팟과 코스에 `search_tags` 칼럼을 추가하여, 해당 태그로도 검색 결과에 노출되도록 한다.

#### DB 스키마 변경

```sql
-- spots 테이블에 검색 태그 추가
ALTER TABLE spots ADD COLUMN search_tags text[] DEFAULT '{}';

-- courses 테이블에 검색 태그 추가
ALTER TABLE courses ADD COLUMN search_tags text[] DEFAULT '{}';
```

#### 사용 예시

| 스팟/코스명 | search_tags |
|------------|-------------|
| 러닝하우스 여의도점 | `['한강', '여의도', '러닝크루', '짐보관']` |
| 여의도 한강 5K 코스 | `['야경', '초보', '벚꽃', '한강공원']` |

#### TypeScript 타입 변경

```typescript
// src/types/index.ts
export interface Spot {
  // ... 기존 필드
  search_tags: string[];  // 추가
}

export interface Course {
  // ... 기존 필드
  search_tags: string[];  // 추가
}
```

#### Admin SpotForm 수정

- 태그 입력 UI 추가 (콤마/엔터로 구분하여 태그 추가)
- 코스 Admin에도 동일 적용

### 2. 로컬 검색 로직 개선

#### 검색 대상 필드 확장 (`useUnifiedSearch.ts`)

```typescript
// 현재
spot.name.includes(q) || spot.address.includes(q) || spot.categories.some(...)

// 개선: search_tags 포함 + 관련도 점수 기반 정렬
```

#### 관련도 점수 시스템

검색 결과를 관련도 점수로 정렬하여 DB 결과가 자연스럽게 상위에 노출:

| 매칭 위치 | 점수 | 설명 |
|----------|------|------|
| `name` 정확 일치 | 100 | 검색어와 이름이 동일 |
| `name` 시작 일치 | 80 | 이름이 검색어로 시작 |
| `name` 부분 일치 | 60 | 이름에 검색어 포함 |
| `search_tags` 일치 | 50 | 태그 중 하나가 검색어 포함 |
| `address` 부분 일치 | 30 | 주소에 검색어 포함 |
| `categories` 일치 | 20 | 카테고리명 매칭 |

```typescript
function scoreSpot(spot: Spot, q: string): number {
  const name = spot.name.toLowerCase();
  if (name === q) return 100;
  if (name.startsWith(q)) return 80;
  if (name.includes(q)) return 60;
  if (spot.search_tags?.some(tag => tag.toLowerCase().includes(q))) return 50;
  if (spot.address.toLowerCase().includes(q)) return 30;
  if (spot.categories.some(cat => cat.toLowerCase().includes(q))) return 20;
  return 0;
}

// 정렬: 점수 내림차순
const spotResults = spots
  .map(spot => ({ spot, score: scoreSpot(spot, q) }))
  .filter(({ score }) => score > 0)
  .sort((a, b) => b.score - a.score)
  .map(({ spot }) => spot);
```

### 3. 검색 결과 UI 개선

현재 구조 유지하되, 로컬(DB) 결과가 항상 외부 결과보다 위에 표시되는 현재 배치를 유지한다.

추가 고려사항:
- 코스/스팟 결과가 없고 외부 결과만 있을 때, 로딩 스피너가 외부 결과를 대기하는 동안 "검색 중..." 텍스트를 표시
- 결과가 많을 경우 각 섹션 최대 5건으로 제한, "더 보기" 버튼 추가 가능

---

## 구현 순서

1. **DB 마이그레이션**: `search_tags` 칼럼 추가 (spots, courses)
2. **타입 업데이트**: TypeScript 인터페이스에 `search_tags` 추가 + `gen:types` 재실행
3. **Admin 태그 입력 UI**: SpotForm에 태그 입력 컴포넌트 추가
4. **검색 로직 개선**: `useUnifiedSearch.ts`에 `search_tags` 매칭 + 관련도 정렬 적용
5. **기존 데이터 태그 입력**: Admin에서 기존 스팟/코스에 검색 태그 수동 입력

---

## 참고

- Abort 처리는 이미 올바르게 구현되어 있으므로 변경 불필요
- Debounce 500ms도 적절 (네이버 API rate limit 고려)
- Full-text search(PostgreSQL `tsvector`)는 현재 데이터 규모(수십~수백 개)에서는 과도함. 클라이언트 사이드 필터링으로 충분
