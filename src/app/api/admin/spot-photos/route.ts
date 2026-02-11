import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { validateImageFile, convertAndUpload, removeFromStorage } from '@/lib/image-upload';

const SPOT_PHOTO_UPLOAD = { bucket: 'spot-photos', maxSize: 1200, quality: 80 } as const;

// POST: 사진 업로드 (복수)
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const formData = await request.formData();
    const files = formData.getAll('images') as File[];

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: '이미지를 하나 이상 선택해주세요.' },
        { status: 400 },
      );
    }

    // 검증
    for (const file of files) {
      const fileError = validateImageFile(file);
      if (fileError) {
        return NextResponse.json(
          { success: false, error: fileError },
          { status: 400 },
        );
      }
    }

    // 업로드
    const urls: string[] = [];
    for (const file of files) {
      const url = await convertAndUpload(file, SPOT_PHOTO_UPLOAD);
      urls.push(url);
    }

    return NextResponse.json({ success: true, urls });
  } catch (error) {
    console.error('[Spot Photos POST] Error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
});

// DELETE: 사진 삭제 (URL 배열)
export const DELETE = withAuth(async (request: NextRequest) => {
  try {
    const { urls }: { urls: string[] } = await request.json();

    if (!urls || urls.length === 0) {
      return NextResponse.json(
        { success: false, error: '삭제할 URL이 없습니다.' },
        { status: 400 },
      );
    }

    await removeFromStorage('spot-photos', urls);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Spot Photos DELETE] Error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
});
