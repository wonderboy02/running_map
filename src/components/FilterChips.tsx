'use client';

import { CATEGORIES } from '@/types';
import { Check } from 'lucide-react';

const CHIP_ACTIVE_STYLES: Record<string, string> = {
  러너스팟: 'bg-cat-runner text-white border-cat-runner',
  샤워: 'bg-cat-shower text-white border-cat-shower',
  짐보관: 'bg-cat-locker text-text border-cat-locker',
};

interface FilterChipsProps {
  activeFilters: string[];
  onToggle: (category: string) => void;
}

export default function FilterChips({ activeFilters, onToggle }: FilterChipsProps) {
  return (
    <div className="absolute top-[48px] left-0 right-0 z-20 px-4 pointer-events-none">
      <div className="flex gap-2 justify-start pointer-events-auto">
        {CATEGORIES.map((category) => {
          const isActive = activeFilters.includes(category);
          return (
            <button
              key={category}
              onClick={() => onToggle(category)}
              className={`
                px-4 py-1.5 rounded-xl
                backdrop-blur-md
                border
                shadow-sm
                transition-all duration-200
                flex items-center gap-1.5
                text-[clamp(13px,3.5vw,15px)] font-medium
                min-h-[40px]
                ${
                  isActive
                    ? CHIP_ACTIVE_STYLES[category] ?? 'bg-primary text-white border-primary'
                    : 'bg-surface/95 text-text-secondary border-border hover:bg-surface hover:border-border-strong'
                }
              `}
            >
              <span>{category}</span>
              {isActive && (
                <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
