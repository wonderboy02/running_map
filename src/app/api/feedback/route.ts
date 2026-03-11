import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { notifyFeedback } from '@/lib/telegram';
import { FEEDBACK_MAX_LENGTH } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // rating: 정수 1~5 필수
    const rating = Number(body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: '별점을 선택해주세요. (1~5)' },
        { status: 400 },
      );
    }

    // content: 선택, 빈 문자열은 null로 변환
    const rawContent = typeof body.content === 'string' ? body.content.trim() : '';
    const content = rawContent || null;

    if (content && content.length > FEEDBACK_MAX_LENGTH) {
      return NextResponse.json(
        { success: false, error: `내용은 ${FEEDBACK_MAX_LENGTH}자 이내로 입력해주세요.` },
        { status: 400 },
      );
    }

    const { error } = await supabaseServer.from('feedback').insert({ rating, content });

    if (error) {
      console.error('[feedback] Insert error:', error);
      return NextResponse.json(
        { success: false, error: '피드백 저장에 실패했습니다.' },
        { status: 500 },
      );
    }

    after(() => notifyFeedback(rating, content));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[feedback] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
