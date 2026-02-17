import type { LockerSection } from '@/types';

/** 빈 라커 구역 생성 */
export function emptyLockerSection(): LockerSection {
  return {
    detail_address: null,
    locker_small: null,
    locker_medium: null,
    locker_large: null,
  };
}

/** 단일 구역의 라커 합계 */
export function sectionTotal(section: LockerSection): number {
  return (section.locker_small ?? 0) + (section.locker_medium ?? 0) + (section.locker_large ?? 0);
}

/** 모든 구역의 라커 합계 */
export function allSectionsTotal(sections: LockerSection[]): number {
  return sections.reduce((sum, s) => sum + sectionTotal(s), 0);
}

/** locker_sections에 유의미한 데이터가 있는지 판별 */
export function hasLockerData(sections: LockerSection[] | null): boolean {
  if (!sections || sections.length === 0) return false;
  return sections.some((s) => sectionTotal(s) > 0);
}

/** Supabase Json → LockerSection[] 안전 변환 (잘못된 데이터는 null 반환) */
export function parseLockerSections(raw: unknown): LockerSection[] | null {
  if (!Array.isArray(raw)) return null;
  if (raw.length === 0) return null;

  const sections: LockerSection[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) return null;
    const obj = item as Record<string, unknown>;
    sections.push({
      detail_address: typeof obj.detail_address === 'string' ? obj.detail_address : null,
      locker_small: typeof obj.locker_small === 'number' ? obj.locker_small : null,
      locker_medium: typeof obj.locker_medium === 'number' ? obj.locker_medium : null,
      locker_large: typeof obj.locker_large === 'number' ? obj.locker_large : null,
    });
  }
  return sections;
}
