import { generateEmbedding } from '../llm/gemini';
import { supabase } from '../supabase';

export async function retrieveChunks(userId: string, query: string): Promise<string[]> {
  const embedding = await generateEmbedding(query);

  const { data, error } = await supabase.rpc('search_resume_chunks', {
    p_user_id: userId,
    query_embedding: embedding,
    match_count: 5,
  });

  if (error) {
    throw new Error(`search_resume_chunks RPC 호출 실패: ${error.message}`);
  }

  return (data as { content: string }[]).map((row) => row.content);
}
