/**
 * caption-collision.ts — 마커 캡션 충돌 감지
 *
 * 픽셀 좌표 기반으로 마커 간 거리를 비교하여,
 * 캡션이 겹치는 마커를 식별하고 숨길 대상을 결정한다.
 *
 * - 선택된 마커는 항상 캡션 유지 (충돌에서 승리)
 * - 비선택 마커끼리 겹치면 화면상 더 아래(py가 큰) 마커가 우선
 */

export interface MarkerPixelInfo {
  id: string;
  px: number;
  py: number;
  isSelected: boolean;
}

/**
 * 캡션을 표시할 마커 ID Set을 반환한다.
 *
 * @param markers - 픽셀 좌표가 포함된 마커 정보 배열
 * @param thresholdX - 수평 충돌 임계값 (px)
 * @param thresholdY - 수직 충돌 임계값 (px)
 */
export function computeVisibleCaptions(
  markers: MarkerPixelInfo[],
  thresholdX: number,
  thresholdY: number,
): Set<string> {
  const hidden = new Set<string>();

  for (let i = 0; i < markers.length; i++) {
    if (hidden.has(markers[i].id)) continue;

    for (let j = i + 1; j < markers.length; j++) {
      if (hidden.has(markers[j].id)) continue;

      const dx = Math.abs(markers[i].px - markers[j].px);
      const dy = Math.abs(markers[i].py - markers[j].py);

      if (dx < thresholdX && dy < thresholdY) {
        const a = markers[i];
        const b = markers[j];

        if (a.isSelected) {
          hidden.add(b.id);
        } else if (b.isSelected) {
          hidden.add(a.id);
        } else {
          // 캡션은 마커 아래에 표시되므로, 화면상 더 아래(py가 큰) 마커가 캡션 유지
          if (a.py >= b.py) {
            hidden.add(b.id);
          } else {
            hidden.add(a.id);
          }
        }
      }
    }
  }

  const visible = new Set<string>();
  for (const m of markers) {
    if (!hidden.has(m.id)) {
      visible.add(m.id);
    }
  }
  return visible;
}
