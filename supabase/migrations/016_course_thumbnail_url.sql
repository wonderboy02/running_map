-- 코스 썸네일을 오버레이 이미지(image_url)와 분리
-- thumbnail_url: 리스트/카드에 표시되는 썸네일 (모든 코스 공용)
-- image_url: 레거시 PNG 코스의 지도 GroundOverlay 전용 (변경 불가)
-- 표시 로직: thumbnail_url ?? image_url (썸네일 없으면 오버레이 fallback)
ALTER TABLE courses ADD COLUMN thumbnail_url text;
