-- 겹치는 GPX 코스를 시각적으로 구분하기 위한 pulse 그룹 컬럼
-- 같은 pulse_group 값의 코스들은 동일한 타이밍에 맥동하고,
-- 다른 값의 코스들은 위상(phase)이 달라 번갈아 보인다.
-- null이면 펄스 없음(정적 표시).
-- smallint로 정의하여 향후 그룹 수 확장 가능.
ALTER TABLE courses
  ADD COLUMN pulse_group smallint DEFAULT NULL;

COMMENT ON COLUMN courses.pulse_group IS
  'GPX 폴리라인 맥동 그룹 (null=정적, 1~N=같은 그룹은 같은 타이밍). 현재 1~2만 사용.';
