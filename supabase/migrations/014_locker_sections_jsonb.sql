BEGIN;

-- 1. 새 JSONB 컬럼
ALTER TABLE spots ADD COLUMN locker_sections jsonb;

-- 2. 기존 데이터 → 1-element 배열로 변환 (짐보관 카테고리만)
UPDATE spots
SET locker_sections = jsonb_build_array(
  jsonb_build_object(
    'detail_address', detail_address,
    'locker_small',   locker_small,
    'locker_medium',  locker_medium,
    'locker_large',   locker_large
  )
)
WHERE category = '짐보관'
  AND (detail_address IS NOT NULL
    OR locker_small IS NOT NULL
    OR locker_medium IS NOT NULL
    OR locker_large IS NOT NULL);

-- 3. 기존 컬럼 삭제
ALTER TABLE spots DROP COLUMN detail_address;
ALTER TABLE spots DROP COLUMN locker_small;
ALTER TABLE spots DROP COLUMN locker_medium;
ALTER TABLE spots DROP COLUMN locker_large;

COMMIT;
