import Groq from 'groq-sdk';
import { GoogleGenAI } from '@google/genai';

function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY 환경 변수가 설정되지 않았습니다. .env.local을 확인하세요.');
  }
  return new Groq({ apiKey });
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY 환경 변수가 설정되지 않았습니다. .env.local을 확인하세요.');
  }
  return new GoogleGenAI({ apiKey });
}

const KOREAN_ENFORCE = '당신은 반드시 한국어로만 응답합니다. 어떤 경우에도 중국어·일본어·영어 등 다른 언어를 사용하지 않습니다.\n\n';

export async function generateText(prompt: string, systemPrompt?: string): Promise<string> {
  try {
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      messages: [
        {
          role: 'system' as const,
          content: KOREAN_ENFORCE + (systemPrompt ?? ''),
        },
        { role: 'user' as const, content: prompt },
      ],
    });
    return completion.choices[0]?.message?.content ?? '';
  } catch (error) {
    throw new Error(
      `Groq generateText 실패: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function generateJSON<T>(prompt: string, systemPrompt?: string): Promise<T> {
  try {
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system' as const,
          content: KOREAN_ENFORCE + (systemPrompt ?? ''),
        },
        { role: 'user' as const, content: prompt },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? '{}';
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new Error(
      `Groq generateJSON 실패: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const ai = getGeminiClient();
    const response = await ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: text,
    });
    const values = response.embeddings?.[0]?.values;
    if (!values) throw new Error('임베딩 값을 반환받지 못했습니다.');
    return values;
  } catch (error) {
    throw new Error(
      `Gemini generateEmbedding 실패: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
