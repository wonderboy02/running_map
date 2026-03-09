import mixpanel from 'mixpanel-browser';
import type { AnalyticsEventMap, AnalyticsEvent } from '@/types/analytics';
import { isProduction } from '@/lib/env';

const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
const NO_TRACK_KEY = 'analytics_no_track';

let initialized = false;

/** URL에서 UTM 파라미터 파싱. 없는 값은 포함하지 않음. */
function parseUtmParams() {
  const params = new URLSearchParams(window.location.search);
  const result: Record<string, string> = {};
  const keys = ['utm_source', 'utm_medium', 'utm_campaign'] as const;
  for (const key of keys) {
    const val = params.get(key);
    if (val) result[key] = val;
  }
  return result;
}

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

      // 유저 식별 (device-based)
      // 로그인이 없으므로 device ID = 영구 식별자
      // identify() 호출이 있어야 People 프로필이 생성됨
      mp.identify(mp.get_distinct_id());

      // first-touch 유저 속성 → Users 탭 프로필
      // set_once: 이미 값이 있으면 무시 (first-touch 보존)
      const utm = parseUtmParams();
      const firstTouchProps: Record<string, string> = {
        first_visit_date: new Date().toISOString(),
        first_landing_page: window.location.pathname,
        first_referrer: document.referrer,
      };
      if (utm.utm_source) firstTouchProps.first_utm_source = utm.utm_source;
      if (utm.utm_medium) firstTouchProps.first_utm_medium = utm.utm_medium;
      if (utm.utm_campaign)
        firstTouchProps.first_utm_campaign = utm.utm_campaign;

      mp.people.set_once(firstTouchProps);

      // first-touch UTM → 모든 이벤트에 자동 첨부 (super property)
      // register_once: 이미 값이 있으면 무시
      const superProps: Record<string, string> = {};
      if (utm.utm_source) superProps.first_utm_source = utm.utm_source;
      if (utm.utm_medium) superProps.first_utm_medium = utm.utm_medium;
      if (utm.utm_campaign)
        superProps.first_utm_campaign = utm.utm_campaign;

      if (Object.keys(superProps).length > 0) {
        mp.register_once(superProps);
      }
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
