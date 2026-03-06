'use client';

import Image from 'next/image';
import { Navigation, Route } from 'lucide-react';

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
        aria-label="길안내 (준비 중)"
      >
        <Navigation className="h-5 w-5" />
        <span className="text-[10px]">길안내</span>
      </button>

      <div className="flex flex-1 flex-col items-center">
        <button className="relative -mt-5 flex flex-col items-center" aria-label="홈">
          <div className="h-12 w-12 overflow-hidden rounded-full shadow-lg ring-[3px] ring-surface">
            <Image
              src="/logo/logo.png"
              alt=""
              width={48}
              height={48}
              className="h-full w-full scale-110 object-cover object-[50%_25%]"
            />
          </div>
          <span className="mt-0.5 text-[10px] font-semibold text-primary">홈</span>
        </button>
      </div>

      <button
        className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-text-muted pointer-events-none"
        aria-disabled="true"
        aria-label="코스 찾기 (준비 중)"
      >
        <Route className="h-5 w-5" />
        <span className="text-[10px]">코스 찾기</span>
      </button>
    </nav>
  );
}
