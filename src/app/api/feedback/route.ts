import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { notifyFeedback } from '@/lib/telegram';

const MAX_CONTENT_LENGTH = 1000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const content = typeof body.content === 'string' ? body.content.trim() : '';

    if (!content) {
      return NextResponse.json(
        { success: false, error: '내용을 입력해주세요.' },
        { status: 400 },
      );
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { success: false, error: `내용은 ${MAX_CONTENT_LENGTH}자 이내로 입력해주세요.` },
        { status: 400 },
      );
    }

    const { error } = await supabaseServer.from('feedback').insert({ content });

    if (error) {
      console.error('[feedback] Insert error:', error);
      return NextResponse.json(
        { success: false, error: '피드백 저장에 실패했습니다.' },
        { status: 500 },
      );
    }

    after(() => notifyFeedback(content));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
