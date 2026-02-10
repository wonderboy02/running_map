BEGIN;

-- overlays 테이블 생성
CREATE TABLE overlays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  nw_lat DOUBLE PRECISION NOT NULL,
  nw_lng DOUBLE PRECISION NOT NULL,
  se_lat DOUBLE PRECISION NOT NULL,
  se_lng DOUBLE PRECISION NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE overlays ENABLE ROW LEVEL SECURITY;

-- overlays 정책: 누구나 조회 가능 (비로그인 포함)
CREATE POLICY "overlays_select" ON overlays
  FOR SELECT USING (true);

-- overlays 정책: admin만 생성 가능
CREATE POLICY "overlays_insert" ON overlays
  FOR INSERT WITH CHECK (
    (SELECT is_admin())
  );

-- overlays 정책: admin만 수정 가능
CREATE POLICY "overlays_update" ON overlays
  FOR UPDATE USING (
    (SELECT is_admin())
  );

-- overlays 정책: admin만 삭제 가능
CREATE POLICY "overlays_delete" ON overlays
  FOR DELETE USING (
    (SELECT is_admin())
  );

-- updated_at 자동 갱신 트리거 (기존 함수 재사용)
CREATE TRIGGER overlays_updated_at
  BEFORE UPDATE ON overlays
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

COMMIT;
