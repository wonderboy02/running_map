import mixpanel from 'mixpanel-browser';
import type { AnalyticsEventMap, AnalyticsEvent } from '@/types/analytics';
import { isProduction } from '@/lib/env';

const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
const NO_TRACK_KEY = 'analytics_no_track';

let initialized = false;

/**
 * no_track 상태를 URL 쿼리 + localStorage로 판단한다.
 * - ?no_track=1 → localStorage에 저장, 이후 방문에도 유지
 * - ?no_track=0 → localStorage에서 제거, 추적 재개
 */
function isNoTrack(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    const noTrackParam = params.get('no_track');

    if (noTrackParam === '1') {
      localStorage.setItem(NO_TRACK_KEY, '1');
    } else if (noTrackParam === '0') {
      localStorage.removeItem(NO_TRACK_KEY);
    }

    return localStorage.getItem(NO_TRACK_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Mixpanel 초기화. 반드시 클라이언트(useEffect) 내에서 호출할 것.
 * 중복 호출 시 무시된다.
 *
 * - 비프로덕션 환경 또는 no_track=1 → 초기화 자체를 스킵하여
 *   autocapture 포함 모든 이벤트 전송을 완전 차단
 */
export function initAnalytics() {
  if (typeof window === 'undefined' || !MIXPANEL_TOKEN || initialized) return;

  if (!isProduction || isNoTrack()) return;

  mixpanel.init(MIXPANEL_TOKEN, {
    track_pageview: false,
    persistence: 'localStorage',
    autocapture: {
      pageview: 'url-with-path',
      click: true,
      input: false,
      scroll: true,
      submit: true,
    },
    loaded: (mp) => {
      mp.register({
        app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? 'unknown',
        platform: 'web',
      });
    },
  });

  initialized = true;
}

/**
 * 타입 안전한 이벤트 전송.
 */
export function track<E extends AnalyticsEvent>(
  event: E,
  properties: AnalyticsEventMap[E],
) {
  if (!MIXPANEL_TOKEN || !initialized) return;
  mixpanel.track(event, properties as Record<string, unknown>);
}

/**
 * Mixpanel reset (로그아웃 시 등).
 */
export function resetAnalytics() {
  if (!MIXPANEL_TOKEN || !initialized) return;
  mixpanel.reset();
}
