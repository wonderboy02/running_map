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
const ACCURACY_MIN_DELTA = 5; // 최소 정확도 변화량 (m)
const ROTATION_NORMALIZE_THRESHOLD = 3600; // 이 값 초과 시 정규화 (10회전)
const MARKER_DATA_ATTR = 'data-my-location';
const MARKER_SELECTOR = `[${MARKER_DATA_ATTR}]`;

export class MyLocationMarker {
  private marker: naver.maps.Marker;
  private circle: naver.maps.Circle;
  private map: naver.maps.Map;
  private lastHeading: number | null = null;
  private lastAccuracy = 0;
  private markerEl: HTMLElement | null = null;
  private currentRotation = 0;

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
    if (state.heading != null) {
      this.currentRotation = state.heading;
    }
  }

  update(state: MyLocationState): void {
    const position = new naver.maps.LatLng(state.lat, state.lng);

    this.marker.setPosition(position);
    this.circle.setCenter(position);

    // heading null↔non-null 전환: 구조가 바뀌므로 setIcon() 호출
    const wasNull = this.lastHeading === null;
    const isNull = state.heading === null;

    if (wasNull !== isNull) {
      this.marker.setIcon(this.buildIcon(state.heading));
      this.markerEl = null; // DOM 재생성됐으므로 캐시 무효화
      this.lastHeading = state.heading;
      if (state.heading != null) {
        this.currentRotation = state.heading;
      }
    } else if (state.heading != null) {
      // heading 회전만 변경: DOM 직접 조작 (setIcon 호출 안 함)
      const el = this.resolveElement();
      if (el) {
        this.currentRotation = this.computeShortestRotation(state.heading);
        el.style.transform = `rotate(${this.currentRotation}deg)`;
        this.normalizeRotation(el);
      } else {
        // fallback: DOM을 찾지 못하면 setIcon()
        this.marker.setIcon(this.buildIcon(state.heading));
        this.markerEl = null;
        this.currentRotation = state.heading;
      }
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
    this.markerEl = null;
  }

  /** 마커 DOM 요소를 찾아 캐시하고 반환 */
  private resolveElement(): HTMLElement | null {
    if (this.markerEl && this.markerEl.isConnected) return this.markerEl;
    const el = document.querySelector<HTMLElement>(MARKER_SELECTOR);
    this.markerEl = el;
    return el;
  }

  /** 최단 경로 회전 계산 (350→10 = +20, not -340) */
  private computeShortestRotation(target: number): number {
    let delta = target - (this.currentRotation % 360);
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    return this.currentRotation + delta;
  }

  /** 누적 회전값이 임계치를 넘으면 transition 없이 정규화 */
  private normalizeRotation(el: HTMLElement): void {
    if (Math.abs(this.currentRotation) <= ROTATION_NORMALIZE_THRESHOLD) return;
    const normalized = ((this.currentRotation % 360) + 360) % 360;
    el.style.transition = 'none';
    el.style.transform = `rotate(${normalized}deg)`;
    void el.offsetHeight; // reflow 강제 → 즉시 적용
    el.style.transition = '';
    this.currentRotation = normalized;
  }

  private buildIcon(heading: number | null): naver.maps.HtmlIcon {
    const rotation = heading != null ? heading : 0;
    const coneDisplay = heading != null ? 'block' : 'none';

    const coneSvg = `<div class="my-location-heading-cone" style="display:${coneDisplay}"><svg width="20" height="26" viewBox="0 0 20 26" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="my-loc-hg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#4285F4" stop-opacity="0.5"/>
          <stop offset="100%" stop-color="#4285F4" stop-opacity="0.05"/>
        </linearGradient></defs>
        <path d="M10 0 L18 26 Q10 22 2 26 Z" fill="url(#my-loc-hg)"/>
      </svg></div>`;

    return {
      content: `<div class="my-location-marker" ${MARKER_DATA_ATTR} style="transform:rotate(${rotation}deg)">
        ${coneSvg}
        <div class="my-location-dot"></div>
        <div class="my-location-pulse"></div>
      </div>`,
      size: new naver.maps.Size(60, 60),
      anchor: new naver.maps.Point(30, 30),
    };
  }
}
