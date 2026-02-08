'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import SearchBar from './SearchBar';

interface HeaderProps {
  onLocationSelect: (lat: number, lng: number) => void;
}

export default function Header({ onLocationSelect }: HeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <header className="bg-surface border-border z-50 border-b">
      <div className="flex h-12 items-center gap-3 px-4">
        {isSearchOpen ? (
          <SearchBar
            onLocationSelect={(lat, lng) => {
              onLocationSelect(lat, lng);
              setIsSearchOpen(false);
            }}
            onClose={() => setIsSearchOpen(false)}
          />
        ) : (
          <>
            <h1 className="flex-shrink-0 text-[clamp(15px,4vw,17px)] font-bold text-primary tracking-tight">Runner&apos;s Spot</h1>
            <button
              onClick={() => setIsSearchOpen(true)}
              className="border-border bg-surface-dim text-text-secondary flex h-9 flex-1 items-center gap-2 rounded-full border px-3.5 text-[clamp(13px,3.5vw,15px)]"
            >
              <Search className="h-4 w-4 flex-shrink-0" />
              <span>장소, 주소 검색</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
