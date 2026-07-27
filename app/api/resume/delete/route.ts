import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId가 필요합니다.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('resume_chunks')
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw new Error(`이력서 삭제 실패: ${error.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
