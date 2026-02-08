import { NextRequest, NextResponse } from 'next/server';
import { User } from '@supabase/supabase-js';
import { createAuthClient } from '@/lib/supabase/server-auth';

/**
 * Admin API Route 인증 미들웨어 (HOF 패턴)
 *
 * 사용법:
 * ```typescript
 * export const POST = withAuth(async (request, user) => {
 *   // user는 이미 인증된 상태
 *   // 로직 작성...
 *   return NextResponse.json({ success: true });
 * });
 * ```
 *
 * @param handler - 인증된 사용자와 함께 실행될 핸들러
 * @returns 인증 체크가 포함된 API Route 핸들러
 */
export function withAuth(
  handler: (request: NextRequest, user: User) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // 쿠키 기반 클라이언트로 인증 확인
      const supabaseAuth = await createAuthClient();
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { success: false, error: '인증이 필요합니다.' },
          { status: 401 }
        );
      }

      // 인증된 사용자로 핸들러 실행
      return await handler(request, user);
    } catch (error) {
      console.error('[withAuth] Error:', error);
      return NextResponse.json(
        { success: false, error: '서버 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
  };
}
