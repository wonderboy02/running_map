-- spots 테이블 생성
CREATE TABLE spots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  categories TEXT[] NOT NULL DEFAULT '{}',
  is_highlighted BOOLEAN DEFAULT FALSE,
  operating_hours JSONB,
  description TEXT,
  phone TEXT,
  photos TEXT[] DEFAULT '{}',
  extra_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE spots ENABLE ROW LEVEL SECURITY;

-- 누구나 spots 조회 가능 (비로그인 포함)
CREATE POLICY "spots_select" ON spots
  FOR SELECT USING (true);

-- admin만 spots 생성 가능
CREATE POLICY "spots_insert" ON spots
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- admin만 spots 수정 가능
CREATE POLICY "spots_update" ON spots
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- admin만 spots 삭제 가능
CREATE POLICY "spots_delete" ON spots
  FOR DELETE USING (
    auth.jwt() ->> 'role' = 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER spots_updated_at
  BEFORE UPDATE ON spots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
