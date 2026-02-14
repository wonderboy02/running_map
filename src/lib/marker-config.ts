/**
 * marker-config.ts — 마커 아이콘 설정 (PNG 기반)
 *
 * ┌─ 구조 ──────────────────────────────────────────────┐
 * │ 1. 사이즈   BASE_SIZES (공통) + CATEGORY_SIZES (오버라이드) │
 * │ 2. 이미지   SPOT_IMAGES (카테고리별) + COURSE_IMAGES        │
 * │ 3. 캡션     CAPTION_* 상수 + truncateName, escapeHtml       │
 * │ 4. 헬퍼     buildCaptionedIcon, buildPngIcon                │
 * │ 5. 프리로드  preloadMarkerImages                            │
 * │ 6. 공개 API  getSpotMarkerIcon / getCoursePinIcon /         │
 * │              getSearchPinIcon                               │
 * └─────────────────────────────────────────────────────┘
 *
 * 사이즈 규칙:
 *  - 모든 PNG 마커는 BASE_SIZES (default 20×20, selected 25×36) 적용
 *  - 특정 카테고리만 다르면 CATEGORY_SIZES에 오버라이드 등록
 *  - 검색 핀은 CSS 기반이므로 인라인 사이즈 사용
 *
 * 캡션 규칙:
 *  - name이 있으면 buildCaptionedIcon → 이미지 아래 텍스트
 *  - name이 없으면 bare 이미지만 반환
 */
import { CATEGORIES, type Category } from '@/types';

// ─── 마커 크기/앵커 설정 ──────────────────────────────
// 원형(default): 앵커 = 중앙, 핀형(selected): 앵커 = 중앙 하단
interface MarkerSize {
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
}

/** 전 마커 공통 기본 사이즈 (원본의 약 1/4) */
const BASE_SIZES = {
  default:  { width: 20, height: 20, anchorX: 10, anchorY: 10 },
  selected: { width: 25, height: 36, anchorX: 13, anchorY: 36 },
} satisfies Record<string, MarkerSize>;

// ─── 마커 이미지 경로 ────────────────────────────────
// 스팟·코스 모두 { default, selected } 형태로 통일
const SPOT_IMAGES: Record<Category, { default: string; selected: string }> = {
  러너스팟: {
    default: '/markers/runner-default.png',
    selected: '/markers/runner-selected.png',
  },
  샤워: {
    default: '/markers/shower-default.png',
    selected: '/markers/shower-selected.png',
  },
  짐보관: {
    default: '/markers/locker-default.png',
    selected: '/markers/locker-selected.png',
  },
};

const COURSE_IMAGES = {
  default: '/markers/course-default.png',
  selected: '/markers/course-selected.png',
};

// ─── 카테고리별 사이즈 오버라이드 ─────────────────────
// BASE_SIZES와 다른 카테고리만 등록
const CATEGORY_SIZES: Partial<Record<Category, { default: MarkerSize; selected: MarkerSize }>> = {
  러너스팟: {
    default:  { width: 30, height: 30, anchorX: 15, anchorY: 15 },  // 기본의 150%
    selected: { width: 38, height: 54, anchorX: 19, anchorY: 54 },  // 기본의 150%
  },
};

/** 코스 마커 사이즈 (러너스팟과 동일, 기본의 120%) */
const COURSE_SIZES = {
  default:  { width: 24, height: 24, anchorX: 12, anchorY: 12 },
  selected: { width: 30, height: 43, anchorX: 15, anchorY: 43 },
} satisfies Record<string, MarkerSize>;

// ─── 캡션 설정 ──────────────────────────────────────
const CAPTION_MAX_CHARS = 14;
const CAPTION_FONT_SIZE = 10;
const CAPTION_LINE_HEIGHT = 13;
const CAPTION_MAX_LINES = 2;
export const CAPTION_HEIGHT = CAPTION_LINE_HEIGHT * CAPTION_MAX_LINES; // 26px (2줄)
export const CAPTION_CONTAINER_WIDTH = 70;

function truncateName(name: string): string {
  return name.length > CAPTION_MAX_CHARS
    ? name.slice(0, CAPTION_MAX_CHARS) + '…'
    : name;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const CAPTION_TEXT_SHADOW =
  '-0.5px -0.5px 0 #fff,0.5px -0.5px 0 #fff,-0.5px 0.5px 0 #fff,0.5px 0.5px 0 #fff,0 -0.5px 0 #fff,0 0.5px 0 #fff,-0.5px 0 0 #fff,0.5px 0 0 #fff';

// ─── 내부 헬퍼 ──────────────────────────────────────

/** 캡션이 달린 아이콘 컨테이너 생성 */
function buildCaptionedIcon(
  innerHtml: string,
  name: string,
  innerAnchorY: number,
): naver.maps.HtmlIcon {
  const caption = escapeHtml(truncateName(name));
  const containerW = CAPTION_CONTAINER_WIDTH;
  const containerH = innerAnchorY * 2 + 2 + CAPTION_HEIGHT;

  const content = `<div style="display:flex;flex-direction:column;align-items:center;width:${containerW}px;">`
    + innerHtml
    + `<span style="margin-top:2px;font-size:${CAPTION_FONT_SIZE}px;line-height:${CAPTION_LINE_HEIGHT}px;font-weight:600;color:#000;text-align:center;max-width:${containerW}px;word-break:keep-all;overflow:hidden;display:-webkit-box;-webkit-line-clamp:${CAPTION_MAX_LINES};-webkit-box-orient:vertical;text-shadow:${CAPTION_TEXT_SHADOW};">`
    + caption
    + `</span></div>`;

  return {
    content,
    size: new naver.maps.Size(containerW, containerH),
    anchor: new naver.maps.Point(containerW / 2, innerAnchorY),
  };
}

/** PNG img 태그 → name 유무에 따라 bare / captioned 아이콘 반환 */
function buildPngIcon(imgSrc: string, size: MarkerSize, name?: string): naver.maps.HtmlIcon {
  const imgHtml = `<img src="${imgSrc}" width="${size.width}" height="${size.height}" style="display:block;" alt="" />`;

  if (!name) {
    return {
      content: imgHtml,
      size: new naver.maps.Size(size.width, size.height),
      anchor: new naver.maps.Point(size.anchorX, size.anchorY),
    };
  }

  return buildCaptionedIcon(imgHtml, name, size.anchorY);
}

// ─── 프리로드 ───────────────────────────────────────

let _preloaded = false;

/** 모든 마커 PNG를 브라우저 캐시에 미리 로드 */
export function preloadMarkerImages(): void {
  if (_preloaded || typeof window === 'undefined') return;
  _preloaded = true;

  const allImages = [
    ...Object.values(SPOT_IMAGES).flatMap(({ default: d, selected: s }) => [d, s]),
    COURSE_IMAGES.default,
    COURSE_IMAGES.selected,
  ];
  allImages.forEach((src) => { new Image().src = src; });
}

// ─── 공개 API ────────────────────────────────────────

/**
 * 스팟 마커 아이콘 반환
 * @param categories - 스팟의 카테고리 배열 (CATEGORIES 우선순위: 러너스팟 > 샤워 > 짐보관)
 * @param isSelected - 현재 선택된 마커인지
 * @param name - 스팟 이름 (캡션으로 표시)
 */
export function getSpotMarkerIcon(
  categories: string[],
  isSelected: boolean,
  name?: string,
): naver.maps.HtmlIcon {
  const category = CATEGORIES.find((c) => categories.includes(c)) ?? '러너스팟';
  const state = isSelected ? 'selected' : 'default';
  const images = SPOT_IMAGES[category] ?? SPOT_IMAGES['러너스팟'];
  const size = CATEGORY_SIZES[category]?.[state] ?? BASE_SIZES[state];

  return buildPngIcon(images[state], size, name);
}

/** 코스 핀 아이콘 (PNG 기반 + 캡션) */
export function getCoursePinIcon(isSelected = false, name?: string): naver.maps.HtmlIcon {
  const state = isSelected ? 'selected' : 'default';
  const size = COURSE_SIZES[state];

  return buildPngIcon(COURSE_IMAGES[state], size, name);
}

/** 검색 결과 핀 아이콘 — 브랜드 컬러 원형 (기본 마커의 60%) + 캡션 */
export function getSearchPinIcon(name?: string): naver.maps.HtmlIcon {
  const dotSize = 12;
  const dotHtml = `<div style="width:${dotSize}px;height:${dotSize}px;border-radius:50%;background:#152558;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`;

  if (!name) {
    return {
      content: dotHtml,
      size: new naver.maps.Size(dotSize, dotSize),
      anchor: new naver.maps.Point(dotSize / 2, dotSize / 2),
    };
  }

  return buildCaptionedIcon(dotHtml, name, dotSize / 2);
}
