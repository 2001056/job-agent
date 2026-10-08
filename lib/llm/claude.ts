import Anthropic from '@anthropic-ai/sdk';

type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-5-5';
// Vercel 60초 timeout 안에 최대 9회 호출이 끝나야 하므로 기본값은 low
const EFFORT = (process.env.ANTHROPIC_EFFORT ?? 'low') as Effort;
const MAX_TOKENS = 16000;

function getClaudeClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY 환경 변수가 설정되지 않았습니다. .env.local을 확인하세요.');
  }
  // 재시도는 orchestrator의 withRetry가 담당 — SDK 재시도와 중첩되지 않게 끈다
  return new Anthropic({ apiKey, maxRetries: 0, timeout: 50_000 });
}

async function complete(prompt: string, system: string): Promise<string> {
  const client = getClaudeClient();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    output_config: { effort: EFFORT },
    system,
    messages: [{ role: 'user', content: prompt }],
  });

  if (response.stop_reason === 'refusal') {
    throw new Error('모델이 요청을 거절했습니다.');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('응답이 max_tokens 한도에서 잘렸습니다.');
  }

  return response.content
    .map((block) => (block.type === 'text' ? block.text : ''))
    .join('');
}

export async function generateTextWithClaude(prompt: string, system: string): Promise<string> {
  try {
    return await complete(prompt, system);
  } catch (error) {
    throw new Error(
      `Claude generateText 실패: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function generateJSONWithClaude<T>(prompt: string, system: string): Promise<T> {
  try {
    const raw = await complete(
      prompt,
      system + '\n\n설명이나 코드 블록 없이 JSON 객체 하나만 출력하세요.'
    );
    // 코드 펜스나 앞뒤 문장이 붙어도 JSON 객체만 잘라낸다
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end <= start) throw new Error('응답에서 JSON 객체를 찾지 못했습니다.');
    return JSON.parse(raw.slice(start, end + 1)) as T;
  } catch (error) {
    throw new Error(
      `Claude generateJSON 실패: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
