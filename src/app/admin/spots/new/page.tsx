"use client";

import SpotForm from "@/app/admin/components/SpotForm";

export default function NewSpotPage() {
  return (
    <div>
      <div className="border-border border-b px-4 py-3">
        <h2 className="text-lg font-bold">장소 추가</h2>
      </div>
      <SpotForm />
    </div>
  );
}
