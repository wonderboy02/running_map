import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { supabaseServer } from '@/lib/supabase/server';
import { validateImageFile, convertAndUpload, removeFromStorage } from '@/lib/image-upload';
import { validateGpxFile, validateGpxContent, uploadGpxFile } from '@/lib/gpx-upload';

const COURSE_UPLOAD = { bucket: 'courses' } as const;

// GET: 전체 코스 목록
export const GET = withAuth(async () => {
  try {
    const { data, error } = await supabaseServer
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[Courses GET] Error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
});

// POST: 새 코스 생성 (이미지 WebP 변환 후 업로드)
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const formData = await request.formData();

    const name = formData.get('name') as string;
    const is_active = formData.get('is_active') === 'true';
    const imageFile = formData.get('image') as File | null;
    const gpxFile = formData.get('gpx_file') as File | null;
    const description = formData.get('description') as string | null;
    const difficulty_str = formData.get('difficulty') as string | null;
    const distance_km_str = formData.get('distance_km') as string | null;
    const pinpointsStr = formData.get('pinpoints') as string | null;
    const searchTagsStr = formData.get('search_tags') as string | null;

    if (!name) {
      return NextResponse.json(
        { success: false, error: '이름은 필수입니다.' },
        { status: 400 },
      );
    }

    if (!gpxFile && !imageFile) {
      return NextResponse.json(
        { success: false, error: 'GPX 파일 또는 이미지는 필수입니다.' },
        { status: 400 },
      );
    }

    const insertData: Record<string, unknown> = { name, is_active };

    if (gpxFile) {
      // --- GPX 흐름 ---
      const gpxError = validateGpxFile(gpxFile);
      if (gpxError) {
        return NextResponse.json(
          { success: false, error: gpxError },
          { status: 400 },
        );
      }
      const contentError = await validateGpxContent(gpxFile);
      if (contentError) {
        return NextResponse.json(
          { success: false, error: contentError },
          { status: 400 },
        );
      }
      insertData.gpx_file_url = await uploadGpxFile(gpxFile);

      // GPX 코스 썸네일 (선택)
      if (formData.get('thumbnail_mode') === 'true' && imageFile && imageFile.size > 0) {
        const fileError = validateImageFile(imageFile);
        if (fileError) {
          return NextResponse.json(
            { success: false, error: fileError },
            { status: 400 },
          );
        }
        insertData.image_url = await convertAndUpload(imageFile, COURSE_UPLOAD);
      }
    } else {
      // --- 기존 이미지 흐름 ---
      const nw_lat = parseFloat(formData.get('nw_lat') as string);
      const nw_lng = parseFloat(formData.get('nw_lng') as string);
      const se_lat = parseFloat(formData.get('se_lat') as string);
      const se_lng = parseFloat(formData.get('se_lng') as string);
      const opacity = parseFloat(formData.get('opacity') as string) || 1.0;

      if (isNaN(nw_lat) || isNaN(nw_lng) || isNaN(se_lat) || isNaN(se_lng)) {
        return NextResponse.json(
          { success: false, error: '좌표 값이 올바르지 않습니다.' },
          { status: 400 },
        );
      }

      const fileError = validateImageFile(imageFile!);
      if (fileError) {
        return NextResponse.json(
          { success: false, error: fileError },
          { status: 400 },
        );
      }

      const image_url = await convertAndUpload(imageFile!, COURSE_UPLOAD).catch((err) => {
        console.error('[Courses POST] Upload error:', err);
        return null;
      });

      if (!image_url) {
        return NextResponse.json(
          { success: false, error: '이미지 업로드에 실패했습니다.' },
          { status: 500 },
        );
      }

      // 하이라이팅 이미지 업로드 (선택)
      let highlight_image_url: string | null = null;
      const highlightFile = formData.get('highlight_image') as File | null;
      if (highlightFile && highlightFile.size > 0) {
        const hlError = validateImageFile(highlightFile);
        if (hlError) {
          return NextResponse.json(
            { success: false, error: `하이라이팅 이미지: ${hlError}` },
            { status: 400 },
          );
        }
        highlight_image_url = await convertAndUpload(highlightFile, COURSE_UPLOAD).catch((err) => {
          console.error('[Courses POST] Highlight upload error:', err);
          return null;
        });
        if (!highlight_image_url) {
          return NextResponse.json(
            { success: false, error: '하이라이팅 이미지 업로드에 실패했습니다.' },
            { status: 500 },
          );
        }
      }

      insertData.image_url = image_url;
      insertData.nw_lat = nw_lat;
      insertData.nw_lng = nw_lng;
      insertData.se_lat = se_lat;
      insertData.se_lng = se_lng;
      insertData.opacity = Math.min(1, Math.max(0, opacity));
      if (highlight_image_url) insertData.highlight_image_url = highlight_image_url;
    }
    if (description) insertData.description = description;
    if (difficulty_str) insertData.difficulty = parseInt(difficulty_str, 10);
    if (distance_km_str) insertData.distance_km = parseFloat(distance_km_str);
    if (pinpointsStr) {
      try {
        insertData.pinpoints = JSON.parse(pinpointsStr);
      } catch {
        return NextResponse.json(
          { success: false, error: '핀포인트 데이터가 올바르지 않습니다.' },
          { status: 400 },
        );
      }
    }
    if (searchTagsStr !== null) {
      try {
        insertData.search_tags = JSON.parse(searchTagsStr);
      } catch {
        insertData.search_tags = [];
      }
    }

    const { data, error } = await supabaseServer
      .from('courses')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[Courses POST] DB error:', error);
      return NextResponse.json(
        { success: false, error: 'DB 저장에 실패했습니다.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[Courses POST] Error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
});

// PATCH: 코스 수정 / is_active 토글
export const PATCH = withAuth(async (request: NextRequest) => {
  try {
    const formData = await request.formData();
    const id = formData.get('id') as string;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID가 필요합니다.' },
        { status: 400 },
      );
    }

    // is_active 토글만 하는 경우
    const toggleOnly = formData.get('toggle_active');
    if (toggleOnly !== null) {
      const is_active = toggleOnly === 'true';
      const { data, error } = await supabaseServer
        .from('courses')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 },
        );
      }
      return NextResponse.json({ success: true, data });
    }

    // 전체 수정
    const updates: Record<string, unknown> = {};

    const name = formData.get('name') as string | null;
    if (name) updates.name = name;

    const nw_lat = formData.get('nw_lat') as string | null;
    if (nw_lat) updates.nw_lat = parseFloat(nw_lat);

    const nw_lng = formData.get('nw_lng') as string | null;
    if (nw_lng) updates.nw_lng = parseFloat(nw_lng);

    const se_lat = formData.get('se_lat') as string | null;
    if (se_lat) updates.se_lat = parseFloat(se_lat);

    const se_lng = formData.get('se_lng') as string | null;
    if (se_lng) updates.se_lng = parseFloat(se_lng);

    const opacity_str = formData.get('opacity') as string | null;
    if (opacity_str !== null) {
      updates.opacity = Math.min(1, Math.max(0, parseFloat(opacity_str)));
    }

    const is_active_str = formData.get('is_active') as string | null;
    if (is_active_str !== null) updates.is_active = is_active_str === 'true';

    const description = formData.get('description') as string | null;
    if (description !== null) updates.description = description || null;

    const difficulty_str = formData.get('difficulty') as string | null;
    if (difficulty_str !== null) updates.difficulty = difficulty_str ? parseInt(difficulty_str, 10) : null;

    const distance_km_str = formData.get('distance_km') as string | null;
    if (distance_km_str !== null) updates.distance_km = distance_km_str ? parseFloat(distance_km_str) : null;

    const pinpointsStr = formData.get('pinpoints') as string | null;
    if (pinpointsStr !== null) {
      try {
        updates.pinpoints = JSON.parse(pinpointsStr);
      } catch {
        return NextResponse.json(
          { success: false, error: '핀포인트 데이터가 올바르지 않습니다.' },
          { status: 400 },
        );
      }
    }

    const searchTagsStr = formData.get('search_tags') as string | null;
    if (searchTagsStr !== null) {
      try {
        updates.search_tags = JSON.parse(searchTagsStr);
      } catch {
        updates.search_tags = [];
      }
    }

    // 새 이미지/GPX가 있으면 교체
    const imageFile = formData.get('image') as File | null;
    const highlightFile = formData.get('highlight_image') as File | null;
    const gpxFile = formData.get('gpx_file') as File | null;
    const thumbnailMode = formData.get('thumbnail_mode') === 'true';
    const needsExisting =
      (imageFile && imageFile.size > 0) ||
      (highlightFile && highlightFile.size > 0) ||
      (gpxFile && gpxFile.size > 0);

    // 기존 URL을 한 번의 쿼리로 가져오기
    let existingUrls: {
      image_url?: string;
      highlight_image_url?: string;
      gpx_file_url?: string;
    } | null = null;
    if (needsExisting) {
      const { data } = await supabaseServer
        .from('courses')
        .select('image_url, highlight_image_url, gpx_file_url')
        .eq('id', id)
        .single();
      existingUrls = data;
    }

    if (imageFile && imageFile.size > 0) {
      const fileError = validateImageFile(imageFile);
      if (fileError) {
        return NextResponse.json(
          { success: false, error: fileError },
          { status: 400 },
        );
      }

      const image_url = await convertAndUpload(imageFile, COURSE_UPLOAD).catch((err) => {
        console.error('[Courses PATCH] Upload error:', err);
        return null;
      });

      if (!image_url) {
        return NextResponse.json(
          { success: false, error: '이미지 업로드에 실패했습니다.' },
          { status: 500 },
        );
      }

      // 새 업로드 성공 후 기존 이미지 삭제 (실패해도 새 URL은 유지)
      if (existingUrls?.image_url) {
        await removeFromStorage('courses', [existingUrls.image_url]);
      }

      // GPX→PNG 전환: 기존 GPX 파일 정리 (thumbnail_mode일 때는 GPX 유지)
      if (!thumbnailMode && existingUrls?.gpx_file_url) {
        await removeFromStorage('courses', [existingUrls.gpx_file_url]);
        updates.gpx_file_url = null;
      }

      updates.image_url = image_url;
    }

    // 하이라이팅 이미지 교체
    if (highlightFile && highlightFile.size > 0) {
      const hlError = validateImageFile(highlightFile);
      if (hlError) {
        return NextResponse.json(
          { success: false, error: `하이라이팅 이미지: ${hlError}` },
          { status: 400 },
        );
      }

      const highlight_image_url = await convertAndUpload(highlightFile, COURSE_UPLOAD).catch((err) => {
        console.error('[Courses PATCH] Highlight upload error:', err);
        return null;
      });

      if (!highlight_image_url) {
        return NextResponse.json(
          { success: false, error: '하이라이팅 이미지 업로드에 실패했습니다.' },
          { status: 500 },
        );
      }

      if (existingUrls?.highlight_image_url) {
        await removeFromStorage('courses', [existingUrls.highlight_image_url]);
      }
      updates.highlight_image_url = highlight_image_url;
    }

    // 하이라이팅 이미지 제거 (파일 업로드 없이 삭제 요청)
    const removeHighlight = formData.get('remove_highlight_image');
    if (removeHighlight === 'true' && !highlightFile) {
      if (!existingUrls) {
        const { data } = await supabaseServer
          .from('courses')
          .select('highlight_image_url')
          .eq('id', id)
          .single();
        existingUrls = data;
      }
      if (existingUrls?.highlight_image_url) {
        await removeFromStorage('courses', [existingUrls.highlight_image_url]);
      }
      updates.highlight_image_url = null;
    }

    // GPX 파일 교체
    if (gpxFile && gpxFile.size > 0) {
      const gpxError = validateGpxFile(gpxFile);
      if (gpxError) {
        return NextResponse.json(
          { success: false, error: gpxError },
          { status: 400 },
        );
      }
      const contentError = await validateGpxContent(gpxFile);
      if (contentError) {
        return NextResponse.json(
          { success: false, error: contentError },
          { status: 400 },
        );
      }
      const gpx_file_url = await uploadGpxFile(gpxFile);

      // 기존 GPX 파일 정리
      if (existingUrls?.gpx_file_url) {
        await removeFromStorage('courses', [existingUrls.gpx_file_url]);
      }

      // PNG -> GPX 전환: 기존 이미지 파일도 정리
      if (!existingUrls?.gpx_file_url) {
        const imageUrls = [
          existingUrls?.image_url,
          existingUrls?.highlight_image_url,
        ].filter(Boolean) as string[];
        if (imageUrls.length > 0) {
          await removeFromStorage('courses', imageUrls);
        }
        updates.image_url = null;
        updates.highlight_image_url = null;
      }

      updates.gpx_file_url = gpx_file_url;
    }

    const { data, error } = await supabaseServer
      .from('courses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[Courses PATCH] Error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
});

// DELETE: 코스 삭제 + Storage 파일 삭제
export const DELETE = withAuth(async (request: NextRequest) => {
  try {
    const { id }: { id: string } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID가 필요합니다.' },
        { status: 400 },
      );
    }

    // 기존 파일 URL 가져오기
    const { data: existing } = await supabaseServer
      .from('courses')
      .select('image_url, highlight_image_url, gpx_file_url')
      .eq('id', id)
      .single();

    // Storage에서 파일 삭제
    const urlsToDelete = [
      existing?.image_url,
      existing?.highlight_image_url,
      existing?.gpx_file_url,
    ].filter(Boolean) as string[];

    if (urlsToDelete.length > 0) {
      await removeFromStorage('courses', urlsToDelete);
    }

    // DB에서 삭제
    const { error } = await supabaseServer
      .from('courses')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Courses DELETE] Error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
});
