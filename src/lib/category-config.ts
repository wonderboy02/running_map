/**
 * 카테고리 배지 스타일 설정
 * 토큰: globals.css Tier 3 (cat-runner, cat-shower, cat-locker)
 */

export const CATEGORY_BADGE_STYLES: Record<string, string> = {
  러너스팟: 'bg-cat-runner-muted text-cat-runner-foreground border-cat-runner-border',
  샤워: 'bg-cat-shower-muted text-cat-shower-foreground border-cat-shower-border',
  짐보관: 'bg-cat-locker-muted text-cat-locker-foreground border-cat-locker-border',
};

export const DEFAULT_BADGE_STYLE =
  'bg-surface-dim text-text-secondary border-border';

export function getCategoryBadgeStyle(category: string): string {
  return CATEGORY_BADGE_STYLES[category] ?? DEFAULT_BADGE_STYLE;
}
