import { createClient } from "@supabase/supabase-js";

// 서버 사이드 전용 Supabase 클라이언트 (Service Role Key 사용)
// Admin API에서 RLS 우회하여 모든 데이터 접근 가능
export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
