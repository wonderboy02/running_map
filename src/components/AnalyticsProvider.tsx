'use client';

import { useEffect } from 'react';
import { initAnalytics } from '@/lib/analytics';

/**
 * Mixpanel 초기화 전용 클라이언트 컴포넌트.
 * layout.tsx에서 <AnalyticsProvider /> 를 마운트한다.
 */
export default function AnalyticsProvider() {
  useEffect(() => {
    initAnalytics();
  }, []);

  return null;
}
