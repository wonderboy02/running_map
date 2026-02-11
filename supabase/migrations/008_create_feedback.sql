-- 008: 피드백 테이블 생성
BEGIN;

CREATE TABLE IF NOT EXISTS public.feedback (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content    TEXT NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- 누구나 피드백 작성 가능
CREATE POLICY "Anyone can insert feedback"
  ON public.feedback FOR INSERT
  WITH CHECK (true);

-- Admin만 조회/수정/삭제 가능
CREATE POLICY "Admins can view feedback"
  ON public.feedback FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update feedback"
  ON public.feedback FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete feedback"
  ON public.feedback FOR DELETE
  USING (public.is_admin());

COMMIT;
