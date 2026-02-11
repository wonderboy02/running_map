'use client';

import { Search } from 'lucide-react';

interface HeaderProps {
  isSearchActive: boolean;
  onSearchActivate: () => void;
}

export default function Header({ isSearchActive, onSearchActivate }: HeaderProps) {
  return (
    <header className="z-40">
      <div className="flex h-12 items-center gap-3 px-4">
        {/* 로고: 검색 활성화 시 fade-out + 축소 */}
        <div
          className={`flex-shrink-0 transition-all duration-300 ease-out overflow-hidden ${
            isSearchActive
              ? 'max-w-0 opacity-0 -translate-x-3'
              : 'max-w-[160px] opacity-100 translate-x-0'
          }`}
        >
          <div className="w-8 h-8 bg-gray-300 rounded-lg" />
        </div>

        {/* 검색 트리거 버튼 */}
        <div className="flex-1 transition-all duration-300 ease-out">
          <button
            onClick={onSearchActivate}
            className="border-border bg-surface/95 backdrop-blur-sm text-text-secondary flex h-9 w-full items-center gap-2 rounded-full border px-3.5 text-[clamp(13px,3.5vw,15px)]"
          >
            <Search className="h-4 w-4 flex-shrink-0" />
            <span>장소, 코스 검색</span>
          </button>
        </div>
      </div>
    </header>
  );
}
