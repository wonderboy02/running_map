"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { Spot } from "@/types";

export default function AdminDashboard() {
  const router = useRouter();
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchSpots() {
    const { data } = await supabase
      .from("spots")
      .select("*")
      .order("created_at", { ascending: false });

    setSpots((data as Spot[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchSpots();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("이 장소를 삭제하시겠습니까?")) return;
    await supabase.from("spots").delete().eq("id", id);
    fetchSpots();
  }

  async function handleToggleHighlight(spot: Spot) {
    await supabase
      .from("spots")
      .update({ is_highlighted: !spot.is_highlighted })
      .eq("id", spot.id);
    fetchSpots();
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">
          장소 목록{" "}
          <span className="text-text-secondary text-sm font-normal">
            ({spots.length})
          </span>
        </h2>
        <button
          onClick={() => router.push("/admin/spots/new")}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
        >
          장소 추가
        </button>
      </div>

      {loading ? (
        <p className="text-text-secondary text-sm">불러오는 중...</p>
      ) : spots.length === 0 ? (
        <p className="text-text-secondary py-8 text-center text-sm">
          등록된 장소가 없습니다.
        </p>
      ) : (
        <div className="space-y-3">
          {spots.map((spot) => (
            <div
              key={spot.id}
              className="bg-surface border-border rounded-lg border p-3"
            >
              <div className="mb-1 flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{spot.name}</h3>
                    {spot.is_highlighted && (
                      <span className="bg-highlight/10 text-highlight-dark rounded-full px-2 py-0.5 text-xs">
                        추천
                      </span>
                    )}
                  </div>
                  <p className="text-text-secondary text-xs">{spot.address}</p>
                </div>
              </div>

              <div className="mb-2 flex flex-wrap gap-1">
                {spot.categories.map((cat) => (
                  <span
                    key={cat}
                    className="bg-surface-dim text-text-secondary rounded px-1.5 py-0.5 text-xs"
                  >
                    {cat}
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleHighlight(spot)}
                  className={`rounded px-3 py-1 text-xs font-medium ${
                    spot.is_highlighted
                      ? "bg-highlight/10 text-highlight-dark"
                      : "bg-surface-dim text-text-secondary"
                  }`}
                >
                  {spot.is_highlighted ? "추천 해제" : "추천 설정"}
                </button>
                <button
                  onClick={() =>
                    router.push(`/admin/spots/${spot.id}/edit`)
                  }
                  className="bg-surface-dim text-text-secondary rounded px-3 py-1 text-xs font-medium"
                >
                  수정
                </button>
                <button
                  onClick={() => handleDelete(spot.id)}
                  className="rounded bg-red-50 px-3 py-1 text-xs font-medium text-red-500"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
