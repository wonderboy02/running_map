import { createBrowserClient } from '@supabase/ssr';

/**
 * 클라이언트 사이드 Supabase 클라이언트 (쿠키 기반)
 *
 * - @supabase/ssr의 createBrowserClient 사용
 * - 세션을 쿠키에 저장 (localStorage 대신)
 * - 서버 사이드와 쿠키 공유 가능
 */
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
