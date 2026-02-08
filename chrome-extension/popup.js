/**
 * Extension Popup의 로직
 */

// DOM 요소
const extractBtn = document.getElementById('extractBtn');
const clearBtn = document.getElementById('clearBtn');
const downloadTxtBtn = document.getElementById('downloadTxtBtn');
const placesList = document.getElementById('placesList');
const countElement = document.getElementById('count');
const statusElement = document.getElementById('status');

// 상태 표시
function showStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.className = `status ${isError ? 'error' : 'success'}`;
  setTimeout(() => {
    statusElement.textContent = '';
    statusElement.className = 'status';
  }, 3000);
}

// 저장된 장소 목록 불러오기
async function loadPlaces() {
  const result = await chrome.storage.local.get(['places']);
  const places = result.places || [];
  updateUI(places);
  return places;
}

// 장소 목록 저장하기
async function savePlaces(places) {
  await chrome.storage.local.set({ places });
  updateUI(places);
}

// UI 업데이트
function updateUI(places) {
  countElement.textContent = places.length;

  if (places.length === 0) {
    placesList.innerHTML = '<p class="empty-message">아직 추출된 장소가 없습니다.</p>';
    downloadTxtBtn.disabled = true;
  } else {
    placesList.innerHTML = places
      .map(place => `
        <div class="place-item">
          <div class="place-name">${escapeHtml(place.name)}</div>
          <div class="place-address">${escapeHtml(place.address)}</div>
        </div>
      `)
      .join('');
    downloadTxtBtn.disabled = false;
  }
}

// HTML 이스케이프
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 현재 페이지에서 장소 추출
extractBtn.addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url || !tab.url.includes('map.naver.com')) {
      showStatus('네이버 지도 페이지에서만 사용할 수 있습니다.', true);
      return;
    }

    extractBtn.disabled = true;
    extractBtn.textContent = '추출 중...';

    const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractPlaces' });

    if (response.success) {
      const existingPlaces = await loadPlaces();

      // 중복 제거 (장소명 기준)
      const existingNames = new Set(existingPlaces.map(p => p.name));
      const newPlaces = response.places.filter(place => !existingNames.has(place.name));
      const updatedPlaces = [...existingPlaces, ...newPlaces];

      await savePlaces(updatedPlaces);

      showStatus(`${newPlaces.length}개의 새로운 장소를 추가했습니다! (총 ${updatedPlaces.length}개)`);
    } else {
      showStatus(response.error || '추출 실패', true);
    }
  } catch (error) {
    showStatus(`오류: ${error.message}`, true);
  } finally {
    extractBtn.disabled = false;
    extractBtn.textContent = '📍 현재 페이지 추출';
  }
});

// 모두 삭제
clearBtn.addEventListener('click', async () => {
  if (confirm('저장된 모든 장소를 삭제하시겠습니까?')) {
    await savePlaces([]);
    showStatus('모든 장소를 삭제했습니다.');
  }
});

// TXT 다운로드 (간소화된 형식 - 일괄 검색용)
downloadTxtBtn.addEventListener('click', async () => {
  const places = await loadPlaces();

  if (places.length === 0) {
    showStatus('다운로드할 장소가 없습니다.', true);
    return;
  }

  // 장소명만 한 줄에 하나씩 (일괄 검색에 바로 붙여넣기 가능)
  const content = places.map(place => place.name).join('\n');

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `naver-map-places-${getDateString()}.txt`;
  a.click();
  URL.revokeObjectURL(url);

  showStatus('TXT 파일을 다운로드했습니다.');
});

// 날짜 문자열 생성
function getDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}-${hours}${minutes}`;
}

// 페이지 로드 시 저장된 장소 불러오기
loadPlaces();
