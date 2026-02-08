import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * 쿠키 기반 Supabase 클라이언트 생성 (인증 확인용)
 *
 * - Anon Key 사용
 * - 사용자의 JWT 토큰을 쿠키에서 읽어서 인증 확인
 * - API Route에서 auth.getUser()로 사용자 확인 시 사용
 *
 * 주의: 각 요청마다 새로 생성해야 함 (싱글턴 아님)
 */
export async function createAuthClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}
