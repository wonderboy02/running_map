'use client';

import { useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';

interface HeaderProps {
  isSearchActive: boolean;
  onSearchActivate: () => void;
  onSearchClose: () => void;
  query: string;
  onQueryChange: (q: string) => void;
}

export default function Header({
  isSearchActive,
  onSearchActivate,
  onSearchClose,
  query,
  onQueryChange,
}: HeaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // 검색 비활성화 시 blur (키보드 닫기)
  useEffect(() => {
    if (!isSearchActive) {
      inputRef.current?.blur();
    }
  }, [isSearchActive]);

  const handleXClick = useCallback(() => {
    onSearchClose();
  }, [onSearchClose]);

  return (
    <header
      className={`absolute top-0 left-0 right-0 z-40 pointer-events-none transition-colors duration-200 ${
        isSearchActive ? 'bg-surface' : ''
      }`}
    >
      <div className="flex h-12 items-center gap-3 px-4 pointer-events-auto">
        {/* 로고: 검색 활성화 시 fade-out + 축소 */}
        <div
          className={`flex-shrink-0 transition-all duration-300 ease-out overflow-hidden ${
            isSearchActive
              ? 'max-w-0 opacity-0 -translate-x-3'
              : 'max-w-[160px] opacity-100 translate-x-0'
          }`}
        >
          <Image
            src="/logo/logo.png"
            alt="Runner's Spot"
            width={25}
            height={32}
            priority
          />
        </div>

        {/* 검색바 — 동일한 input 엘리먼트가 비활성/활성 전환 */}
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onFocus={() => {
              if (!isSearchActive) onSearchActivate();
            }}
            placeholder="장소, 코스 검색"
            className={`w-full h-9 px-4 rounded-full border text-[clamp(13px,3.5vw,15px)] outline-none transition-colors duration-200 ${
              isSearchActive
                ? 'pr-9 border-primary bg-surface-dim'
                : 'border-border bg-surface/95 backdrop-blur-sm'
            }`}
          />
          {isSearchActive && (
            <button
              type="button"
              onClick={handleXClick}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-text-secondary hover:bg-black/5 active:bg-black/10"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
