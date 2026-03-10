# Design System — 색상 토큰 컨벤션

## 1. 개요

이 프로젝트는 Tailwind CSS v4의 `@theme inline {}` 블록에서 CSS 커스텀 프로퍼티로 색상 토큰을 관리합니다.
토큰은 **3-Tier** 구조로 분류됩니다.

| Tier | 역할 | 수정 가능 여부 |
|------|------|----------------|
| **Tier 1** | shadcn/ui 코어 (`primary`, `secondary`, `muted`, `accent`, `destructive`, …) | 수정 금지 |
| **Tier 2** | 앱 시맨틱 토큰 (`surface`, `text`, `highlight`, `naver`, `course`, …) | 자유 수정 |
| **Tier 3** | 카테고리 토큰 — Placeholder (`cat-runner`, `cat-shower`, `cat-locker`, `cat-course`) | 카테고리 개편 시 수정 |

### Tailwind v4 `@theme` 작동 방식

```css
@theme inline {
  --color-naver: oklch(0.726 0.213 155.766);
}
```

위와 같이 선언하면 `bg-naver`, `text-naver`, `border-naver` 등 Tailwind 유틸리티가 자동으로 생성됩니다.
`inline` 키워드는 사용하지 않는 값도 CSS에 항상 포함시킵니다 (JS에서 `var(--color-naver)` 접근 가능).

---

## 2. 토큰 레퍼런스

### Tier 1: shadcn/ui (수정 금지)

`primary`, `primary-foreground`, `secondary`, `muted`, `accent`, `destructive`, `background`, `foreground`, `card`, `popover`, `input`, `ring`, `chart-1~5`, `sidebar-*`

### Tier 2: 앱 시맨틱

| 그룹 | 토큰 | Tailwind 클래스 | 용도 |
|------|------|-----------------|------|
| **Primary** | `primary` | `bg-primary`, `text-primary` | 메인 액션, 링크 |
| | `primary-hover` | `hover:bg-primary-hover` | primary hover 상태 |
| **Surface** | `surface` | `bg-surface` | 카드, 패널 배경 |
| | `surface-dim` | `bg-surface-dim` | 비활성 배경, placeholder 영역 |
| **Text** | `text` | `text-text` | 제목, 본문 (가장 진한 텍스트) |
| | `text-secondary` | `text-text-secondary` | 부제목, 설명, 아이콘 |
| | `text-muted` | `text-text-muted` | placeholder, disabled, 비활성 아이콘 |
| **Border** | `border` | `border-border` | 기본 테두리 |
| | `border-strong` | `border-border-strong` | 강조 테두리, hover 테두리 |
| **Highlight** | `highlight` | `bg-highlight` | 추천 마커 |
| | `highlight-foreground` | `text-highlight-foreground` | 추천 배지 텍스트 |
| | `highlight-muted` | `bg-highlight-muted` | 추천 배지 배경 |
| | `highlight-border` | `border-highlight-border` | 추천 배지 테두리 |
| **Success** | `success` | `text-success` | 활성/성공 상태 텍스트 |
| | `success-muted` | `bg-success-muted` | 성공 배경 |
| **Warning** | `warning` | `text-warning` | 경고 텍스트 |
| | `warning-muted` | `bg-warning-muted` | 경고 배경 |
| **Info** | `info-muted` | `bg-info-muted` | 정보 배경 (blue-50) |
| | `info-border` | `border-info-border` | 정보 테두리 (blue-200) |
| **Course** | `course` | `text-course` | 코스 아이콘/텍스트 (Tier 3에 `cat-course` 계열도 참조) |
| **External** | `naver` | `bg-naver` | 네이버 지도 버튼 |
| | `naver-hover` | `hover:bg-naver-hover` | 네이버 버튼 hover |
| **Locker size** | `locker-sm` | `text-locker-sm` | 짐보관 소형 배지 텍스트 |
| | `locker-sm-muted` | `bg-locker-sm-muted` | 짐보관 소형 배지 배경 |
| | `locker-md` | `text-locker-md` | 짐보관 중형 배지 텍스트 |
| | `locker-md-muted` | `bg-locker-md-muted` | 짐보관 중형 배지 배경 |
| | `locker-lg` | `text-locker-lg` | 짐보관 대형 배지 텍스트 |
| | `locker-lg-muted` | `bg-locker-lg-muted` | 짐보관 대형 배지 배경 |
| **Marker** | — | PNG 기반 | `marker-config.ts`에서 관리 (CSS 토큰 없음) |

### Tier 3: 카테고리 (Placeholder)

| 카테고리 | foreground | muted | border |
|----------|-----------|-------|--------|
| 러너스팟 | `cat-runner-foreground` | `cat-runner-muted` | `cat-runner-border` |
| 샤워 | `cat-shower-foreground` | `cat-shower-muted` | `cat-shower-border` |
| 짐보관 | `cat-locker-foreground` | `cat-locker-muted` | `cat-locker-border` |
| 러닝코스 | `cat-course-foreground` | `cat-course-muted` | `cat-course-border` |

카테고리 배지 스타일은 `src/lib/category-config.ts`에서 관리합니다.

---

## 3. 텍스트 계층 가이드

```
text-text            → 제목, 본문 (가장 진함)
text-text-secondary  → 부제목, 설명, 주소, 아이콘
text-text-muted      → placeholder, disabled, 비활성 아이콘
```

shadcn/ui의 `text-muted-foreground`와 앱 토큰의 `text-text-secondary`는 유사한 역할이지만,
**앱 컴포넌트에서는 `text-text-secondary`를 우선 사용**합니다. shadcn/ui 내부 컴포넌트는 그대로 `muted-foreground`를 사용합니다.

---

## 4. 색상 사용 Do / Don't

| Do | Don't |
|----|-------|
| `bg-surface-dim` | `bg-gray-50`, `bg-gray-100` |
| `text-text` | `text-gray-900` |
| `text-text-secondary` | `text-gray-500`, `text-gray-600`, `text-gray-700` |
| `text-text-muted` | `text-gray-400` |
| `border-border` | `border-gray-200` |
| `border-border-strong` | `border-gray-300` |
| `bg-primary` | `bg-blue-600` |
| `bg-naver hover:bg-naver-hover` | `bg-[#03C75A] hover:bg-[#02b350]` |
| `text-course` | `text-emerald-600` |
| `bg-highlight-muted text-highlight-foreground` | `bg-amber-500/10 text-amber-700` |
| `bg-info-muted border-info-border` | `bg-blue-50 border-blue-200` |
| `divide-border` | `divide-gray-200` |
| `getCategoryBadgeStyle(cat)` | 컴포넌트 내 `CATEGORY_BADGE_COLORS` 인라인 정의 |

### 예외 허용

- **Admin 내부 상태 배지** (green/red/yellow 등 1회성 상태 표시): Tailwind 팔레트 직접 사용 가능
- **shadcn/ui 내부 컴포넌트**: 토큰 수정 불필요

---

## 5. 카테고리 토큰

현재 카테고리(러너스팟, 샤워, 짐보관)는 **Placeholder**입니다.
카테고리가 변경될 때:

1. `globals.css` Tier 3 섹션에서 토큰 추가/수정
2. `src/lib/category-config.ts`의 `CATEGORY_BADGE_STYLES` 업데이트
3. `src/lib/marker-config.ts`의 색상 매핑 업데이트
4. `globals.css`의 마커 CSS 클래스 추가/수정

---

## 6. 마커 아이콘

마커는 **PNG 이미지 기반** (`marker-config.ts`)으로 관리되며, CSS 토큰은 사용하지 않습니다.
자세한 컨벤션은 `CLAUDE.md`의 "마커 아이콘 컨벤션" 섹션 참조.

---

## 7. 새 토큰 추가 체크리스트

1. `src/styles/globals.css` `@theme inline {}` 블록에 `--color-*` 추가
2. oklch 색공간 사용 (hex → oklch 변환)
3. 적절한 Tier에 배치하고 주석으로 hex 값 표기
4. 이 문서의 토큰 레퍼런스 테이블에 추가
5. 마커 관련이면 `marker-config.ts`의 `SPOT_IMAGES` / `CATEGORY_SIZES` 업데이트
6. 카테고리 관련이면 `category-config.ts`에도 스타일 추가
