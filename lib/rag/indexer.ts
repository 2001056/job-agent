import { generateEmbedding } from '../llm/gemini';
import { supabase } from '../supabase';

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 100;
const MIN_CHUNK_LENGTH = 50;

export function splitIntoChunks(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = start + CHUNK_SIZE;
    const chunk = text.slice(start, end).trim();
    if (chunk.length >= MIN_CHUNK_LENGTH) {
      chunks.push(chunk);
    }
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }

  return chunks;
}

export async function indexResume(userId: string, text: string): Promise<void> {
  const { error: deleteError } = await supabase
    .from('resume_chunks')
    .delete()
    .eq('user_id', userId);

  if (deleteError) {
    throw new Error(`기존 resume_chunks 삭제 실패: ${deleteError.message}`);
  }

  const chunks = splitIntoChunks(text);

  for (const content of chunks) {
    const embedding = await generateEmbedding(content);

    const { error: insertError } = await supabase
      .from('resume_chunks')
      .insert({ user_id: userId, content, embedding });

    if (insertError) {
      throw new Error(`resume_chunks 삽입 실패: ${insertError.message}`);
    }
  }
}
