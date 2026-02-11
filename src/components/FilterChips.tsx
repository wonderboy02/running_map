'use client';

import { CATEGORIES } from '@/types';
import { Check } from 'lucide-react';

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
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white/95 text-gray-700 border-gray-200 hover:bg-white hover:border-gray-300'
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
