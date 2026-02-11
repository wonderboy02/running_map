import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { supabaseServer } from '@/lib/supabase/server';
import { validateImageFile, convertAndUpload, removeFromStorage } from '@/lib/image-upload';

const OVERLAY_UPLOAD = { bucket: 'overlays' } as const;

// GET: 전체 오버레이 목록
export const GET = withAuth(async () => {
  try {
    const { data, error } = await supabaseServer
      .from('overlays')
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
    console.error('[Overlays GET] Error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
});

// POST: 새 오버레이 생성 (이미지 WebP 변환 후 업로드)
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const formData = await request.formData();

    const name = formData.get('name') as string;
    const nw_lat = parseFloat(formData.get('nw_lat') as string);
    const nw_lng = parseFloat(formData.get('nw_lng') as string);
    const se_lat = parseFloat(formData.get('se_lat') as string);
    const se_lng = parseFloat(formData.get('se_lng') as string);
    const opacity = parseFloat(formData.get('opacity') as string) || 1.0;
    const is_active = formData.get('is_active') === 'true';
    const imageFile = formData.get('image') as File | null;
    const description = formData.get('description') as string | null;
    const difficulty_str = formData.get('difficulty') as string | null;
    const distance_km_str = formData.get('distance_km') as string | null;
    const pin_lat_str = formData.get('pin_lat') as string | null;
    const pin_lng_str = formData.get('pin_lng') as string | null;

    if (!name || !imageFile) {
      return NextResponse.json(
        { success: false, error: '이름과 이미지는 필수입니다.' },
        { status: 400 },
      );
    }

    const fileError = validateImageFile(imageFile);
    if (fileError) {
      return NextResponse.json(
        { success: false, error: fileError },
        { status: 400 },
      );
    }

    if (isNaN(nw_lat) || isNaN(nw_lng) || isNaN(se_lat) || isNaN(se_lng)) {
      return NextResponse.json(
        { success: false, error: '좌표 값이 올바르지 않습니다.' },
        { status: 400 },
      );
    }

    const image_url = await convertAndUpload(imageFile, OVERLAY_UPLOAD).catch((err) => {
      console.error('[Overlays POST] Upload error:', err);
      return null;
    });

    if (!image_url) {
      return NextResponse.json(
        { success: false, error: '이미지 업로드에 실패했습니다.' },
        { status: 500 },
      );
    }

    const insertData: Record<string, unknown> = {
      name,
      image_url,
      nw_lat,
      nw_lng,
      se_lat,
      se_lng,
      opacity: Math.min(1, Math.max(0, opacity)),
      is_active,
    };
    if (description) insertData.description = description;
    if (difficulty_str) insertData.difficulty = parseInt(difficulty_str, 10);
    if (distance_km_str) insertData.distance_km = parseFloat(distance_km_str);
    if (pin_lat_str) insertData.pin_lat = parseFloat(pin_lat_str);
    if (pin_lng_str) insertData.pin_lng = parseFloat(pin_lng_str);

    const { data, error } = await supabaseServer
      .from('overlays')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[Overlays POST] DB error:', error);
      return NextResponse.json(
        { success: false, error: 'DB 저장에 실패했습니다.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[Overlays POST] Error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
});

// PATCH: 오버레이 수정 / is_active 토글
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
        .from('overlays')
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

    const pin_lat_str = formData.get('pin_lat') as string | null;
    if (pin_lat_str !== null) updates.pin_lat = pin_lat_str ? parseFloat(pin_lat_str) : null;

    const pin_lng_str = formData.get('pin_lng') as string | null;
    if (pin_lng_str !== null) updates.pin_lng = pin_lng_str ? parseFloat(pin_lng_str) : null;

    // 새 이미지가 있으면 WebP 변환 후 교체
    const imageFile = formData.get('image') as File | null;
    if (imageFile && imageFile.size > 0) {
      const fileError = validateImageFile(imageFile);
      if (fileError) {
        return NextResponse.json(
          { success: false, error: fileError },
          { status: 400 },
        );
      }
      // 기존 이미지 삭제
      const { data: existing } = await supabaseServer
        .from('overlays')
        .select('image_url')
        .eq('id', id)
        .single();

      if (existing?.image_url) {
        await removeFromStorage('overlays', [existing.image_url]);
      }

      const image_url = await convertAndUpload(imageFile, OVERLAY_UPLOAD).catch((err) => {
        console.error('[Overlays PATCH] Upload error:', err);
        return null;
      });

      if (!image_url) {
        return NextResponse.json(
          { success: false, error: '이미지 업로드에 실패했습니다.' },
          { status: 500 },
        );
      }

      updates.image_url = image_url;
    }

    const { data, error } = await supabaseServer
      .from('overlays')
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
    console.error('[Overlays PATCH] Error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
});

// DELETE: 오버레이 삭제 + Storage 파일 삭제
export const DELETE = withAuth(async (request: NextRequest) => {
  try {
    const { id }: { id: string } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID가 필요합니다.' },
        { status: 400 },
      );
    }

    // 기존 이미지 URL 가져오기
    const { data: existing } = await supabaseServer
      .from('overlays')
      .select('image_url')
      .eq('id', id)
      .single();

    // Storage에서 이미지 삭제
    if (existing?.image_url) {
      await removeFromStorage('overlays', [existing.image_url]);
    }

    // DB에서 삭제
    const { error } = await supabaseServer
      .from('overlays')
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
    console.error('[Overlays DELETE] Error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
});
