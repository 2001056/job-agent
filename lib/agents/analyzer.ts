import { generateJSON } from '../llm/gemini';
import type { StructuredJob } from '../types/agent.types';

export async function runAnalyzer(rawText: string): Promise<StructuredJob> {
  const systemPrompt = '당신은 채용 공고 분석 전문가입니다. 주어진 텍스트에서 정보를 추출해 JSON으로 반환하세요. 모든 텍스트 필드는 반드시 한국어로 작성하세요.';

  const userPrompt = `다음 채용 공고 텍스트를 분석해 아래 JSON 스키마에 맞게 반환하세요. 누락된 필드는 빈 배열 또는 빈 문자열로 처리하세요.

출력 스키마:
{
  "companyName": "회사명",
  "position": "포지션명",
  "requiredSkills": ["필수기술1", "필수기술2"],
  "preferredSkills": ["우대기술1"],
  "responsibilities": ["주요업무1"],
  "companyCulture": ["문화키워드1"],
  "keywords": ["핵심키워드1"]
}

채용 공고 텍스트:
${rawText}`;

  return generateJSON<StructuredJob>(userPrompt, systemPrompt);
}
