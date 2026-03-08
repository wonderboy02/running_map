import { supabaseServer } from '@/lib/supabase/server';

const MAX_GPX_SIZE = 5 * 1024 * 1024; // 5MB

export function validateGpxFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith('.gpx')) {
    return 'GPX 파일(.gpx)만 업로드할 수 있습니다.';
  }
  if (file.size > MAX_GPX_SIZE) {
    return `파일 크기가 5MB를 초과합니다. (${(file.size / 1024 / 1024).toFixed(1)}MB)`;
  }
  return null;
}

/** 서버에서 GPX XML 구조 기본 검증 (POST/PATCH에서 upload 전에 호출) */
export async function validateGpxContent(file: File): Promise<string | null> {
  const text = await file.text();
  if (!/<gpx[\s>]/.test(text)) {
    return '유효한 GPX 파일이 아닙니다. (<gpx> 루트 요소 없음)';
  }
  return null;
}

export async function uploadGpxFile(file: File): Promise<string> {
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.gpx`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabaseServer.storage
    .from('courses')
    .upload(fileName, buffer, {
      contentType: 'application/gpx+xml',
      cacheControl: '31536000',
      upsert: false,
    });

  if (error) throw error;

  const { data: urlData } = supabaseServer.storage
    .from('courses')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}
