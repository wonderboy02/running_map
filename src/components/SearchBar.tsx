"use client";

import { useRef, useEffect } from "react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}

export default function SearchBar({ value, onChange, onClose }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-1 items-center gap-2">
      <div className="relative flex-1">
        <svg
          className="text-text-secondary absolute left-3 top-1/2 -translate-y-1/2"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
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
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="장소명, 주소, 카테고리 검색"
          className="border-border bg-surface-dim h-9 w-full rounded-full border py-1.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
        />
      </div>
      <button
        onClick={onClose}
        className="text-text-secondary flex-shrink-0 text-sm"
      >
        취소
      </button>
    </div>
  );
}
