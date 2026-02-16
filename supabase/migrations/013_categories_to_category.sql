-- 카테고리 단일 선택 전환 + 짐보관 전용 필드 추가
-- categories (text[]) → category (text) 마이그레이션

BEGIN;

-- 1. category 컬럼 추가 (임시 기본값)
ALTER TABLE spots ADD COLUMN category text NOT NULL DEFAULT '러너스팟';

-- 2. 기존 데이터 마이그레이션: categories 배열의 첫 번째 요소를 category로 복사
UPDATE spots SET category = categories[1]
WHERE array_length(categories, 1) > 0;

-- 3. 짐보관 전용 필드 추가 (nullable)
ALTER TABLE spots ADD COLUMN detail_address text;
ALTER TABLE spots ADD COLUMN locker_small integer;
ALTER TABLE spots ADD COLUMN locker_medium integer;
ALTER TABLE spots ADD COLUMN locker_large integer;

-- 4. 기존 categories 배열 컬럼 삭제
ALTER TABLE spots DROP COLUMN categories;

-- 5. 기본값 제거 (앞으로는 INSERT 시 명시적 지정 필수)
ALTER TABLE spots ALTER COLUMN category DROP DEFAULT;

COMMIT;
