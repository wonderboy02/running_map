import type { Spot } from '@/types';

/**
 * 네이버 지도 앱/웹으로 연결하는 유틸리티
 * 모바일: 딥링크 시도 → 웹 fallback
 * 데스크톱: 웹으로 직접 연결
 */
export function openNaverMap(spot: Spot): void {
  const { latitude, longitude, name } = spot;
  const encodedName = encodeURIComponent(name);

  // 모바일 환경 감지
  const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);

  if (isMobile) {
    // 모바일: 딥링크 시도
    const appUrl = `nmap://place?lat=${latitude}&lng=${longitude}&name=${encodedName}`;
    const webUrl = `https://map.naver.com/v5/search/${encodedName}?c=${longitude},${latitude},15,0,0,0,dh`;

    let appOpened = false;

    // visibilitychange로 앱이 열렸는지 감지
    const handleVisibilityChange = () => {
      if (document.hidden) {
        appOpened = true;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 딥링크 시도
    window.location.href = appUrl;

    // 2초 후 앱이 열리지 않았으면 웹으로 fallback
    setTimeout(() => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (!appOpened) {
        window.open(webUrl, '_blank');
      }
    }, 2000);
  } else {
    // 데스크톱: 웹으로 직접 연결
    window.open(
      `https://map.naver.com/v5/search/${encodedName}?c=${longitude},${latitude},15,0,0,0,dh`,
      '_blank'
    );
  }
}
