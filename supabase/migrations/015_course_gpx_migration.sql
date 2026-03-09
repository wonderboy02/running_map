BEGIN;

-- 기존 NOT NULL 완화 (GPX 코스는 이미지/좌표 없음)
ALTER TABLE courses ALTER COLUMN image_url DROP NOT NULL;
ALTER TABLE courses ALTER COLUMN nw_lat SET DEFAULT 0;
ALTER TABLE courses ALTER COLUMN nw_lng SET DEFAULT 0;
ALTER TABLE courses ALTER COLUMN se_lat SET DEFAULT 0;
ALTER TABLE courses ALTER COLUMN se_lng SET DEFAULT 0;

-- GPX 파일 URL (nullable: 기존 PNG 코스는 null)
ALTER TABLE courses ADD COLUMN gpx_file_url TEXT;

COMMIT;
