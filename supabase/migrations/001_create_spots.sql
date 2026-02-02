BEGIN;

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

-- admins 테이블 생성 (auth.users와 FK 연결)
CREATE TABLE admins (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (id)
);

-- RLS 활성화
ALTER TABLE spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- admin 체크 함수 (SECURITY DEFINER로 성능 최적화)
CREATE OR REPLACE FUNCTION is_admin()
  RETURNS boolean AS
$$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM admins
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- spots 정책: 누구나 조회 가능 (비로그인 포함)
CREATE POLICY "spots_select" ON spots
  FOR SELECT USING (true);

-- spots 정책: admin만 생성 가능
CREATE POLICY "spots_insert" ON spots
  FOR INSERT WITH CHECK (
    (SELECT is_admin())
  );

-- spots 정책: admin만 수정 가능
CREATE POLICY "spots_update" ON spots
  FOR UPDATE USING (
    (SELECT is_admin())
  );

-- spots 정책: admin만 삭제 가능
CREATE POLICY "spots_delete" ON spots
  FOR DELETE USING (
    (SELECT is_admin())
  );

-- admins 정책: admin만 조회 가능
CREATE POLICY "admins_select" ON admins
  FOR SELECT USING (
    (SELECT is_admin())
  );

-- admins 정책: admin만 추가 가능
CREATE POLICY "admins_insert" ON admins
  FOR INSERT WITH CHECK (
    (SELECT is_admin())
  );

-- admins 정책: admin만 삭제 가능
CREATE POLICY "admins_delete" ON admins
  FOR DELETE USING (
    (SELECT is_admin())
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

COMMIT;
