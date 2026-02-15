/**
 * Vercel 환경 판별 유틸리티.
 * NEXT_PUBLIC_VERCEL_ENV는 Vercel이 빌드 시 자동 주입한다.
 * - 'production': 프로덕션 배포
 * - 'preview': PR 미리보기
 * - undefined: 로컬 개발 (npm run dev)
 */
const VERCEL_ENV = process.env.NEXT_PUBLIC_VERCEL_ENV;

/** Vercel Production 배포인지 여부 */
export const isProduction = VERCEL_ENV === 'production';
