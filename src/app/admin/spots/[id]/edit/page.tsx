"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import SpotForm from "@/app/admin/components/SpotForm";
import type { Spot } from "@/types";

export default function EditSpotPage() {
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
        router.push("/admin");
        return;
      }

      setSpot(data as Spot);
      setLoading(false);
    }

    fetchSpot();
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-text-secondary text-sm">불러오는 중...</p>
      </div>
    );
  }

  if (!spot) return null;

  return (
    <div>
      <div className="border-border border-b px-4 py-3">
        <h2 className="text-lg font-bold">장소 수정</h2>
      </div>
      <SpotForm spot={spot} />
    </div>
  );
}
