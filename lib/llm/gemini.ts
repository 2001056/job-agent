import { GoogleGenerativeAI } from '@google/generative-ai';

function getClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY 환경 변수가 설정되지 않았습니다. .env.local을 확인하세요.');
  }
  return new GoogleGenerativeAI(apiKey);
}

export async function generateText(prompt: string, systemPrompt?: string): Promise<string> {
  try {
    const model = getClient().getGenerativeModel({
      model: 'gemini-2.0-flash',
      ...(systemPrompt && { systemInstruction: systemPrompt }),
    });
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    throw new Error(
      `Gemini generateText 실패: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function generateJSON<T>(prompt: string, systemPrompt?: string): Promise<T> {
  try {
    const model = getClient().getGenerativeModel({
      model: 'gemini-2.0-flash',
      ...(systemPrompt && { systemInstruction: systemPrompt }),
    });
    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    const cleaned = raw.replace(/^```json\s*/m, '').replace(/^```\s*/m, '').replace(/```\s*$/m, '').trim();
    return JSON.parse(cleaned) as T;
  } catch (error) {
    throw new Error(
      `Gemini generateJSON 실패: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const model = getClient().getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    throw new Error(
      `Gemini generateEmbedding 실패: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
