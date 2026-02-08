# Changelog v0.3 - 카테고리 단순화 & UI 개선

**작업일:** 2026-02-06
**목표:** 사용자 경험 개선을 위한 카테고리 체계 단순화 및 모바일 UI 고도화

---

## 📝 주요 변경사항 요약

### 1️⃣ 카테고리 체계 단순화 (5개 → 3개)

**변경 전:**
```typescript
["짐보관", "샤워실", "탈의실", "락커", "카페"]
```

**변경 후:**
```typescript
["러너스팟", "샤워", "짐보관"]
```

**분류 기준:**
- **러너스팟**: 여러 서비스를 제공하는 종합 공간 (다중 카테고리)
  - 예: `["러너스팟", "샤워", "짐보관"]`
  - 약 10개 정도만 존재
  - 사진, 상세 정보 포함
- **샤워**: 샤워 시설만 제공 (단일 카테고리)
- **짐보관**: 짐 보관만 제공 (단일 카테고리)

---

### 2️⃣ 필터 UI - Glassmorphism Floating Chips

**디자인 컨셉:** 지도 위에 떠있는 반투명 필터

**주요 특징:**
- 지도 상단 중앙 배치 (`absolute top-4`)
- Glassmorphism 효과 (`backdrop-blur-xl`, `bg-white/90`)
- 이모지 아이콘 추가 (🏃 러너스팟, 🚿 샤워, 🎒 짐보관)
- 활성 상태: 그라디언트 배경 + 체크 아이콘 + scale 애니메이션
- Stagger entrance 애니메이션 (Framer Motion)
- 기본 선택: "러너스팟" 자동 활성화

**기술 스택:**
- Framer Motion (애니메이션)
- Lucide Icons (Check 아이콘)
- Tailwind CSS (glassmorphism, gradients)

---

### 3️⃣ Bottom Sheet - 3가지 케이스별 차별화

#### Case A: 러너스팟 + 사진 있음
- **헤더**: 사진 갤러리 (가로 스크롤, h-48)
- **사진 개수 표시**: 우측 하단 "1/3" 형태
- **콘텐츠**: 제목, 주소, 카테고리, 상세정보, 액션 버튼

#### Case B: 러너스팟 + 사진 없음
- **헤더**: 그라디언트 placeholder (orange gradient)
- **중앙**: 이모지 🏃 + "러너스팟" 텍스트
- **배경**: `from-orange-400 to-orange-600`

#### Case C: 샤워/짐보관 (사진 없음)
- **헤더**: 미니멀 컬러 라인 (h-2)
- **배경**: `from-cyan-500 to-purple-500`
- **콘텐츠**: 제목, 주소, 카테고리, 간단한 정보

**공통 요소:**
- Drag handle (상단 중앙)
- Spring 애니메이션 (부드러운 등장)
- 반응형 최대 높이 (`max-h-[85vh]`)

---

### 4️⃣ 네이버 지도 연동

**Primary Action 버튼:**
- **위치**: Bottom Sheet 하단 (가장 눈에 띄는 곳)
- **디자인**: Naver Green (#03C75A) + shadow 강조
- **아이콘**: 쉴드 + ExternalLink
- **텍스트**: "네이버 지도에서 보기"

**딥링크 로직:**
```typescript
// 모바일 환경 감지
isMobile → nmap://place (앱 딥링크)
        → 1초 후 map.naver.com (웹 fallback)

// 데스크톱 환경
직접 map.naver.com 새 탭 열기
```

**Secondary Action:**
- "상세 정보" 버튼 (Outline 스타일)
- 덜 강조된 디자인

---

### 5️⃣ 컬러 시스템 재정의

**카테고리별 컬러:**
```css
러너스팟: #FF6B35  (Vibrant Orange)
샤워:     #00B4D8  (Fresh Cyan)
짐보관:   #7209B7  (Bold Purple)
```

**시스템 컬러:**
```css
하이라이트: #FFB703  (Amber - 기존 유지)
네이버:     #03C75A  (Naver Brand Green)
```

**마커 스타일:**
- 그라디언트 배경
- Drop shadow (각 색상별 투명도)
- 하이라이트 마커와 구분됨

---

### 6️⃣ 데이터베이스 초기화

**파일:** `supabase/migrations/004_reset_and_update_categories.sql`

**작업 내용:**
- ⚠️ `TRUNCATE spots` - 기존 데이터 전체 삭제
- 샘플 데이터 5개 삽입:
  1. 러너스팟 + 사진 (Unsplash)
  2. 러너스팟 + 사진 없음
  3. 샤워 전용
  4. 짐보관 전용
  5. 샤워 추천 장소

---

## 🗂️ 수정된 파일 목록

### 신규 생성
- `docs/category-ui-update-spec.md` - 상세 스펙 문서
- `supabase/migrations/004_reset_and_update_categories.sql` - DB 마이그레이션

### 수정 예정 (구현 대기)
1. `src/types/index.ts` - CATEGORIES 변경
2. `src/lib/marker-config.ts` - 카테고리 색상 업데이트
3. `src/components/FilterChips.tsx` - Glassmorphism UI
4. `src/components/BottomSheet.tsx` - 3-case 조건부 렌더링
5. `src/components/SpotCard.tsx` - 네이버 지도 버튼 추가
6. `src/app/spot/[id]/page.tsx` - 상세 페이지 동일 로직
7. `src/app/page.tsx` - 기본 필터 "러너스팟" 설정
8. `src/styles/globals.css` - 마커 클래스 업데이트

---

## 🎨 디자인 철학

**컨셉:** "Runner's Energy" - Sporty Minimalism

**핵심 원칙:**
1. **명확성**: 정보 계층 구조 명확화 (Primary/Secondary 액션)
2. **활력**: 러닝의 에너지를 담은 생동감 있는 컬러
3. **효율성**: 빠른 정보 파악 → 즉각적인 행동 전환
4. **미니멀**: 불필요한 요소 제거, 핵심에 집중

**차별화 포인트:**
- Glassmorphism 필터 (지도 위 떠있는 느낌)
- 조건부 헤더 (3가지 케이스별 차별화)
- 네이버 지도 버튼 강조 (Primary Action)

---

## ✅ 다음 단계

### Phase 1: 구현
- [ ] 타입 정의 업데이트
- [ ] 마커 설정 변경
- [ ] FilterChips 리팩터링
- [ ] BottomSheet 리팩터링
- [ ] SpotCard 네이버 버튼 추가
- [ ] 상세 페이지 업데이트
- [ ] CSS 마커 클래스 수정

### Phase 2: 데이터 마이그레이션
- [ ] DB 백업 (프로덕션)
- [ ] SQL 마이그레이션 실행
- [ ] 샘플 데이터 확인

### Phase 3: 테스트
- [ ] 필터링 동작 확인
- [ ] Bottom Sheet 3가지 케이스 테스트
- [ ] 네이버 지도 딥링크 테스트 (모바일/데스크톱)
- [ ] 마커 색상 확인
- [ ] 애니메이션 부드러움 확인

### Phase 4: 배포
- [ ] Vercel 배포
- [ ] 실제 디바이스 테스트 (iOS/Android)
- [ ] 성능 체크
- [ ] 사용자 피드백 수집

---

## 📊 성과 지표 (예상)

**UX 개선:**
- 필터 선택 속도 ↑ (5개 → 3개 카테고리)
- 정보 파악 시간 ↓ (명확한 계층 구조)
- 네이버 지도 전환율 ↑ (Primary Action 강조)

**기술 부채 감소:**
- 카테고리 관리 복잡도 ↓
- 조건부 로직 명확화
- 일관된 디자인 시스템

---

## 🔗 관련 문서

- [상세 스펙](./category-ui-update-spec.md)
- [Naver Maps API 레퍼런스](./naver-maps-reference.md)
- [프로젝트 컨텍스트](../CLAUDE.md)
- [구현 가이드](../IMPLEMENTATION.md)

---

**작성자:** Claude Sonnet 4.5
**승인:** 대기 중
**상태:** 문서화 완료, 구현 대기
