import sharp from 'sharp';
import { supabaseServer } from '@/lib/supabase/server';

export const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/** 이미지 파일 검증 — 에러 메시지 반환, 유효하면 null */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return `허용되지 않는 파일 형식입니다. (${ALLOWED_MIME_TYPES.join(', ')})`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `파일 크기가 10MB를 초과합니다. (${(file.size / 1024 / 1024).toFixed(1)}MB)`;
  }
  return null;
}

export interface ConvertAndUploadOptions {
  /** Supabase Storage 버킷 이름 */
  bucket: string;
  /** 장축 리사이즈 px (미지정 시 리사이즈 안 함) */
  maxSize?: number;
  /** WebP quality (기본 85) */
  quality?: number;
}

/** 이미지를 WebP 변환 (+ 선택적 리사이즈) 후 Storage에 업로드하고 Public URL 반환 */
export async function convertAndUpload(
  imageFile: File,
  options: ConvertAndUploadOptions,
): Promise<string> {
  const { bucket, maxSize, quality = 85 } = options;
  const arrayBuffer = await imageFile.arrayBuffer();

  let pipeline = sharp(Buffer.from(arrayBuffer));
  if (maxSize) {
    pipeline = pipeline.resize(maxSize, maxSize, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  let webpBuffer: Buffer;
  try {
    webpBuffer = await pipeline.webp({ quality }).toBuffer();
  } catch {
    throw new Error('이미지 변환에 실패했습니다. 유효한 이미지 파일인지 확인해주세요.');
  }

  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;

  const { error } = await supabaseServer.storage
    .from(bucket)
    .upload(fileName, webpBuffer, {
      contentType: 'image/webp',
      cacheControl: '31536000',
      upsert: false,
    });

  if (error) throw error;

  const { data: urlData } = supabaseServer.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

/** Storage URL 배열에서 파일명을 추출하여 일괄 삭제 */
export async function removeFromStorage(bucket: string, urls: string[]): Promise<void> {
  const fileNames = urls
    .map((url) => {
      try {
        return new URL(url).pathname.split('/').pop();
      } catch {
        return url.split('/').pop();
      }
    })
    .filter((name): name is string => !!name);

  if (fileNames.length > 0) {
    const { error } = await supabaseServer.storage.from(bucket).remove(fileNames);
    if (error) {
      console.error(`[removeFromStorage] ${bucket} 삭제 실패:`, error.message, fileNames);
      throw new Error(`Storage 파일 삭제 실패: ${error.message}`);
    }
  }
}
