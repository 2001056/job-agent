import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { toUserMessage } from '@/lib/error-formatter';

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('resume_chunks')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('[delete-resume]', error);
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[delete-resume]', error);
    return NextResponse.json(
      { error: toUserMessage(error) },
      { status: 500 }
    );
  }
}
