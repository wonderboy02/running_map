/**
 * 내 위치 파란 점 + 방향 콘 + 정확도 원을 네이버 지도 위에 표시하는 명령형 클래스.
 * React 컴포넌트가 아닌 순수 명령형 — NaverMap 내부에서 생성/업데이트/삭제.
 */

export interface MyLocationState {
  lat: number;
  lng: number;
  heading: number | null;
  accuracy: number;
}

const ACCURACY_THRESHOLD = 20; // 이 값 이상일 때만 정확도 원 표시
const HEADING_MIN_DELTA = 5; // 최소 회전 변화량 (°)
const ACCURACY_MIN_DELTA = 5; // 최소 정확도 변화량 (m)

export class MyLocationMarker {
  private marker: naver.maps.Marker;
  private circle: naver.maps.Circle;
  private map: naver.maps.Map;
  private lastHeading: number | null = null;
  private lastAccuracy = 0;

  constructor(map: naver.maps.Map, state: MyLocationState) {
    this.map = map;

    const position = new naver.maps.LatLng(state.lat, state.lng);

    this.marker = new naver.maps.Marker({
      position,
      map,
      icon: this.buildIcon(state.heading),
      zIndex: 300,
    });

    this.circle = new naver.maps.Circle({
      center: position,
      radius: state.accuracy,
      map: state.accuracy >= ACCURACY_THRESHOLD ? map : null,
      strokeColor: '#4285F4',
      strokeOpacity: 0.2,
      strokeWeight: 1,
      fillColor: '#4285F4',
      fillOpacity: 0.08,
      clickable: false,
      zIndex: 299,
    });

    this.lastHeading = state.heading;
    this.lastAccuracy = state.accuracy;
  }

  update(state: MyLocationState): void {
    const position = new naver.maps.LatLng(state.lat, state.lng);

    this.marker.setPosition(position);
    this.circle.setCenter(position);

    // heading 변화가 충분할 때만 아이콘 갱신 (DOM 재생성 최소화)
    const headingDelta = Math.abs(
      (state.heading ?? 0) - (this.lastHeading ?? 0),
    );
    if (
      headingDelta >= HEADING_MIN_DELTA ||
      (state.heading === null) !== (this.lastHeading === null)
    ) {
      this.marker.setIcon(this.buildIcon(state.heading));
      this.lastHeading = state.heading;
    }

    // 정확도 변화가 충분할 때만 원 반지름 갱신
    const accuracyDelta = Math.abs(state.accuracy - this.lastAccuracy);
    if (accuracyDelta >= ACCURACY_MIN_DELTA) {
      this.circle.setRadius(state.accuracy);
      this.lastAccuracy = state.accuracy;
    }

    // 정확도 원 표시/숨김
    if (state.accuracy >= ACCURACY_THRESHOLD) {
      if (!this.circle.getMap()) this.circle.setMap(this.map);
    } else {
      if (this.circle.getMap()) this.circle.setMap(null);
    }
  }

  setVisible(visible: boolean): void {
    this.marker.setVisible(visible);
    if (!visible) this.circle.setMap(null);
  }

  destroy(): void {
    this.marker.setMap(null);
    this.circle.setMap(null);
  }

  private buildIcon(heading: number | null): naver.maps.HtmlIcon {
    const rotation = heading != null ? heading : 0;
    const coneHtml =
      heading != null ? `<div class="my-location-heading-cone"></div>` : '';

    return {
      content: `<div class="my-location-marker" style="transform:rotate(${rotation}deg)">
        ${coneHtml}
        <div class="my-location-dot"></div>
        <div class="my-location-pulse"></div>
      </div>`,
      size: new naver.maps.Size(60, 60),
      anchor: new naver.maps.Point(30, 30),
    };
  }
}
