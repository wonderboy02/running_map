"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { Spot } from "@/types";

export default function SpotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [spot, setSpot] = useState<Spot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSpot() {
      const { data, error } = await supabase
        .from("spots")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error || !data) {
        router.push("/");
        return;
      }

      setSpot(data as Spot);
      setLoading(false);
    }

    fetchSpot();
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <p className="text-text-secondary text-sm">불러오는 중...</p>
      </div>
    );
  }

  if (!spot) return null;

  const weekdays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const weekdayLabels: Record<string, string> = {
    mon: "월",
    tue: "화",
    wed: "수",
    thu: "목",
    fri: "금",
    sat: "토",
    sun: "일",
  };

  return (
    <div className="bg-surface flex h-dvh flex-col">
      {/* 헤더 */}
      <header className="border-border flex h-12 items-center border-b px-4">
        <button
          onClick={() => router.back()}
          className="text-text-secondary -ml-1 flex items-center gap-1 text-sm"
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
            <polyline points="15 18 9 12 15 6" />
          </svg>
          뒤로
        </button>
      </header>

      {/* 컨텐츠 */}
      <div className="flex-1 overflow-y-auto">
        {/* 사진 영역 */}
        {spot.photos.length > 0 && (
          <div className="scrollbar-none flex gap-1 overflow-x-auto">
            {spot.photos.map((photo, i) => (
              <img
                key={i}
                src={photo}
                alt={`${spot.name} 사진 ${i + 1}`}
                className="h-48 w-auto flex-shrink-0 object-cover"
              />
            ))}
          </div>
        )}

        <div className="p-4">
          {/* 이름 & 하이라이트 */}
          <div className="mb-1 flex items-start justify-between">
            <h1 className="text-xl font-bold">{spot.name}</h1>
            {spot.is_highlighted && (
              <span className="bg-highlight/10 text-highlight-dark ml-2 flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-medium">
                추천
              </span>
            )}
          </div>

          {/* 주소 */}
          <p className="text-text-secondary mb-3 text-sm">{spot.address}</p>

          {/* 카테고리 */}
          <div className="mb-4 flex flex-wrap gap-1.5">
            {spot.categories.map((cat) => (
              <span
                key={cat}
                className="bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-medium"
              >
                {cat}
              </span>
            ))}
          </div>

          {/* 설명 */}
          {spot.description && (
            <div className="mb-4">
              <h2 className="mb-1 text-sm font-semibold">소개</h2>
              <p className="text-text-secondary text-sm leading-relaxed">
                {spot.description}
              </p>
            </div>
          )}

          {/* 전화번호 */}
          {spot.phone && (
            <div className="mb-4">
              <h2 className="mb-1 text-sm font-semibold">연락처</h2>
              <a
                href={`tel:${spot.phone}`}
                className="text-primary text-sm underline"
              >
                {spot.phone}
              </a>
            </div>
          )}

          {/* 운영시간 */}
          {spot.operating_hours && (
            <div className="mb-4">
              <h2 className="mb-1 text-sm font-semibold">운영시간</h2>
              <div className="space-y-0.5">
                {weekdays.map((day) => {
                  const hours = spot.operating_hours?.[day];
                  if (!hours) return null;
                  return (
                    <div key={day} className="flex text-sm">
                      <span className="text-text-secondary w-6">
                        {weekdayLabels[day]}
                      </span>
                      <span className="text-text">{hours}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
