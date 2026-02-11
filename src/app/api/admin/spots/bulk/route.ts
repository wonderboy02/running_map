import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { supabaseServer } from '@/lib/supabase/server';
import { removeFromStorage } from '@/lib/image-upload';

interface SpotInsertData {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  categories?: string[];
  extra_data?: {
    naver_category?: string;
    naver_link?: string;
  };
}

interface BulkInsertRequest {
  spots: SpotInsertData[];
}

interface BulkUpdateRequest {
  spotIds: string[];
  updates: {
    is_highlighted?: boolean;
    categories?: {
      action: 'add' | 'remove';
      values: string[];
    };
    operating_hours?: Record<string, string>;
    description?: string;
    phone?: string;
  };
}

// POST: 벌크 저장
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body: BulkInsertRequest = await request.json();

    if (!body.spots || !Array.isArray(body.spots) || body.spots.length === 0) {
      return NextResponse.json(
        { success: false, error: '추가할 장소가 없습니다.' },
        { status: 400 }
      );
    }

    // 중복 체크 (이름 + 주소)
    const duplicateChecks = await Promise.all(
      body.spots.map(async (spot) => {
        const { data } = await supabaseServer
          .from('spots')
          .select('id, name')
          .eq('name', spot.name)
          .eq('address', spot.address)
          .maybeSingle();

        return {
          spot,
          isDuplicate: !!data,
          existingId: data?.id
        };
      })
    );

    // 중복이 아닌 장소만 필터링
    const spotsToInsert = duplicateChecks
      .filter(check => !check.isDuplicate)
      .map(check => ({
        name: check.spot.name,
        address: check.spot.address,
        latitude: check.spot.latitude,
        longitude: check.spot.longitude,
        categories: check.spot.categories || [], // 요청에서 받은 카테고리 사용
        is_highlighted: false,
        phone: check.spot.phone || null,
        description: null,
        operating_hours: null,
        photos: [],
        extra_data: check.spot.extra_data || {}
      }));

    const skippedCount = body.spots.length - spotsToInsert.length;

    // DB에 삽입
    if (spotsToInsert.length > 0) {
      const { data, error } = await supabaseServer
        .from('spots')
        .insert(spotsToInsert)
        .select();

      if (error) {
        console.error('[Bulk Insert] Error:', error);
        return NextResponse.json(
          { success: false, error: 'DB 저장 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }

      console.log(`[Bulk Insert] ${data.length}건 추가, ${skippedCount}건 중복 건너뜀`);

      return NextResponse.json({
        success: true,
        inserted: data.length,
        skipped: skippedCount,
        message: `${data.length}개 장소가 추가되었습니다.${skippedCount > 0 ? ` (${skippedCount}개 중복 제외)` : ''}`
      });
    } else {
      return NextResponse.json({
        success: false,
        inserted: 0,
        skipped: skippedCount,
        message: '모든 장소가 이미 존재합니다.'
      });
    }

  } catch (error) {
    console.error('[Bulk Insert] Error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
});

// PATCH: 일괄 수정
export const PATCH = withAuth(async (request: NextRequest) => {
  try {
    const body: BulkUpdateRequest = await request.json();

    if (!body.spotIds || !Array.isArray(body.spotIds) || body.spotIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '수정할 장소가 선택되지 않았습니다.' },
        { status: 400 }
      );
    }

    const updates: any = {};

    // 하이라이트 설정/해제
    if (body.updates.is_highlighted !== undefined) {
      updates.is_highlighted = body.updates.is_highlighted;
    }

    // 카테고리 추가/제거
    if (body.updates.categories) {
      const { action, values } = body.updates.categories;

      // 현재 장소들의 카테고리 가져오기
      const { data: spots, error: fetchError } = await supabaseServer
        .from('spots')
        .select('id, categories')
        .in('id', body.spotIds);

      if (fetchError || !spots) {
        return NextResponse.json(
          { success: false, error: '장소 정보를 가져오는데 실패했습니다.' },
          { status: 500 }
        );
      }

      // 각 장소마다 카테고리 업데이트
      const updatePromises = spots.map(async (spot) => {
        let newCategories = [...(spot.categories || [])];

        if (action === 'add') {
          // 중복 제거하면서 추가
          const uniqueCategories = Array.from(new Set([...newCategories, ...values]));
          newCategories = uniqueCategories;
        } else if (action === 'remove') {
          newCategories = newCategories.filter(cat => !values.includes(cat));
        }

        return supabaseServer
          .from('spots')
          .update({ categories: newCategories })
          .eq('id', spot.id);
      });

      await Promise.all(updatePromises);
    }

    // 기타 필드 업데이트
    if (body.updates.operating_hours) {
      updates.operating_hours = body.updates.operating_hours;
    }
    if (body.updates.description !== undefined) {
      updates.description = body.updates.description;
    }
    if (body.updates.phone !== undefined) {
      updates.phone = body.updates.phone;
    }

    // 카테고리 외 필드 업데이트
    if (Object.keys(updates).length > 0) {
      const { error } = await supabaseServer
        .from('spots')
        .update(updates)
        .in('id', body.spotIds);

      if (error) {
        console.error('[Bulk Update] Error:', error);
        return NextResponse.json(
          { success: false, error: 'DB 업데이트 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }
    }

    console.log(`[Bulk Update] ${body.spotIds.length}건 수정`);

    return NextResponse.json({
      success: true,
      updated: body.spotIds.length,
      message: `${body.spotIds.length}개 장소가 수정되었습니다.`
    });

  } catch (error) {
    console.error('[Bulk Update] Error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
});

// DELETE: 일괄 삭제
export const DELETE = withAuth(async (request: NextRequest) => {
  try {
    const { spotIds }: { spotIds: string[] } = await request.json();

    if (!spotIds || !Array.isArray(spotIds) || spotIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '삭제할 장소가 선택되지 않았습니다.' },
        { status: 400 }
      );
    }

    // Storage에서 사진 파일 정리
    const { data: spots } = await supabaseServer
      .from('spots')
      .select('photos')
      .in('id', spotIds);

    if (spots) {
      const allPhotos = spots.flatMap((s) => s.photos ?? []);
      if (allPhotos.length > 0) {
        try {
          await removeFromStorage('spot-photos', allPhotos);
        } catch (err) {
          console.error('[Bulk Delete] 사진 파일 정리 실패:', err);
        }
      }
    }

    const { error } = await supabaseServer
      .from('spots')
      .delete()
      .in('id', spotIds);

    if (error) {
      console.error('[Bulk Delete] Error:', error);
      return NextResponse.json(
        { success: false, error: 'DB 삭제 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    console.log(`[Bulk Delete] ${spotIds.length}건 삭제`);

    return NextResponse.json({
      success: true,
      deleted: spotIds.length,
      message: `${spotIds.length}개 장소가 삭제되었습니다.`
    });

  } catch (error) {
    console.error('[Bulk Delete] Error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
});
