import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId 쿼리 파라미터는 필수입니다.' },
        { status: 400 }
      );
    }

    const { count, error } = await supabase
      .from('resume_chunks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message);
    }

    const chunkCount = count ?? 0;

    return NextResponse.json({ indexed: chunkCount > 0, chunkCount });
  } catch (error) {
    return NextResponse.json(
      {
        error: `이력서 상태 조회 실패: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 }
    );
  }
}
