'use client';

import { NaverSearchSection } from '@/components/admin/NaverSearchSection';
import { SpotManagementTable } from '@/components/admin/SpotManagementTable';
import { Separator } from '@/components/ui/separator';

export default function BulkManagementPage() {
  return (
    <div className="p-4 space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-2">검색 & 일괄 관리</h2>
        <p className="text-sm text-text-secondary">
          네이버 지역검색 API로 장소를 찾아 DB에 추가하거나, 기존 장소를 일괄 수정할 수 있습니다.
        </p>
      </div>

      <Separator />

      {/* 네이버 장소 검색 섹션 */}
      <section>
        <NaverSearchSection />
      </section>

      <Separator />

      {/* 기존 장소 관리 섹션 */}
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">기존 장소 관리</h3>
          <p className="text-sm text-text-secondary">
            기존 장소를 필터링하고 일괄 수정합니다.
          </p>
        </div>
        <SpotManagementTable />
      </section>
    </div>
  );
}
