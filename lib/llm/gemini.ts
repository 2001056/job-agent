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

const MODEL = 'qwen/qwen3.6-27b';
const KOREAN_ENFORCE =
  '당신은 반드시 한국어(한글)로만 응답합니다. ' +
  '한자(漢字), 중국어 간체·번체, 일본어 가나는 절대 사용하지 않습니다. ' +
  '오직 한글, 숫자, 영문 기술용어만 허용됩니다.\n\n';

function stripThinking(raw: string): string {
  // 닫힌 think 블록 제거
  let result = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  // 닫히지 않은 <think> 이후 전체 제거
  result = result.replace(/<think>[\s\S]*/gi, '').trim();
  return result;
}

function extractJSON(raw: string): string {
  const withoutThink = stripThinking(raw);
  // 마크다운 코드블록 제거
  const noFence = withoutThink
    .replace(/^```json\s*/m, '')
    .replace(/^```\s*/m, '')
    .replace(/```\s*$/m, '')
    .trim();
  // { } 범위로 JSON 직접 추출 (think 잔재 있어도 안전)
  const start = noFence.indexOf('{');
  const end = noFence.lastIndexOf('}');
  if (start !== -1 && end > start) return noFence.slice(start, end + 1);
  return noFence;
}

export async function generateText(prompt: string, systemPrompt?: string): Promise<string> {
  try {
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0,
      messages: [
        {
          role: 'system' as const,
          content: KOREAN_ENFORCE + (systemPrompt ?? ''),
        },
        { role: 'user' as const, content: prompt },
      ],
    });
    return stripThinking(completion.choices[0]?.message?.content ?? '');
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
      model: MODEL,
      temperature: 0,
      messages: [
        {
          role: 'system' as const,
          content: KOREAN_ENFORCE + (systemPrompt ?? ''),
        },
        {
          role: 'user' as const,
          content: prompt + '\n\n반드시 순수한 JSON만 출력하세요. 마크다운 코드블록(```)이나 설명 없이 JSON 객체만 반환하세요.',
        },
      ],
    });
    const raw = extractJSON(completion.choices[0]?.message?.content ?? '{}');
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
