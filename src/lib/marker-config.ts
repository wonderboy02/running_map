import type { Category } from '@/types';

// ─── 카테고리별 마커 이미지 경로 ─────────────────────
const MARKER_IMAGES: Record<Category, { default: string; selected: string }> = {
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

// ─── 마커 크기/앵커 설정 (원본의 절반) ───────────────
// 기본(원형 78x78 → 39x39): 앵커 = 중앙
// 선택(핀형 99x143 → 50x72): 앵커 = 중앙 하단
interface MarkerSize {
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
}

const MARKER_SIZES: Record<'default' | 'selected' | 'course' | 'search', MarkerSize> = {
  default:  { width: 20, height: 20, anchorX: 10, anchorY: 10 },
  selected: { width: 25, height: 36, anchorX: 13, anchorY: 36 },
  course:   { width: 20, height: 20, anchorX: 10, anchorY: 10 },
  search:   { width: 14, height: 19, anchorX: 7,  anchorY: 17 },
};

// ─── 캡션 설정 ──────────────────────────────────────
const CAPTION_MAX_CHARS = 14;
const CAPTION_FONT_SIZE = 10;
const CAPTION_LINE_HEIGHT = 13;
const CAPTION_MAX_LINES = 2;
const CAPTION_HEIGHT = CAPTION_LINE_HEIGHT * CAPTION_MAX_LINES; // 26px (2줄)
const CAPTION_CONTAINER_WIDTH = 70;

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

/** 마커 아이콘 HTML + 캡션 텍스트를 감싸는 컨테이너 생성 */
function buildCaptionedIcon(
  innerHtml: string,
  name: string,
  innerAnchorY: number,
): naver.maps.HtmlIcon {
  const caption = escapeHtml(truncateName(name));
  const containerW = CAPTION_CONTAINER_WIDTH;
  const containerH = innerAnchorY * 2 + 2 + CAPTION_HEIGHT; // rough height

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

// ─── 프리로드 ───────────────────────────────────────
// MARKER_IMAGES에 새 카테고리를 추가하면 자동으로 프리로드됩니다.
// 마커 외 별도 PNG(코스 아이콘, 로고 등)를 추가할 경우
// 아래 함수 내부에 `new Image().src = '경로'`를 추가하세요.

let _preloaded = false;

/** 모든 마커 PNG를 브라우저 캐시에 미리 로드 */
export function preloadMarkerImages(): void {
  if (_preloaded || typeof window === 'undefined') return;
  _preloaded = true;

  Object.values(MARKER_IMAGES).forEach(({ default: def, selected }) => {
    new Image().src = def;
    new Image().src = selected;
  });
}

// ─── 공개 API ────────────────────────────────────────

/**
 * 스팟 마커 아이콘 반환
 * @param categories - 스팟의 카테고리 배열 (첫 번째 카테고리 사용)
 * @param isHighlighted - 하이라이트 여부 (현재는 selected와 동일 취급)
 * @param isSelected - 현재 선택된 마커인지
 * @param name - 스팟 이름 (캡션으로 표시)
 */
export function getSpotMarkerIcon(
  categories: string[],
  isHighlighted: boolean,
  isSelected: boolean,
  name?: string,
): naver.maps.HtmlIcon {
  const category = (categories[0] ?? '러너스팟') as Category;
  const state = isSelected ? 'selected' : 'default';
  const images = MARKER_IMAGES[category] ?? MARKER_IMAGES['러너스팟'];
  const imgSize = MARKER_SIZES[state];

  // 캡션 없음: 이미지만 반환
  if (!name) {
    return {
      content: `<img src="${images[state]}" width="${imgSize.width}" height="${imgSize.height}" style="display:block;" alt="" />`,
      size: new naver.maps.Size(imgSize.width, imgSize.height),
      anchor: new naver.maps.Point(imgSize.anchorX, imgSize.anchorY),
    };
  }

  // 캡션 있음: 이미지 + 텍스트 컨테이너
  const imgHtml = `<img src="${images[state]}" width="${imgSize.width}" height="${imgSize.height}" style="display:block;" alt="" />`;
  return buildCaptionedIcon(imgHtml, name, imgSize.anchorY);
}

/** 코스 핀 아이콘 (목업 — 추후 디자인 교체) */
export function getCoursePinIcon(): naver.maps.HtmlIcon {
  const size = MARKER_SIZES.course;
  return {
    content: `<div style="display:flex;align-items:center;justify-content:center;width:${size.width}px;height:${size.height}px;border-radius:50%;background:#10b981;box-shadow:0 1px 4px rgba(16,185,129,0.4);"><div style="width:6px;height:6px;border-radius:50%;background:white;"></div></div>`,
    size: new naver.maps.Size(size.width, size.height),
    anchor: new naver.maps.Point(size.anchorX, size.anchorY),
  };
}

/** 검색 결과 핀 아이콘 — 브랜드 컬러 원형 (기본 마커의 60%) + 캡션 */
export function getSearchPinIcon(name?: string): naver.maps.HtmlIcon {
  const dotSize = 12; // 기본 마커(20)의 60%

  if (!name) {
    return {
      content: `<div style="width:${dotSize}px;height:${dotSize}px;border-radius:50%;background:#152558;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`,
      size: new naver.maps.Size(dotSize, dotSize),
      anchor: new naver.maps.Point(dotSize / 2, dotSize / 2),
    };
  }

  const dotHtml = `<div style="width:${dotSize}px;height:${dotSize}px;border-radius:50%;background:#152558;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`;
  return buildCaptionedIcon(dotHtml, name, dotSize / 2);
}
