"use client";

import { CATEGORIES } from "@/types";

interface FilterChipsProps {
  activeFilters: string[];
  onToggle: (category: string) => void;
}

export default function FilterChips({
  activeFilters,
  onToggle,
}: FilterChipsProps) {
  return (
    <div className="border-border bg-surface z-10 border-b">
      <div className="scrollbar-none flex gap-2 overflow-x-auto px-4 py-2">
        {CATEGORIES.map((category) => {
          const isActive = activeFilters.includes(category);
          return (
            <button
              key={category}
              onClick={() => onToggle(category)}
              className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-white"
                  : "bg-surface-dim text-text-secondary border-border border"
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>
    </div>
  );
}
