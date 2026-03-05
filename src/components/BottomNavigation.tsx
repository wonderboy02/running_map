'use client';

import { Map, Compass, User } from 'lucide-react';

export const BOTTOM_NAV_HEIGHT = 56;

export default function BottomNavigation() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[35] flex items-center justify-around border-t border-border bg-surface"
      style={{ height: BOTTOM_NAV_HEIGHT }}
    >
      <button
        className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-text-muted pointer-events-none"
        aria-disabled="true"
        aria-label="탐색 (준비 중)"
      >
        <Compass className="h-5 w-5" />
        <span className="text-[10px]">탐색</span>
      </button>

      <button
        className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-primary"
        aria-label="홈"
      >
        <Map className="h-5 w-5" />
        <span className="text-[10px] font-semibold">홈</span>
      </button>

      <button
        className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-text-muted pointer-events-none"
        aria-disabled="true"
        aria-label="마이 (준비 중)"
      >
        <User className="h-5 w-5" />
        <span className="text-[10px]">마이</span>
      </button>
    </nav>
  );
}
