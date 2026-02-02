'use client';

import { CATEGORIES } from '@/types';
import { Badge } from '@/components/ui/badge';

interface FilterChipsProps {
  activeFilters: string[];
  onToggle: (category: string) => void;
}

export default function FilterChips({ activeFilters, onToggle }: FilterChipsProps) {
  return (
    <div className="border-border bg-surface z-10 border-b">
      <div className="scrollbar-none flex gap-2 overflow-x-auto px-4 py-2">
        {CATEGORIES.map((category) => {
          const isActive = activeFilters.includes(category);
          return (
            <Badge
              key={category}
              variant={isActive ? 'default' : 'outline'}
              className={`flex-shrink-0 cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                isActive ? 'bg-primary text-white hover:bg-primary-dark' : ''
              }`}
              onClick={() => onToggle(category)}
            >
              {category}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
