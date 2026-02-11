import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/withAuth';
import { supabaseServer } from '@/lib/supabase/server';

/** 전체 목록 (최신순) */
export const GET = withAuth(async () => {
  const { data, error } = await supabaseServer
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
});

/** is_read 토글 */
export const PATCH = withAuth(async (request: NextRequest) => {
  const { id, is_read } = await request.json();

  if (!id || typeof is_read !== 'boolean') {
    return NextResponse.json(
      { success: false, error: 'id와 is_read(boolean)가 필요합니다.' },
      { status: 400 },
    );
  }

  const { error } = await supabaseServer
    .from('feedback')
    .update({ is_read })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
});

/** 삭제 */
export const DELETE = withAuth(async (request: NextRequest) => {
  const { id } = await request.json();

  if (!id) {
    return NextResponse.json(
      { success: false, error: 'id가 필요합니다.' },
      { status: 400 },
    );
  }

  const { error } = await supabaseServer
    .from('feedback')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
});
