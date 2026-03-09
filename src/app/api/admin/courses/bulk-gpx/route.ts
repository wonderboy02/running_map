import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { supabaseServer } from '@/lib/supabase/server';
import { removeFromStorage } from '@/lib/image-upload';
import { validateGpxFile, validateGpxContent, uploadGpxFile } from '@/lib/gpx-upload';

const MAX_BULK_COUNT = 50;

interface BulkGpxMeta {
  name: string;
}

export const POST = withAuth(async (request: NextRequest, _user) => {
  try {
    const formData = await request.formData();
    const metaRaw = formData.get('metadata') as string;

    if (!metaRaw) {
      return NextResponse.json(
        { success: false, error: '메타데이터가 없습니다.' },
        { status: 400 },
      );
    }

    let metadata: BulkGpxMeta[];
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
        { success: false, error: '업로드할 코스가 없습니다.' },
        { status: 400 },
      );
    }

    if (metadata.length > MAX_BULK_COUNT) {
      return NextResponse.json(
        { success: false, error: `한 번에 최대 ${MAX_BULK_COUNT}개까지 업로드할 수 있습니다.` },
        { status: 400 },
      );
    }

    const results: unknown[] = [];
    const errors: { index: number; name: string; error: string }[] = [];

    for (let i = 0; i < metadata.length; i++) {
      const meta = metadata[i];
      const gpxFile = formData.get(`gpx_${i}`) as File | null;

      if (!gpxFile) {
        errors.push({ index: i, name: meta.name, error: 'GPX 파일이 없습니다.' });
        continue;
      }

      const fileError = validateGpxFile(gpxFile);
      if (fileError) {
        errors.push({ index: i, name: meta.name, error: fileError });
        continue;
      }

      const contentError = await validateGpxContent(gpxFile);
      if (contentError) {
        errors.push({ index: i, name: meta.name, error: contentError });
        continue;
      }

      try {
        const gpx_file_url = await uploadGpxFile(gpxFile);

        const { data, error } = await supabaseServer
          .from('courses')
          .insert({
            name: meta.name,
            gpx_file_url,
            is_active: true,
          })
          .select()
          .single();

        if (error) {
          console.error(`[Courses BulkGPX] DB error for "${meta.name}":`, error);
          await removeFromStorage('courses', [gpx_file_url]);
          errors.push({ index: i, name: meta.name, error: 'DB 저장 실패' });
        } else {
          results.push(data);
        }
      } catch (err) {
        console.error(`[Courses BulkGPX] Processing error for "${meta.name}":`, err);
        errors.push({ index: i, name: meta.name, error: 'GPX 업로드 실패' });
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
    console.error('[Courses BulkGPX] Error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
});
