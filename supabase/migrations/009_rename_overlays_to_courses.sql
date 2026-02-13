BEGIN;

-- 테이블명 변경: overlays → courses
ALTER TABLE overlays RENAME TO courses;

-- RLS 정책 이름 변경
ALTER POLICY "overlays_select" ON courses RENAME TO "courses_select";
ALTER POLICY "overlays_insert" ON courses RENAME TO "courses_insert";
ALTER POLICY "overlays_update" ON courses RENAME TO "courses_update";
ALTER POLICY "overlays_delete" ON courses RENAME TO "courses_delete";

-- 트리거 이름 변경
ALTER TRIGGER overlays_updated_at ON courses RENAME TO courses_updated_at;

COMMIT;
