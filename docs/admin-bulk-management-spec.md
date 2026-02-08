# Admin 장소 검색 & 일괄 관리 기능 구현 문서

> **작성일**: 2026-02-06
> **버전**: v1.0

---

## 1. 개요

### 목적
Admin 페이지에 네이버 지역검색 API를 활용하여 장소를 검색하고, 체크박스로 선택한 장소들을 DB에 일괄 추가하거나 수정할 수 있는 기능을 구현합니다.

### 핵심 기능
1. **네이버 지역검색 API 연동**: 검색어로 장소 검색
2. **중복 방지**: 이름 + 도로명 주소 조합으로 중복 체크 + 같은 주소 경고
3. **벌크 저장**: 체크박스로 선택한 장소들을 DB에 일괄 추가
4. **일괄 수정**: 기존 장소들의 필드를 한 번에 수정
5. **필터링 & 정렬**: 카테고리, 하이라이트, 정렬 옵션
6. **Pagination**: 50개씩 페이징

---

## 2. 기능 명세

### 2.1 탭 구조

Admin 페이지를 2개 탭으로 분리:

| 탭 | 경로 | 설명 |
|----|------|------|
| **장소 목록** | `/admin` | 기존 장소 목록 (CRUD) |
| **검색 & 일괄 관리** | `/admin/bulk` | 네이버 검색 + 벌크 추가/수정 |

### 2.2 검색 & 일괄 관리 탭 상세

#### A. 네이버 지역검색

**검색 플로우:**
```
검색어 입력 → API 호출 → 결과 테이블 표시 → 중복 체크 → 상태 표시
```

**API 엔드포인트:**
```
GET /api/admin/search-places?query=강남역&display=50
```

**응답 데이터:**
```typescript
interface SearchResult {
  items: Array<{
    title: string;           // 장소명 (HTML 태그 제거 필요)
    category: string;        // 네이버 카테고리
    telephone: string;       // 전화번호
    address: string;         // 지번 주소
    roadAddress: string;     // 도로명 주소
    mapx: string;           // X 좌표 (KATECH)
    mapy: string;           // Y 좌표 (KATECH)
    link: string;           // 웹사이트 URL
  }>;
  total: number;
  duplicateCheck: DuplicateStatus[];  // 중복 체크 결과
}
```

#### B. 중복 체크 로직

**2단계 체크:**

1. **완전 중복 (Exact Match)**
   - 조건: `name === ? AND address === ?`
   - 결과: ❌ **이미 존재** (추가 불가, 체크박스 비활성화)

2. **같은 주소 경고 (Same Address)**
   - 조건: `address === ?` (name 다름)
   - 결과: ⚠️ **같은 주소에 다른 장소 존재** (추가 가능, 경고 표시)

3. **새 장소 (New)**
   - 조건: 위 두 경우 모두 해당 안 됨
   - 결과: ✅ **새 장소** (추가 가능)

**타입 정의:**
```typescript
interface DuplicateCheck {
  status: 'new' | 'warning' | 'duplicate';
  existingSpots?: Array<{
    id: string;
    name: string;
    categories: string[];
  }>;
}
```

#### C. 좌표 변환

네이버 지역검색 API의 KATECH 좌표계를 WGS84로 변환:

```typescript
// 이미 구현된 변환 로직 활용
latitude = parseInt(mapy) / 10_000_000;
longitude = parseInt(mapx) / 10_000_000;
```

**추가 정확도 확보:**
- Geocoding API로 `roadAddress` 재검색하여 좌표 보정 (선택적)

#### D. 벌크 저장

**플로우:**
```
1. 체크박스로 장소 선택
2. "선택한 N개 추가" 버튼 클릭
3. 확인 다이얼로그 표시
4. DB에 일괄 INSERT
5. 성공 토스트 + 결과 요약
```

**저장 데이터:**
```typescript
interface SpotInsertBulk {
  name: string;              // 네이버 title (HTML 태그 제거)
  address: string;           // roadAddress
  latitude: number;          // 변환된 좌표
  longitude: number;         // 변환된 좌표
  categories: string[];      // 빈 배열 (나중에 수정)
  is_highlighted: false;     // 기본값
  phone: string | null;      // telephone
  description: null;         // 기본 null
  operating_hours: null;     // 기본 null
  photos: [];                // 빈 배열
  extra_data: {              // 네이버 원본 데이터 보관
    naver_category: string;
    naver_link: string;
  };
}
```

#### E. 일괄 수정

**선택한 장소들의 필드를 한 번에 수정:**

```
1. 체크박스로 장소 선택
2. "일괄 수정" 드롭다운 클릭
3. 수정할 필드 선택 (다이얼로그)
4. 값 입력 후 적용
5. DB UPDATE 실행
```

**수정 가능 필드:**
- 하이라이트 설정/해제
- 카테고리 추가/제거
- 운영시간 입력
- 설명 입력
- 전화번호 수정
- 삭제

**UI:**
```
┌─────────────────────────────────────────┐
│ 선택한 5개 장소                         │
├─────────────────────────────────────────┤
│ [일괄 수정 ▼]  [삭제]                  │
│   ├─ 하이라이트 설정                    │
│   ├─ 하이라이트 해제                    │
│   ├─ 카테고리 추가                      │
│   ├─ 카테고리 제거                      │
│   ├─ 운영시간 입력                      │
│   └─ 설명 입력                          │
└─────────────────────────────────────────┘
```

#### F. 필터링 & 정렬

**필터 옵션:**
- **카테고리**: 멀티 선택 (짐보관, 샤워실, 탈의실, 락커, 카페)
- **하이라이트**: 전체 / 추천만 / 일반만
- **소스**: 전체 / 네이버 검색 / 직접 입력

**정렬 옵션:**
- 최신순 (created_at DESC)
- 오래된순 (created_at ASC)
- 이름순 (name ASC)

#### G. Pagination

- **페이지 크기**: 50개
- **적용 범위**:
  - `/admin` (장소 목록)
  - `/admin/bulk` (검색 결과 & 전체 장소)
- **UI**: shadcn/ui Pagination 컴포넌트 사용

---

## 3. UI/UX 디자인

### 3.1 탭 네비게이션

```
┌─────────────────────────────────────────┐
│  Admin                      [로그아웃]  │
├─────────────────────────────────────────┤
│  [장소 목록]  [검색 & 일괄 관리]        │
└─────────────────────────────────────────┘
```

### 3.2 검색 & 일괄 관리 페이지

```
┌───────────────────────────────────────────────────────────┐
│  Admin                                        [로그아웃]  │
├───────────────────────────────────────────────────────────┤
│  [장소 목록]  [검색 & 일괄 관리] ←                       │
├───────────────────────────────────────────────────────────┤
│                                                            │
│  네이버 장소 검색                                          │
│  ┌─────────────────────────────────┐  [검색]            │
│  │ 강남역 카페                     │                     │
│  └─────────────────────────────────┘                     │
│                                                            │
│  검색 결과 (23건)                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ [✓] 전체 선택                                      │  │
│  │ 선택: 5개  [DB에 추가]  [일괄 수정 ▼]             │  │
│  ├────────────────────────────────────────────────────┤  │
│  │ ☐ | 스타벅스 강남점 | 강남구 테헤란로 123 | ✅ 새  │  │
│  │ ☐ | 카페베네       | 강남구 테헤란로 123 | ⚠️ 경고│  │
│  │ ☑ | 던킨도너츠     | 강남구 역삼로 456   | ✅ 새  │  │
│  │ ☐ | 이디야커피     | 강남구 강남대로 789 | ❌ 중복│  │
│  │ ...                                                 │  │
│  └────────────────────────────────────────────────────┘  │
│                                                            │
│  페이지네이션: [1] 2 3 ... 10                             │
│                                                            │
│  ─────────────────────────────────────────────────────── │
│                                                            │
│  기존 장소 관리                                            │
│  필터: [카테고리 ▼] [하이라이트 ▼] [정렬 ▼]              │
│  ┌────────────────────────────────────────────────────┐  │
│  │ [✓] 전체 선택                                      │  │
│  │ 선택: 3개  [일괄 수정 ▼]  [삭제]                  │  │
│  ├────────────────────────────────────────────────────┤  │
│  │ ☐ | 러닝스테이션 강남 | 짐보관, 샤워실 | 추천     │  │
│  │ ☑ | 피트니스라커    | 락커, 탈의실   | 일반     │  │
│  │ ...                                                 │  │
│  └────────────────────────────────────────────────────┘  │
│                                                            │
│  페이지네이션: [1] 2 3 ... 20                             │
└───────────────────────────────────────────────────────────┘
```

### 3.3 상태별 표시

| 상태 | 아이콘 | 색상 | 설명 | 체크박스 |
|------|--------|------|------|----------|
| ✅ 새 장소 | CheckCircle | 초록 | 추가 가능 | 활성화 |
| ⚠️ 같은 주소 | AlertTriangle | 노랑 | 확인 필요 | 활성화 |
| ❌ 이미 존재 | XCircle | 빨강 | 중복 | 비활성화 |

### 3.4 경고 툴팁 (같은 주소)

```
⚠️ 같은 주소에 다른 장소 존재
━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 강남구 테헤란로 123

기존 장소:
• 스타벅스 강남점 (카페)
• 던킨도너츠 (카페)

이 주소에 추가하시겠습니까?
```

### 3.5 일괄 수정 다이얼로그

```
┌─────────────────────────────────────┐
│  일괄 수정                          │
├─────────────────────────────────────┤
│  선택한 5개 장소를 수정합니다       │
│                                     │
│  수정 항목:                         │
│  ┌─────────────────────────────┐   │
│  │ [ ] 하이라이트 설정         │   │
│  │ [✓] 카테고리 추가           │   │
│  │     └─ [짐보관] [샤워실]    │   │
│  │ [ ] 운영시간 입력           │   │
│  └─────────────────────────────┘   │
│                                     │
│  [취소]  [적용]                     │
└─────────────────────────────────────┘
```

---

## 4. 데이터베이스 스키마

### 4.1 기존 스키마 유지

현재 `spots` 테이블 스키마를 그대로 사용합니다. 추가 필드 없음.

### 4.2 중복 체크 전략

**애플리케이션 레벨에서 체크:**
- DB 쿼리: `SELECT id, name FROM spots WHERE address = ?`
- 이름까지 같으면 완전 중복, 이름만 다르면 경고

**복합 인덱스 추가 (선택적, 성능 최적화):**
```sql
-- 이름 + 주소 조합 검색 최적화
CREATE INDEX idx_spots_name_address ON spots(name, address);

-- 주소 검색 최적화 (같은 주소 찾기)
CREATE INDEX idx_spots_address ON spots(address);
```

---

## 5. API 설계

### 5.1 네이버 장소 검색 API

**엔드포인트:**
```
GET /api/admin/search-places
```

**쿼리 파라미터:**
```typescript
{
  query: string;      // 검색어 (필수)
  display?: number;   // 결과 개수 (기본 50, 최대 50)
  start?: number;     // 시작 인덱스 (pagination)
}
```

**응답:**
```typescript
{
  success: boolean;
  items: Array<{
    // 네이버 API 원본 데이터
    title: string;
    category: string;
    telephone: string;
    address: string;
    roadAddress: string;
    mapx: string;
    mapy: string;
    link: string;

    // 변환된 데이터
    cleanName: string;       // HTML 태그 제거
    latitude: number;        // WGS84 위도
    longitude: number;       // WGS84 경도

    // 중복 체크 결과
    duplicateStatus: 'new' | 'warning' | 'duplicate';
    existingSpots?: Array<{
      id: string;
      name: string;
      categories: string[];
    }>;
  }>;
  total: number;
  query: string;
}
```

**구현 위치:**
```
src/app/api/admin/search-places/route.ts
```

### 5.2 벌크 장소 추가 API

**엔드포인트:**
```
POST /api/admin/spots/bulk
```

**요청 Body:**
```typescript
{
  spots: Array<{
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    phone?: string;
    extra_data: {
      naver_category: string;
      naver_link: string;
    };
  }>;
}
```

**응답:**
```typescript
{
  success: boolean;
  inserted: number;
  skipped: number;      // 중복으로 건너뛴 개수
  errors?: Array<{
    index: number;
    name: string;
    error: string;
  }>;
}
```

### 5.3 일괄 수정 API

**엔드포인트:**
```
PATCH /api/admin/spots/bulk
```

**요청 Body:**
```typescript
{
  spotIds: string[];     // 선택한 장소 ID 배열
  updates: {
    is_highlighted?: boolean;
    categories?: {
      action: 'add' | 'remove';
      values: string[];
    };
    operating_hours?: Record<string, string>;
    description?: string;
    phone?: string;
  };
}
```

**응답:**
```typescript
{
  success: boolean;
  updated: number;
  errors?: Array<{
    id: string;
    name: string;
    error: string;
  }>;
}
```

---

## 6. 컴포넌트 구조

### 6.1 파일 구조

```
src/
├── app/
│   ├── admin/
│   │   ├── layout.tsx                    # Admin 레이아웃 (탭 추가)
│   │   ├── page.tsx                      # 장소 목록 탭
│   │   └── bulk/
│   │       └── page.tsx                  # 검색 & 일괄 관리 탭
│   └── api/
│       └── admin/
│           ├── search-places/
│           │   └── route.ts              # 네이버 검색 API
│           └── spots/
│               └── bulk/
│                   └── route.ts          # 벌크 추가/수정 API
├── components/
│   └── admin/
│       ├── NaverSearchSection.tsx        # 네이버 검색 섹션
│       ├── SearchResultsTable.tsx        # 검색 결과 테이블
│       ├── SpotManagementTable.tsx       # 기존 장소 관리 테이블
│       ├── BulkActionToolbar.tsx         # 일괄 작업 툴바
│       ├── BulkEditDialog.tsx            # 일괄 수정 다이얼로그
│       ├── DuplicateStatusBadge.tsx      # 중복 상태 뱃지
│       └── SameAddressTooltip.tsx        # 같은 주소 경고 툴팁
├── hooks/
│   ├── useNaverSearch.ts                 # 네이버 검색 훅
│   ├── useBulkSpots.ts                   # 벌크 작업 훅
│   └── useDuplicateCheck.ts              # 중복 체크 훅
└── lib/
    ├── naver-api.ts                      # 네이버 API 유틸
    └── duplicate-checker.ts              # 중복 체크 로직
```

### 6.2 주요 컴포넌트

#### A. Admin 레이아웃 (탭 추가)

```tsx
// src/app/admin/layout.tsx
'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePathname, useRouter } from 'next/navigation';

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div>
      <header>
        <h1>Admin</h1>
        <button onClick={logout}>로그아웃</button>
      </header>

      <Tabs value={pathname} onValueChange={router.push}>
        <TabsList>
          <TabsTrigger value="/admin">장소 목록</TabsTrigger>
          <TabsTrigger value="/admin/bulk">검색 & 일괄 관리</TabsTrigger>
        </TabsList>
      </Tabs>

      {children}
    </div>
  );
}
```

#### B. 네이버 검색 섹션

```tsx
// src/components/admin/NaverSearchSection.tsx
'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { useNaverSearch } from '@/hooks/useNaverSearch';

export function NaverSearchSection() {
  const [query, setQuery] = useState('');
  const { search, results, loading } = useNaverSearch();

  const handleSearch = async () => {
    if (query.trim().length < 2) return;
    await search(query);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="장소명 또는 주소 입력..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button onClick={handleSearch} disabled={loading}>
          <Search className="mr-2 h-4 w-4" />
          검색
        </Button>
      </div>

      {results && (
        <SearchResultsTable results={results} />
      )}
    </div>
  );
}
```

#### C. 검색 결과 테이블

```tsx
// src/components/admin/SearchResultsTable.tsx
'use client';

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { DuplicateStatusBadge } from './DuplicateStatusBadge';
import { SameAddressTooltip } from './SameAddressTooltip';

export function SearchResultsTable({ results }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const handleSelectAll = () => {
    if (selected.size === availableItems.length) {
      setSelected(new Set());
    } else {
      const available = results
        .filter(r => r.duplicateStatus !== 'duplicate')
        .map((_, i) => i);
      setSelected(new Set(available));
    }
  };

  const availableItems = results.filter(r => r.duplicateStatus !== 'duplicate');

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selected.size === availableItems.length}
            onCheckedChange={handleSelectAll}
          />
          <span className="text-sm">
            선택: {selected.size}개
          </span>
        </div>

        {selected.size > 0 && (
          <div className="flex gap-2">
            <Button size="sm" onClick={handleBulkAdd}>
              DB에 추가
            </Button>
          </div>
        )}
      </div>

      <table className="w-full">
        <thead>
          <tr>
            <th></th>
            <th>장소명</th>
            <th>주소</th>
            <th>카테고리</th>
            <th>상태</th>
          </tr>
        </thead>
        <tbody>
          {results.map((item, index) => (
            <tr key={index}>
              <td>
                <Checkbox
                  checked={selected.has(index)}
                  disabled={item.duplicateStatus === 'duplicate'}
                  onCheckedChange={(checked) => {
                    const newSelected = new Set(selected);
                    if (checked) {
                      newSelected.add(index);
                    } else {
                      newSelected.delete(index);
                    }
                    setSelected(newSelected);
                  }}
                />
              </td>
              <td>{item.cleanName}</td>
              <td>{item.roadAddress}</td>
              <td>{item.category}</td>
              <td>
                <DuplicateStatusBadge status={item.duplicateStatus} />
                {item.duplicateStatus === 'warning' && (
                  <SameAddressTooltip spots={item.existingSpots} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

#### D. 중복 상태 뱃지

```tsx
// src/components/admin/DuplicateStatusBadge.tsx
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export function DuplicateStatusBadge({ status }) {
  const config = {
    new: {
      icon: CheckCircle,
      label: '새 장소',
      variant: 'default',
      className: 'bg-green-500 text-white'
    },
    warning: {
      icon: AlertTriangle,
      label: '같은 주소',
      variant: 'secondary',
      className: 'bg-yellow-500 text-black'
    },
    duplicate: {
      icon: XCircle,
      label: '이미 존재',
      variant: 'destructive',
      className: 'bg-red-500 text-white'
    }
  }[status];

  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={config.className}>
      <Icon className="mr-1 h-3 w-3" />
      {config.label}
    </Badge>
  );
}
```

---

## 7. 구현 단계

### Phase 1: 기본 구조 설정
- [ ] Admin 레이아웃에 탭 추가 (`layout.tsx`)
- [ ] `/admin/bulk` 페이지 생성
- [ ] 필요한 shadcn/ui 컴포넌트 설치 (Tabs, DataTable 등)

### Phase 2: 네이버 검색 API 연동
- [ ] `/api/admin/search-places` Route Handler 생성
- [ ] 네이버 API 호출 로직 구현
- [ ] HTML 태그 제거 유틸 함수
- [ ] 좌표 변환 로직 (KATECH → WGS84)
- [ ] `useNaverSearch` 훅 구현

### Phase 3: 중복 체크 시스템
- [ ] `duplicate-checker.ts` 유틸 구현
- [ ] 2단계 중복 체크 로직 (완전 중복 + 같은 주소)
- [ ] `useDuplicateCheck` 훅 구현
- [ ] 중복 상태 뱃지 컴포넌트
- [ ] 같은 주소 경고 툴팁 컴포넌트

### Phase 4: 검색 결과 UI
- [ ] `NaverSearchSection` 컴포넌트
- [ ] `SearchResultsTable` 컴포넌트
- [ ] 체크박스 선택 로직
- [ ] 전체 선택/해제 기능
- [ ] 상태별 필터링

### Phase 5: 벌크 저장
- [ ] `/api/admin/spots/bulk` POST 엔드포인트
- [ ] 벌크 INSERT 로직 (트랜잭션)
- [ ] 중복 재확인 로직
- [ ] 성공/실패 응답 처리
- [ ] 토스트 알림

### Phase 6: 기존 장소 관리
- [ ] `SpotManagementTable` 컴포넌트
- [ ] 필터링 UI (카테고리, 하이라이트, 소스)
- [ ] 정렬 옵션
- [ ] Pagination 구현

### Phase 7: 일괄 수정
- [ ] `/api/admin/spots/bulk` PATCH 엔드포인트
- [ ] `BulkEditDialog` 컴포넌트
- [ ] 일괄 작업 드롭다운
- [ ] 필드별 수정 로직
- [ ] 확인 다이얼로그

### Phase 8: Pagination
- [ ] shadcn/ui Pagination 컴포넌트 추가
- [ ] 페이징 로직 구현 (클라이언트 사이드)
- [ ] URL 쿼리 스트링 연동 (선택적)
- [ ] `/admin` 페이지에도 Pagination 적용

### Phase 9: 테스트 & 최적화
- [ ] 다양한 검색어로 테스트
- [ ] 중복 체크 엣지 케이스 테스트
- [ ] 벌크 작업 성능 테스트
- [ ] 에러 핸들링 보완
- [ ] 로딩 상태 개선

---

## 8. 주요 유틸 함수

### 8.1 HTML 태그 제거

```typescript
// src/lib/naver-api.ts
export function stripHtmlTags(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}
```

### 8.2 좌표 변환

```typescript
// src/lib/naver-api.ts
export function convertKatechToWgs84(mapx: string, mapy: string) {
  return {
    latitude: parseInt(mapy, 10) / 10_000_000,
    longitude: parseInt(mapx, 10) / 10_000_000
  };
}
```

### 8.3 중복 체크

```typescript
// src/lib/duplicate-checker.ts
import { supabase } from '@/lib/supabase/client';

export async function checkDuplicate(
  name: string,
  roadAddress: string
): Promise<DuplicateCheck> {
  // 1. 완전 중복 체크 (이름 + 주소)
  const { data: exactMatch } = await supabase
    .from('spots')
    .select('id, name, categories')
    .eq('name', name)
    .eq('address', roadAddress)
    .maybeSingle();

  if (exactMatch) {
    return {
      status: 'duplicate',
      existingSpots: [exactMatch]
    };
  }

  // 2. 같은 주소의 다른 장소들
  const { data: sameAddress } = await supabase
    .from('spots')
    .select('id, name, categories')
    .eq('address', roadAddress);

  if (sameAddress && sameAddress.length > 0) {
    return {
      status: 'warning',
      existingSpots: sameAddress
    };
  }

  return { status: 'new' };
}

export async function checkDuplicateBatch(
  items: Array<{ name: string; roadAddress: string }>
): Promise<DuplicateCheck[]> {
  return Promise.all(
    items.map(item => checkDuplicate(item.name, item.roadAddress))
  );
}
```

---

## 9. 에러 처리

### 9.1 네이버 API 에러

```typescript
// 429 Too Many Requests
{
  error: 'RATE_LIMIT_EXCEEDED',
  message: '일일 호출 한도를 초과했습니다. 내일 다시 시도해주세요.'
}

// 400 Bad Request
{
  error: 'INVALID_QUERY',
  message: '검색어는 2글자 이상 입력해주세요.'
}
```

### 9.2 벌크 저장 에러

```typescript
// 부분 실패
{
  success: true,
  inserted: 8,
  skipped: 2,
  errors: [
    {
      index: 3,
      name: '스타벅스 강남점',
      error: '이미 존재하는 장소입니다.'
    }
  ]
}
```

---

## 10. 보안 고려사항

### 10.1 인증

- Admin API는 모두 `src/app/admin/layout.tsx`의 Auth guard로 보호
- Supabase Auth 세션 확인 필수

### 10.2 RLS 정책

- 이미 구현된 RLS 정책 활용
- admin role 확인

### 10.3 Rate Limiting

- 네이버 API 호출 제한 대응
- 클라이언트 사이드에서 연속 호출 방지 (debounce)

---

## 11. 성능 최적화

### 11.1 인덱스 추가

```sql
-- 중복 체크 성능 최적화
CREATE INDEX idx_spots_name_address ON spots(name, address);
CREATE INDEX idx_spots_address ON spots(address);
```

### 11.2 벌크 INSERT 최적화

```typescript
// 한 번에 여러 행 INSERT
await supabase.from('spots').insert(spots);

// 트랜잭션 사용 (Supabase에서는 자동)
```

### 11.3 Pagination

- 클라이언트 사이드 페이징 (50개씩)
- 필요시 서버 사이드 페이징으로 전환

---

## 12. 향후 개선 사항

1. **네이버 카테고리 자동 매핑**
   - 네이버 카테고리 → 우리 카테고리 자동 변환
   - 예: "음식점>카페" → ["카페"]

2. **좌표 정확도 개선**
   - Geocoding API로 재검색하여 좌표 보정
   - 주소 정규화

3. **벌크 업로드 (CSV/JSON)**
   - 파일 업로드로 대량 등록
   - `docs/bulk-upload-spec.md` 참조

4. **이력 관리**
   - 누가 언제 추가/수정했는지 로그
   - `created_by`, `updated_by` 필드 추가

5. **중복 병합 기능**
   - 중복된 장소를 하나로 병합
   - 데이터 선택적 보존

---

## 부록

### A. 네이버 지역검색 API 제약사항

- **일일 호출 제한**: 25,000회
- **최대 display**: 5개 (공식 제한)
- **좌표계**: KATECH (변환 필요)
- **응답 시간**: 평균 200~500ms

### B. shadcn/ui 컴포넌트

추가로 설치할 컴포넌트:

```bash
npx shadcn@latest add tabs
npx shadcn@latest add data-table
npx shadcn@latest add dropdown-menu
npx shadcn@latest add tooltip
npx shadcn@latest add pagination
```

### C. TypeScript 타입 정의

```typescript
// src/types/admin.ts
export interface NaverPlaceItem {
  title: string;
  category: string;
  telephone: string;
  address: string;
  roadAddress: string;
  mapx: string;
  mapy: string;
  link: string;
}

export interface SearchResultItem extends NaverPlaceItem {
  cleanName: string;
  latitude: number;
  longitude: number;
  duplicateStatus: 'new' | 'warning' | 'duplicate';
  existingSpots?: Array<{
    id: string;
    name: string;
    categories: string[];
  }>;
}

export interface DuplicateCheck {
  status: 'new' | 'warning' | 'duplicate';
  existingSpots?: Array<{
    id: string;
    name: string;
    categories: string[];
  }>;
}

export interface BulkInsertRequest {
  spots: Array<{
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    phone?: string;
    extra_data: {
      naver_category: string;
      naver_link: string;
    };
  }>;
}

export interface BulkUpdateRequest {
  spotIds: string[];
  updates: {
    is_highlighted?: boolean;
    categories?: {
      action: 'add' | 'remove';
      values: string[];
    };
    operating_hours?: Record<string, string>;
    description?: string;
    phone?: string;
  };
}
```

---

**문서 끝**
