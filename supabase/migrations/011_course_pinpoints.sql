-- 코스 멀티 핀포인트 지원: pin_lat/pin_lng → pinpoints JSONB

-- 1) pinpoints JSONB 컬럼 추가
ALTER TABLE courses ADD COLUMN pinpoints JSONB NOT NULL DEFAULT '[]';

-- 2) 기존 pin_lat/pin_lng 데이터를 pinpoints 배열로 마이그레이션
UPDATE courses
SET pinpoints = jsonb_build_array(jsonb_build_object('lat', pin_lat, 'lng', pin_lng))
WHERE pin_lat IS NOT NULL AND pin_lng IS NOT NULL;

-- 3) 구 컬럼 제거
ALTER TABLE courses DROP COLUMN pin_lat;
ALTER TABLE courses DROP COLUMN pin_lng;
