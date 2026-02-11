BEGIN;

-- 오버레이 상세 정보 컬럼 추가
ALTER TABLE overlays
  ADD COLUMN description TEXT,
  ADD COLUMN difficulty INTEGER CHECK (difficulty >= 1 AND difficulty <= 10),
  ADD COLUMN distance_km REAL,
  ADD COLUMN pin_lat DOUBLE PRECISION,
  ADD COLUMN pin_lng DOUBLE PRECISION;

COMMIT;
