'use client';

import { CATEGORIES } from '@/types';

const CHIP_ICONS: Record<string, string> = {
  러너스팟: '/icons/runner.png',
  샤워: '/icons/shower.png',
  짐보관: '/icons/locker.png',
};

const CHIP_ACTIVE_STYLES: Record<string, string> = {
  러너스팟: 'bg-cat-runner text-white border-cat-runner',
  샤워: 'bg-cat-shower text-white border-cat-shower',
  짐보관: 'bg-cat-locker text-white border-cat-locker',
};

const CHIP_INACTIVE =
  'bg-surface/95 text-text-secondary border-border hover:border-border-strong';

// 모듈 로드 시 즉시 프리로드 (깜빡임 방지)
if (typeof window !== 'undefined') {
  Object.values(CHIP_ICONS).forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}

interface FilterChipsProps {
  activeFilters: string[];
  onToggle: (category: string) => void;
}

export default function FilterChips({ activeFilters, onToggle }: FilterChipsProps) {
  return (
    <div className="absolute top-[48px] left-0 right-0 z-20 pointer-events-none">
      <div className="flex gap-2 justify-start pointer-events-auto overflow-x-auto scrollbar-none">
        <div className="flex-shrink-0 w-4" aria-hidden="true" />
        {CATEGORIES.map((category) => {
          const isActive = activeFilters.includes(category);
          const iconSrc = CHIP_ICONS[category];
          return (
            <button
              key={category}
              onClick={() => onToggle(category)}
              className={`
                flex-shrink-0 pl-2 pr-3 py-1 rounded-full
                backdrop-blur-md
                border
                shadow-sm
                transition-all duration-200
                flex items-center gap-1.5
                text-[clamp(13px,3.5vw,15px)] font-medium
                ${
                  isActive
                    ? CHIP_ACTIVE_STYLES[category] ?? 'bg-primary text-white border-primary'
                    : CHIP_INACTIVE
                }
              `}
            >
              {/* 16x16 정적 UI 아이콘 — next/image 대신 <img> 사용:
                  brightness-0 invert CSS filter 호환 + 최적화 실익 없음 */}
              {iconSrc && (
                <img
                  src={iconSrc}
                  alt=""
                  width={16}
                  height={16}
                  className={`
                    w-4 h-4 transition-[filter] duration-200
                    ${isActive ? 'brightness-0 invert' : ''}
                  `}
                />
              )}
              <span>{category}</span>
            </button>
          );
        })}
        <div className="flex-shrink-0 w-4" aria-hidden="true" />
      </div>
    </div>
  );
}
