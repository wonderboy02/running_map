import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { withAuth } from '@/lib/auth/withAuth';
import { supabaseServer } from '@/lib/supabase/server';

const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function validateImageFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return `허용되지 않는 파일 형식입니다. (${ALLOWED_MIME_TYPES.join(', ')})`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `파일 크기가 10MB를 초과합니다. (${(file.size / 1024 / 1024).toFixed(1)}MB)`;
  }
  return null;
}

async function convertAndUpload(imageFile: File): Promise<string> {
  const arrayBuffer = await imageFile.arrayBuffer();
  let webpBuffer: Buffer;
  try {
    webpBuffer = await sharp(Buffer.from(arrayBuffer))
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw new Error(
      '이미지 변환에 실패했습니다. 유효한 이미지 파일인지 확인해주세요.',
    );
  }

  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;

  const { error } = await supabaseServer.storage
    .from('overlays')
    .upload(fileName, webpBuffer, {
      contentType: 'image/webp',
      cacheControl: '31536000',
      upsert: false,
    });

  if (error) throw error;

  const { data: urlData } = supabaseServer.storage
    .from('overlays')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

interface BulkOverlayMeta {
  name: string;
  nw_lat: number;
  nw_lng: number;
  se_lat: number;
  se_lng: number;
  opacity: number;
}

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const formData = await request.formData();
    const metaRaw = formData.get('metadata') as string;

    if (!metaRaw) {
      return NextResponse.json(
        { success: false, error: '메타데이터가 없습니다.' },
        { status: 400 },
      );
    }

    let metadata: BulkOverlayMeta[];
    try {
      metadata = JSON.parse(metaRaw);
    } catch {
      return NextResponse.json(
        { success: false, error: '메타데이터 형식이 올바르지 않습니다.' },
        { status: 400 },
      );
    }

    if (!Array.isArray(metadata) || metadata.length === 0) {
      return NextResponse.json(
        { success: false, error: '업로드할 오버레이가 없습니다.' },
        { status: 400 },
      );
    }

    const results: unknown[] = [];
    const errors: { index: number; name: string; error: string }[] = [];

    for (let i = 0; i < metadata.length; i++) {
      const meta = metadata[i];
      const imageFile = formData.get(`image_${i}`) as File | null;

      if (!imageFile) {
        errors.push({
          index: i,
          name: meta.name,
          error: '이미지 파일이 없습니다.',
        });
        continue;
      }

      const fileError = validateImageFile(imageFile);
      if (fileError) {
        errors.push({ index: i, name: meta.name, error: fileError });
        continue;
      }

      if (
        isNaN(meta.nw_lat) ||
        isNaN(meta.nw_lng) ||
        isNaN(meta.se_lat) ||
        isNaN(meta.se_lng)
      ) {
        errors.push({
          index: i,
          name: meta.name,
          error: '좌표 값이 올바르지 않습니다.',
        });
        continue;
      }

      try {
        const image_url = await convertAndUpload(imageFile);

        const { data, error } = await supabaseServer
          .from('overlays')
          .insert({
            name: meta.name,
            image_url,
            nw_lat: meta.nw_lat,
            nw_lng: meta.nw_lng,
            se_lat: meta.se_lat,
            se_lng: meta.se_lng,
            opacity: Math.min(1, Math.max(0, meta.opacity)),
            is_active: true,
          })
          .select()
          .single();

        if (error) {
          console.error(`[Overlays Bulk] DB error for "${meta.name}":`, error);
          errors.push({ index: i, name: meta.name, error: 'DB 저장 실패' });
        } else {
          results.push(data);
        }
      } catch (err) {
        console.error(
          `[Overlays Bulk] Processing error for "${meta.name}":`,
          err,
        );
        errors.push({ index: i, name: meta.name, error: '이미지 처리 실패' });
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      errors,
      total: metadata.length,
      successCount: results.length,
      errorCount: errors.length,
    });
  } catch (error) {
    console.error('[Overlays Bulk] Error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
});
