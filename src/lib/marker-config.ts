const CATEGORY_COLORS: Record<string, string> = {
  러너스팟: '#2563eb', // Blue (primary)
  샤워: '#64748b', // Slate
  짐보관: '#6b7280', // Gray
};

const CATEGORY_CSS_CLASSES: Record<string, string> = {
  러너스팟: 'marker-category-runner',
  샤워: 'marker-category-shower',
  짐보관: 'marker-category-locker',
};

const DEFAULT_COLOR = '#2563eb'; // primary blue
const HIGHLIGHT_COLOR = '#f59e0b'; // amber

export interface MarkerConfig {
  type: 'html' | 'image';
  size: { width: number; height: number };
  anchor: { x: number; y: number };
  color: string;
  cssClass: string;
  isHighlighted: boolean;
}

export function getCategoryColor(categories: string[]): string {
  if (categories.length === 0) return DEFAULT_COLOR;
  return CATEGORY_COLORS[categories[0]] ?? DEFAULT_COLOR;
}

export function getCategoryCssClass(categories: string[]): string {
  if (categories.length === 0) return 'marker-default';
  return CATEGORY_CSS_CLASSES[categories[0]] ?? '';
}

export function getMarkerConfig(isHighlighted: boolean, categories: string[]): MarkerConfig {
  if (isHighlighted) {
    return {
      type: 'html',
      size: { width: 44, height: 44 },
      anchor: { x: 22, y: 44 },
      color: HIGHLIGHT_COLOR,
      cssClass: 'marker-highlight',
      isHighlighted: true,
    };
  }

  const categoryClass = getCategoryCssClass(categories);
  const color = getCategoryColor(categories);

  return {
    type: 'html',
    size: { width: 32, height: 32 },
    anchor: { x: 16, y: 32 },
    color,
    cssClass: categoryClass ? `marker-default ${categoryClass}` : 'marker-default',
    isHighlighted: false,
  };
}

export function getMarkerIcon(
  isHighlighted: boolean,
  categories: string[]
): naver.maps.HtmlIcon {
  const config = getMarkerConfig(isHighlighted, categories);

  return {
    content: `<div class="${config.cssClass}"></div>`,
    size: new naver.maps.Size(config.size.width, config.size.height),
    anchor: new naver.maps.Point(config.anchor.x, config.anchor.y),
  };
}

export function createImageMarkerIcon(
  imageUrl: string,
  size: { width: number; height: number } = { width: 36, height: 36 }
): naver.maps.ImageIcon {
  return {
    url: imageUrl,
    size: new naver.maps.Size(size.width, size.height),
    scaledSize: new naver.maps.Size(size.width, size.height),
    anchor: new naver.maps.Point(size.width / 2, size.height),
  };
}
