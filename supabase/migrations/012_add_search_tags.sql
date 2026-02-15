-- spots 테이블에 검색 태그 추가
ALTER TABLE spots ADD COLUMN search_tags text[] NOT NULL DEFAULT '{}';

-- courses 테이블에 검색 태그 추가
ALTER TABLE courses ADD COLUMN search_tags text[] NOT NULL DEFAULT '{}';
