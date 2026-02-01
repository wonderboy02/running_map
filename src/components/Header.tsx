"use client";

import { useState } from "react";
import SearchBar from "./SearchBar";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function Header({ searchQuery, onSearchChange }: HeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <header className="bg-surface border-border z-10 border-b">
      <div className="flex h-12 items-center justify-between px-4">
        {isSearchOpen ? (
          <SearchBar
            value={searchQuery}
            onChange={onSearchChange}
            onClose={() => {
              setIsSearchOpen(false);
              onSearchChange("");
            }}
          />
        ) : (
          <>
            <h1 className="text-lg font-bold text-primary">
              Runner&apos;s Spot
            </h1>
            <button
              onClick={() => setIsSearchOpen(true)}
              className="text-text-secondary flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
              aria-label="검색"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
