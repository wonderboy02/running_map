/**
 * 수동 추적 이벤트의 이름 → 프로퍼티 매핑.
 * track() 호출 시 타입 체크를 강제하여 오타/누락을 방지한다.
 */
export type SelectionSource = 'map' | 'search' | 'drawer_list';

export type AnalyticsEventMap = {
  // 선택 (통합)
  spot_select: {
    spot_id: string;
    spot_name: string;
    category: string;
    source: SelectionSource;
    query?: string;
  };
  course_select: {
    course_id: string;
    course_name: string;
    source: SelectionSource;
    query?: string;
  };

  // 지도 인터랙션
  course_toggle: { show_courses: boolean };
  filter_toggle: { category: string; is_active: boolean; active_filters: string[] };
  my_location_click: { has_location: boolean };

  // 검색
  search_open: Record<string, never>;
  search_query: {
    query: string;
    query_length: number;
    result_count_spots: number;
    result_count_courses: number;
    result_count_external: number;
  };
  search_external_click: {
    result_name: string;
    query: string;
  };
  search_close: { had_results: boolean; dwell_time_ms: number };

  // 바텀 드로어
  drawer_snap: {
    from_snap: number;
    to_snap: number;
    content_type: 'list' | 'spot_detail' | 'course_detail';
  };
  drawer_action_click: {
    action_type: 'naver_map' | 'custom_url' | 'phone_call' | 'ttaracker_install';
    spot_id: string;
  };

  // 피드백
  feedback_submit: { content_length: number };
};

export type AnalyticsEvent = keyof AnalyticsEventMap;
