import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Supabase Storage 절대 URL → 같은 도메인 상대 경로로 변환
 * (Vercel Edge 캐싱 / next/image 경유용)
 */
export function rewriteStorageUrl(url: string): string {
  return url.replace(/https:\/\/[^/]+\/storage\/v1\/object\/public/, '/storage');
}

export function isValidHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
