const CATEGORY_COLORS: Record<string, string> = {
  짐보관: '#3b82f6', // blue
  샤워실: '#06b6d4', // cyan
  탈의실: '#8b5cf6', // violet
  락커: '#10b981', // emerald
  카페: '#f59e0b', // amber
};

const CATEGORY_CSS_CLASSES: Record<string, string> = {
  짐보관: 'marker-category-locker',
  샤워실: 'marker-category-shower',
  탈의실: 'marker-category-changing',
  락커: 'marker-category-storage',
  카페: 'marker-category-cafe',
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
