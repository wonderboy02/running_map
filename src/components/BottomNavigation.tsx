'use client';

import { Navigation, Route } from 'lucide-react';
import type { AppMode } from '@/types';

export const BOTTOM_NAV_HEIGHT = 56;

interface BottomNavigationProps {
  appMode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

export default function BottomNavigation({ appMode, onModeChange }: BottomNavigationProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[35] flex items-center justify-around border-t border-border bg-surface"
      style={{ height: BOTTOM_NAV_HEIGHT }}
    >
      <button
        className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 ${appMode === 'navigation' ? 'text-primary font-semibold' : 'text-text-muted'}`}
        aria-label="길안내"
        onClick={() => onModeChange('navigation')}
      >
        <Navigation className="h-5 w-5" />
        <span className="text-[10px]">길안내</span>
      </button>

      <div className="flex flex-1 flex-col items-center">
        <button
          className="relative -mt-4 flex flex-col items-center"
          aria-label="홈"
          onClick={() => onModeChange('home')}
        >
          <div className="h-10 w-10 overflow-hidden rounded-full shadow-lg ring-[2.5px] ring-surface">
            {/* 정적 UI 에셋 — 로고 아이콘, next/image 최적화 실익 없음 */}
            <img
              src="/logo/logo.png"
              alt=""
              width={40}
              height={40}
              className="h-full w-full scale-110 object-cover object-[50%_25%]"
            />
          </div>
          <span
            className={`mt-0.5 text-[10px] ${appMode === 'home' ? 'text-primary font-semibold' : 'text-text-muted'}`}
          >
            홈
          </span>
        </button>
      </div>

      <button
        className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 ${appMode === 'course' ? 'text-primary font-semibold' : 'text-text-muted'}`}
        aria-label="코스 찾기"
        onClick={() => onModeChange('course')}
      >
        <Route className="h-5 w-5" />
        <span className="text-[10px]">코스 찾기</span>
      </button>
    </nav>
  );
}
