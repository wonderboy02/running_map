"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { CATEGORIES } from "@/types";
import type { Spot, SpotInsert } from "@/types";

interface SpotFormProps {
  spot?: Spot;
}

const EMPTY_FORM: SpotInsert = {
  name: "",
  address: "",
  latitude: 37.5665,
  longitude: 126.978,
  categories: [],
  is_highlighted: false,
  operating_hours: null,
  description: null,
  phone: null,
  photos: [],
  extra_data: {},
};

export default function SpotForm({ spot }: SpotFormProps) {
  const router = useRouter();
  const isEdit = !!spot;

  const [form, setForm] = useState<SpotInsert>(() =>
    spot
      ? {
          name: spot.name,
          address: spot.address,
          latitude: spot.latitude,
          longitude: spot.longitude,
          categories: spot.categories,
          is_highlighted: spot.is_highlighted,
          operating_hours: spot.operating_hours,
          description: spot.description,
          phone: spot.phone,
          photos: spot.photos,
          extra_data: spot.extra_data,
        }
      : EMPTY_FORM,
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateField<K extends keyof SpotInsert>(
    key: K,
    value: SpotInsert[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleCategory(cat: string) {
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    if (form.categories.length === 0) {
      setError("카테고리를 하나 이상 선택하세요.");
      setSaving(false);
      return;
    }

    if (isEdit && spot) {
      const { error } = await supabase
        .from("spots")
        .update(form)
        .eq("id", spot.id);

      if (error) {
        setError("수정에 실패했습니다: " + error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("spots").insert(form);

      if (error) {
        setError("추가에 실패했습니다: " + error.message);
        setSaving(false);
        return;
      }
    }

    router.push("/admin");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      {/* 장소명 */}
      <div>
        <label className="text-text mb-1 block text-sm font-medium">
          장소명 *
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
          required
          className="border-border bg-surface h-10 w-full rounded-lg border px-3 text-sm outline-none focus:border-primary"
          placeholder="예: 러닝스테이션 강남"
        />
      </div>

      {/* 주소 */}
      <div>
        <label className="text-text mb-1 block text-sm font-medium">
          주소 *
        </label>
        <input
          type="text"
          value={form.address}
          onChange={(e) => updateField("address", e.target.value)}
          required
          className="border-border bg-surface h-10 w-full rounded-lg border px-3 text-sm outline-none focus:border-primary"
          placeholder="예: 서울시 강남구 테헤란로 123"
        />
      </div>

      {/* 좌표 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-text mb-1 block text-sm font-medium">
            위도 *
          </label>
          <input
            type="number"
            step="any"
            value={form.latitude}
            onChange={(e) => updateField("latitude", Number(e.target.value))}
            required
            className="border-border bg-surface h-10 w-full rounded-lg border px-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-text mb-1 block text-sm font-medium">
            경도 *
          </label>
          <input
            type="number"
            step="any"
            value={form.longitude}
            onChange={(e) => updateField("longitude", Number(e.target.value))}
            required
            className="border-border bg-surface h-10 w-full rounded-lg border px-3 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* 카테고리 */}
      <div>
        <label className="text-text mb-1 block text-sm font-medium">
          카테고리 *
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const isActive = form.categories.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-white"
                    : "bg-surface-dim text-text-secondary border-border border"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* 설명 */}
      <div>
        <label className="text-text mb-1 block text-sm font-medium">
          설명
        </label>
        <textarea
          value={form.description ?? ""}
          onChange={(e) =>
            updateField("description", e.target.value || null)
          }
          rows={3}
          className="border-border bg-surface w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-primary"
          placeholder="장소에 대한 간단한 설명"
        />
      </div>

      {/* 전화번호 */}
      <div>
        <label className="text-text mb-1 block text-sm font-medium">
          전화번호
        </label>
        <input
          type="tel"
          value={form.phone ?? ""}
          onChange={(e) => updateField("phone", e.target.value || null)}
          className="border-border bg-surface h-10 w-full rounded-lg border px-3 text-sm outline-none focus:border-primary"
          placeholder="02-1234-5678"
        />
      </div>

      {/* 하이라이트 */}
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={form.is_highlighted}
          onChange={(e) => updateField("is_highlighted", e.target.checked)}
          className="h-4 w-4 rounded accent-primary"
        />
        <span className="text-sm">추천 장소로 하이라이트</span>
      </label>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* 제출 */}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="border-border text-text-secondary h-10 flex-1 rounded-lg border text-sm font-medium"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={saving}
          className="h-10 flex-1 rounded-lg bg-primary text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "저장 중..." : isEdit ? "수정" : "추가"}
        </button>
      </div>
    </form>
  );
}
