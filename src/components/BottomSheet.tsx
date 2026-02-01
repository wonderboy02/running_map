"use client";

import { useEffect, useRef } from "react";
import SpotCard from "./SpotCard";
import type { Spot } from "@/types";

interface BottomSheetProps {
  spot: Spot | null;
  onClose: () => void;
}

export default function BottomSheet({ spot, onClose }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // 바깥 클릭 시 닫기
  useEffect(() => {
    if (!spot) return;

    function handleClickOutside(e: MouseEvent) {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    // 약간의 딜레이를 줘서 마커 클릭 이벤트와 충돌 방지
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [spot, onClose]);

  if (!spot) return null;

  return (
    <div
      ref={sheetRef}
      className="bg-surface border-border animate-slide-up absolute inset-x-0 bottom-0 z-20 rounded-t-2xl border-t shadow-lg"
    >
      {/* 핸들 바 */}
      <div className="flex justify-center py-2">
        <div className="h-1 w-10 rounded-full bg-gray-300" />
      </div>
      <div className="px-4 pb-6">
        <SpotCard spot={spot} />
      </div>
    </div>
  );
}
