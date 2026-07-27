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

export async function generateText(prompt: string, systemPrompt?: string): Promise<string> {
  try {
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
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
      response_format: { type: 'json_object' },
      messages: [
        ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
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
