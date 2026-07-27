import { NextRequest, NextResponse } from 'next/server';
import { indexResume, splitIntoChunks } from '@/lib/rag/indexer';
import { toUserMessage } from '@/lib/error-formatter';

// pdf-parse v1 — require로 로드 (CJS default export)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (
  buf: Buffer
) => Promise<{ text: string; numpages: number }>;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_TEXT_LENGTH = 10_000; // 10,000자

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
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { success: false, error: `PDF 파일 크기는 5MB 이하여야 합니다. (현재: ${(file.size / 1024 / 1024).toFixed(1)}MB)` },
          { status: 413 }
        );
      }
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const { text: extractedText } = await pdfParse(buffer);
      text = extractedText;
    } else if (typeof textField === 'string' && textField.trim().length > 0) {
      if (textField.length > MAX_TEXT_LENGTH) {
        return NextResponse.json(
          { success: false, error: `텍스트는 ${MAX_TEXT_LENGTH.toLocaleString()}자 이하여야 합니다. (현재: ${textField.length.toLocaleString()}자)` },
          { status: 413 }
        );
      }
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
    console.error('[upload]', error);
    return NextResponse.json(
      { success: false, error: toUserMessage(error) },
      { status: 500 }
    );
  }
}
