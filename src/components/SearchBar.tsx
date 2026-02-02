'use client';

import { useRef, useEffect, useState } from 'react';
import { Search, MapPin, Loader2, X } from 'lucide-react';
import { useGeocode, type GeocodeResult } from '@/hooks/useGeocode';

interface SearchBarProps {
  onLocationSelect: (lat: number, lng: number) => void;
  onClose: () => void;
}

export default function SearchBar({ onLocationSelect, onClose }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const { results, loading, search, clear } = useGeocode();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleInput(value: string) {
    setQuery(value);
    search(value);
    setShowResults(true);
  }

  function handleSelect(result: GeocodeResult) {
    onLocationSelect(result.latitude, result.longitude);
    setQuery(result.placeName || result.roadAddress);
    setShowResults(false);
    clear();
  }

  function handleClose() {
    clear();
    onClose();
  }

  return (
    <div className="relative flex flex-1 items-center gap-2" ref={dropdownRef}>
      <div className="relative flex-1">
        <Search className="text-text-secondary pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder="장소명, 주소 검색"
          className="border-border bg-surface-dim h-9 w-full rounded-full border py-1.5 pl-9 pr-9 text-sm outline-none focus:border-primary"
        />
        {loading && (
          <Loader2 className="text-text-secondary absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin" />
        )}
        {!loading && query && (
          <button
            type="button"
            onClick={() => { setQuery(''); clear(); setShowResults(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="text-text-secondary h-4 w-4" />
          </button>
        )}
      </div>
      <button
        onClick={handleClose}
        className="text-text-secondary flex-shrink-0 text-sm"
      >
        취소
      </button>

      {/* 검색 결과 드롭다운 */}
      {showResults && results.length > 0 && (
        <div className="border-border bg-surface absolute left-0 top-full z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border shadow-lg">
          {results.map((result, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(result)}
              className="hover:bg-surface-dim flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm transition-colors"
            >
              <MapPin className={`mt-0.5 h-4 w-4 flex-shrink-0 ${result.source === 'place' ? 'text-highlight-dark' : 'text-primary'}`} />
              <div className="min-w-0 flex-1">
                {result.placeName ? (
                  <>
                    <p className="text-text truncate font-medium">{result.placeName}</p>
                    <p className="text-text-secondary truncate text-xs">{result.roadAddress}</p>
                    {result.category && (
                      <p className="text-text-secondary truncate text-xs">{result.category}</p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-text truncate font-medium">{result.roadAddress}</p>
                    {result.jibunAddress && result.jibunAddress !== result.roadAddress && (
                      <p className="text-text-secondary truncate text-xs">{result.jibunAddress}</p>
                    )}
                  </>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {showResults && !loading && query.length >= 2 && results.length === 0 && (
        <div className="border-border bg-surface absolute left-0 top-full z-50 mt-1 w-full rounded-lg border px-3 py-3 shadow-lg">
          <p className="text-text-secondary text-center text-xs">검색 결과가 없습니다.</p>
        </div>
      )}
    </div>
  );
}
