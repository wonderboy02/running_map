/**
 * 네이버 지도 페이지에서 지도 마커의 장소명을 추출하는 Content Script
 */

// 지도 마커에서 장소명 추출
function extractPlaces() {
  const places = new Set(); // 중복 제거를 위해 Set 사용

  console.log('🔍 네이버 지도 마커 추출 시작...');

  // 마커 타이틀 찾기
  const markerSelectors = [
    '.marker_title',
    'strong.marker_title',
    '[class*="marker"] [class*="title"]',
    '[class*="Marker"] strong',
    '.marker_text_area strong',
  ];

  let totalFound = 0;

  markerSelectors.forEach((selector, idx) => {
    try {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`✅ Selector #${idx + 1} "${selector}" → ${elements.length}개 발견`);
        totalFound += elements.length;

        elements.forEach(el => {
          const text = el.textContent.trim();
          // 유효한 장소명: 2글자 이상, 100글자 이하
          if (text && text.length >= 2 && text.length < 100) {
            places.add(text);
          }
        });
      }
    } catch (e) {
      console.warn(`⚠️ Selector "${selector}" 오류:`, e.message);
    }
  });

  const result = Array.from(places);
  console.log(`\n✨ 최종 추출 결과:`);
  console.log(`   - 마커 발견: ${totalFound}개`);
  console.log(`   - 중복 제거 후: ${result.length}개`);
  console.log(`\n📝 장소 목록:`);
  result.forEach((name, idx) => {
    console.log(`   ${idx + 1}. ${name}`);
  });

  return result;
}

// Popup에서 메시지를 받으면 장소 추출 실행
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractPlaces') {
    try {
      console.log('🚀 추출 요청 받음');

      const placeNames = extractPlaces();

      if (placeNames.length === 0) {
        sendResponse({
          success: false,
          error: '마커를 찾을 수 없습니다.\n\n해결 방법:\n1. 검색어를 입력하고 검색 결과가 표시된 상태에서 시도\n2. 지도를 확대/축소하여 마커가 보이도록 조정\n3. 페이지를 새로고침한 후 다시 시도'
        });
      } else {
        // 장소명만 배열로 반환 (주소 없음)
        const places = placeNames.map(name => ({
          name: name,
          address: '주소 정보 없음'
        }));

        sendResponse({
          success: true,
          places: places,
          count: places.length
        });
      }
    } catch (error) {
      console.error('❌ 추출 오류:', error);
      sendResponse({
        success: false,
        error: `추출 중 오류 발생: ${error.message}`
      });
    }
  }

  return true;
});

console.log('✅ 네이버 지도 장소 추출기 (마커 전용) 로드됨');
console.log('💡 지도에 표시된 마커의 장소명을 추출합니다');
