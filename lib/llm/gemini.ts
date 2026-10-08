import Groq from 'groq-sdk';
import { GoogleGenAI } from '@google/genai';
import { generateJSONWithClaude, generateTextWithClaude } from './claude';

// LLM_PROVIDER=anthropic 이면 텍스트 생성을 Claude로 보낸다 (기본: Groq). 임베딩은 항상 Gemini.
function isClaudeEnabled(): boolean {
  return process.env.LLM_PROVIDER === 'anthropic';
}

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

const MODEL = 'llama-3.3-70b-versatile';

// 시스템 프롬프트 앞에 항상 삽입 — 한국어 강제
const KOREAN_SYSTEM =
  'You MUST respond ONLY in Korean (한국어). ' +
  'Do NOT use Chinese characters (漢字/汉字), Japanese kana, or any non-Korean script. ' +
  'Use only Korean Hangul (한글), numbers, and English technical terms when necessary.\n\n';

export async function generateText(prompt: string, systemPrompt?: string): Promise<string> {
  if (isClaudeEnabled()) return generateTextWithClaude(prompt, KOREAN_SYSTEM + (systemPrompt ?? ''));
  try {
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0,
      seed: 42,
      messages: [
        {
          role: 'system' as const,
          content: KOREAN_SYSTEM + (systemPrompt ?? ''),
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
  if (isClaudeEnabled()) return generateJSONWithClaude<T>(prompt, KOREAN_SYSTEM + (systemPrompt ?? ''));
  try {
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0,
      seed: 42,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system' as const,
          content: KOREAN_SYSTEM + (systemPrompt ?? ''),
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
