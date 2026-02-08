# 카테고리 & UI 개선 스펙 (v0.3)

## 📋 개요

러닝 스팟 지도 서비스의 카테고리 체계를 단순화하고, 사용자 경험을 개선하기 위한 UI 변경사항을 정의합니다.

**목표:**
- 카테고리를 3개로 단순화하여 직관적인 필터링 제공
- 네이버 지도 연동으로 사용자 편의성 향상
- 분류별로 차별화된 정보 표시

**작업 버전:** v0.3
**작성일:** 2026-02-06

---

## 🎯 주요 변경사항

### 1. 카테고리 단순화

#### 기존 (5개)
```typescript
["짐보관", "샤워실", "탈의실", "락커", "카페"]
```

#### 변경 (3개)
```typescript
["러너스팟", "샤워", "짐보관"]
```

**분류 정의:**
- **러너스팟**: **여러 서비스를 제공하는 종합 공간** (다중 카테고리 보유, 예: ["러너스팟", "샤워", "짐보관"])
  - 약 10개 정도만 존재
  - 사진, 상세 설명 포함
  - 사진 없을 경우 placeholder 표시
- **샤워**: 샤워 시설만 제공 (단일 카테고리)
- **짐보관**: 짐 보관 서비스만 제공 (단일 카테고리)

**데이터 처리:**
- ⚠️ 기존 모든 데이터 삭제 (`TRUNCATE spots`)
- 새로운 카테고리 체계로 재입력

---

### 2. 필터 UI 변경 (Glassmorphism Floating Chips)

#### 디자인 컨셉: "떠있는 카테고리 필터"
- **위치**: 지도 상단 중앙 (`absolute top-4`)
- **스타일**: Glassmorphism (backdrop-blur + semi-transparent)
- **애니메이션**: Stagger entrance (순차 등장)
- **인터랙션**:
  - 체크박스 스타일 (다중 선택)
  - 활성 시: 그라디언트 배경 + 체크 아이콘 + scale(1.05)
  - 비활성 시: 흰색 배경 (bg-white/90)
- **기본 선택**: "러너스팟" 자동 선택
- **아이콘**: 이모지 사용 (🏃 러너스팟, 🚿 샤워, 🎒 짐보관)

**구현:**
```tsx
// Glassmorphism + Shadow
backdrop-blur-xl
bg-white/90
border border-white/20
shadow-lg shadow-black/10

// Active state gradient
bg-gradient-to-br from-orange-500 to-orange-600  // 러너스팟
bg-gradient-to-br from-cyan-500 to-cyan-600      // 샤워
bg-gradient-to-br from-purple-500 to-purple-600  // 짐보관
```

---

### 3. 네이버 지도 연동

#### Primary Action 버튼
Bottom Sheet와 상세 페이지의 **메인 액션**은 "네이버 지도로 이동"

**버튼 우선순위:**
1. **Primary**: "네이버 지도에서 보기" (Naver Green #03C75A)
2. **Secondary**: "상세 정보" (Outline)

#### URI 스키마 & 모바일 감지

```typescript
function openNaverMap(spot: Spot) {
  const { latitude, longitude, name } = spot;
  const encodedName = encodeURIComponent(name);
  const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);

  if (isMobile) {
    // Try deep link (nmap://)
    const appUrl = `nmap://place?lat=${latitude}&lng=${longitude}&name=${encodedName}`;
    window.location.href = appUrl;

    // Fallback to web after 1s
    setTimeout(() => {
      window.open(
        `https://map.naver.com/v5/search/${encodedName}?c=${longitude},${latitude},15,0,0,0,dh`,
        '_blank'
      );
    }, 1000);
  } else {
    // Desktop: direct web link
    window.open(
      `https://map.naver.com/v5/search/${encodedName}?c=${longitude},${latitude},15,0,0,0,dh`,
      '_blank'
    );
  }
}
```

#### 버튼 디자인

**네이버 브랜드 컬러:**
```css
background: #03C75A;  /* Naver Green */
hover:background: #02b350;
shadow: 0 4px 14px rgba(3, 199, 90, 0.2);
```

**아이콘**: 쉴드 아이콘 (보안/공식 느낌) + ExternalLink

---

### 4. Bottom Sheet 구성 (3가지 케이스)

#### 케이스 1: 러너스팟 + 사진 있음
**헤더:**
- 사진 갤러리 (가로 스크롤, snap-x)
- 사진 개수 표시 (우측 하단, 예: "1/3")

**콘텐츠:**
1. Drag handle (상단 중앙)
2. 제목 + 추천 배지
3. 주소 (MapPin 아이콘)
4. 카테고리 배지 (컬러별 구분)
5. 상세 정보 (회색 박스)
6. 액션 버튼:
   - **Primary**: "네이버 지도에서 보기" (Green, shadow 강조)
   - **Secondary**: "상세 정보" (Outline)

#### 케이스 2: 러너스팟 + 사진 없음
**헤더:**
- 그라디언트 placeholder (h-48)
- 이모지 중앙 배치 (🏃 + "러너스팟" 텍스트)
- 배경: `bg-gradient-to-br from-orange-400 to-orange-600`

**콘텐츠:** 케이스 1과 동일

#### 케이스 3: 샤워/짐보관 (사진 없음)
**헤더:**
- 미니멀 컬러 라인 (h-2)
- 배경: `bg-gradient-to-r from-cyan-500 to-purple-500`

**콘텐츠:**
1. Drag handle
2. 제목 + 추천 배지 (있을 경우)
3. 주소
4. 카테고리 배지
5. 상세 정보
6. 액션 버튼 (동일)

**조건부 렌더링:**
```typescript
const isRunnerSpot = spot.categories.includes('러너스팟');
const hasPhotos = spot.photos && spot.photos.length > 0;

// 3가지 헤더 분기
{isRunnerSpot && hasPhotos && <PhotoGallery />}
{isRunnerSpot && !hasPhotos && <GradientPlaceholder />}
{!isRunnerSpot && <MinimalColorLine />}
```

---

## 📁 변경 파일 목록

### 1. 타입 정의
**파일:** `src/types/index.ts`
```typescript
export const CATEGORIES = [
  "러너스팟",
  "샤워",
  "짐보관",
] as const;
```

### 2. 마커 설정
**파일:** `src/lib/marker-config.ts`
```typescript
const CATEGORY_COLORS: Record<string, string> = {
  러너스팟: '#FF6B35',  // Vibrant Orange (하이라이트 #FFB703와 구분)
  샤워: '#00B4D8',      // Fresh Cyan
  짐보관: '#7209B7',    // Bold Purple
};

const CATEGORY_CSS_CLASSES: Record<string, string> = {
  러너스팟: 'marker-category-runner',
  샤워: 'marker-category-shower',
  짐보관: 'marker-category-locker',
};
```

**하이라이트 마커:**
- 색상: `#FFB703` (Amber) - 기존 유지
- 러너스팟 마커와 구분됨

### 3. 필터 칩
**파일:** `src/components/FilterChips.tsx`
- 배경 투명 처리
- border-b 제거
- 스타일 조정

### 4. Bottom Sheet
**파일:** `src/components/SpotCard.tsx`
- "네이버 지도에서 보기" 버튼 추가
- 조건부 사진 표시 (러너스팟만)

### 5. 상세 페이지
**파일:** `src/app/spot/[id]/page.tsx`
- "네이버 지도에서 보기" 버튼 추가
- 조건부 사진 표시 (러너스팟만)

### 6. 메인 페이지
**파일:** `src/app/page.tsx`
- 필터 초기값: `['러너스팟']`

### 7. 유틸리티 함수 (신규)
**파일:** `src/lib/naver-map-utils.ts`
```typescript
export function openNaverMap(spot: Spot): void;
```

---

## 🗄️ 데이터 마이그레이션

### Supabase SQL Migration

**파일:** `supabase/migrations/004_reset_and_update_categories.sql`

```sql
-- ⚠️ 경고: 기존 모든 데이터를 삭제합니다
TRUNCATE TABLE spots RESTART IDENTITY CASCADE;

-- 샘플 데이터 삽입 (테스트용)
INSERT INTO spots (
  name, address, latitude, longitude, categories,
  is_highlighted, description, phone, photos, operating_hours, extra_data
) VALUES
  -- 러너스팟 (다중 카테고리 + 사진)
  (
    '러너스 베이스 강남',
    '서울 강남구 테헤란로 123',
    37.5012, 127.0396,
    ARRAY['러너스팟', '샤워', '짐보관'],
    true,
    '강남 최대 규모의 러닝 커뮤니티 공간. 샤워실, 락커, 카페 모두 이용 가능합니다.',
    '02-1234-5678',
    ARRAY['https://picsum.photos/800/600?random=1'],
    '{"mon": "06:00-22:00"}'::jsonb,
    '{}'::jsonb
  ),
  -- 샤워 전용 (단일 카테고리, 사진 없음)
  (
    '24시 샤워장 역삼',
    '서울 강남구 역삼동 456',
    37.5001, 127.0365,
    ARRAY['샤워'],
    false,
    '24시간 운영되는 샤워 전용 시설입니다.',
    '02-9876-5432',
    ARRAY[]::text[],
    '{"mon": "24시간"}'::jsonb,
    '{}'::jsonb
  );
```

**주의사항:**
- ⚠️ **TRUNCATE**: 기존 모든 데이터 삭제 (복구 불가)
- 프로덕션 배포 전 백업 필수
- 실제 데이터는 Admin 페이지에서 재입력

---

## 🎨 CSS 변경사항

### globals.css

**마커 클래스 업데이트:**
```css
/* 기존 클래스 삭제 */
.marker-category-changing,
.marker-category-storage,
.marker-category-cafe {
  /* 삭제 */
}

/* 새 카테고리 마커 */
.marker-category-runner {
  background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%);
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
}

.marker-category-shower {
  background: linear-gradient(135deg, #00B4D8 0%, #0096C7 100%);
  box-shadow: 0 4px 12px rgba(0, 180, 216, 0.3);
}

.marker-category-locker {
  background: linear-gradient(135deg, #7209B7 0%, #560BAD 100%);
  box-shadow: 0 4px 12px rgba(114, 9, 183, 0.3);
}

/* 하이라이트 (기존 유지) */
.marker-highlight {
  background: linear-gradient(135deg, #FFB703 0%, #FB8500 100%);
  box-shadow: 0 6px 16px rgba(255, 183, 3, 0.4);
}
```

**필터 칩 애니메이션:**
```css
@keyframes slideInFromTop {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
```

---

## ✅ 테스트 체크리스트

### 1. 필터링
- [ ] "러너스팟" 기본 선택 확인
- [ ] 다중 선택 동작 확인
- [ ] 필터 배경 투명 확인
- [ ] 모든 카테고리 조합 테스트

### 2. 마커 표시
- [ ] 카테고리별 색상 확인
- [ ] 하이라이트 마커 동작 확인

### 3. Bottom Sheet
- [ ] 러너스팟: 사진 표시 확인
- [ ] 샤워/짐보관: 사진 미표시 확인
- [ ] "네이버 지도에서 보기" 버튼 동작 확인

### 4. 상세 페이지
- [ ] 러너스팟: 사진 갤러리 확인
- [ ] 샤워/짐보관: 사진 미표시 확인
- [ ] 네이버 지도 연동 확인

### 5. 네이버 지도 연동
- [ ] 모바일 앱 딥링크 동작 (앱 설치 시)
- [ ] 웹 fallback 동작 (앱 미설치 시)
- [ ] 좌표 정확도 확인

### 6. Admin
- [ ] 새 카테고리로 장소 추가 확인
- [ ] 기존 장소 카테고리 수정 확인
- [ ] 드롭다운에 새 카테고리 반영 확인

---

## 📚 참고 자료

### Naver Maps API
- **브랜드 가이드**: https://developers.naver.com/docs/maps/brand/
- **URI 스키마**: https://guide.ncloud-docs.com/docs/navermaps-android-v3-url
- **Web Dynamic Map**: https://navermaps.github.io/maps.js.ncp/docs/

### 모바일 딥링크
- **nmap URI 스키마**: `nmap://` 프로토콜
- **브라우저 지원**: iOS Safari, Android Chrome

---

## 🚀 배포 체크리스트

- [ ] DB 마이그레이션 수행
- [ ] 기존 데이터 재분류 완료
- [ ] CSS 빌드 확인
- [ ] 환경변수 설정 확인 (프로덕션)
- [ ] Vercel 배포
- [ ] 모바일 디바이스 테스트 (iOS/Android)
- [ ] 네이버 지도 연동 테스트
- [ ] CLAUDE.md 업데이트 (체크리스트 반영)
