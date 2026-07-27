import { NextRequest, NextResponse } from 'next/server';
import { indexResume, splitIntoChunks } from '@/lib/rag/indexer';

// pdf-parse v1 — require로 로드 (CJS default export)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (
  buf: Buffer
) => Promise<{ text: string; numpages: number }>;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const textField = formData.get('text');

    const userId =
      request.headers.get('x-user-id') ||
      (formData.get('userId') as string | null) ||
      'anonymous';

    let text: string;

    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const { text: extractedText } = await pdfParse(buffer);
      text = extractedText;
    } else if (typeof textField === 'string' && textField.trim().length > 0) {
      text = textField;
    } else {
      return NextResponse.json(
        { success: false, error: 'file(PDF) 또는 text 필드 중 하나는 필수입니다.' },
        { status: 400 }
      );
    }

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '이력서 텍스트를 추출할 수 없습니다.' },
        { status: 400 }
      );
    }

    await indexResume(userId, text);

    const chunkCount = splitIntoChunks(text).length;

    return NextResponse.json({ success: true, chunks: chunkCount });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `이력서 업로드 처리 실패: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 }
    );
  }
}
