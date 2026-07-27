import { generateJSON } from '../llm/gemini';
import { retrieveChunks } from '../rag/retriever';
import type { MatchAnalysis, StructuredJob } from '../types/agent.types';

export async function runMatcher(job: StructuredJob, userId: string): Promise<MatchAnalysis> {
  const query = `${job.position} ${job.requiredSkills.join(' ')}`;
  const chunks = await retrieveChunks(userId, query);

  const systemPrompt =
    '당신은 채용 매칭 전문가입니다. 이력서와 채용 공고를 비교해 분석 결과를 JSON으로 반환하세요. 모든 텍스트 필드는 반드시 한국어로 작성하세요.';

  const userPrompt = `이력서 내용과 채용 공고를 비교해 아래 JSON 스키마에 맞게 분석 결과를 반환하세요.

이력서 청크:
${chunks.join('\n---\n')}

채용 공고 정보:
- 회사명: ${job.companyName}
- 포지션: ${job.position}
- 필수 기술: ${job.requiredSkills.join(', ')}
- 우대 기술: ${job.preferredSkills.join(', ')}
- 주요 업무: ${job.responsibilities.join(', ')}

출력 스키마:
{
  "matchedSkills": ["매칭된기술"],
  "missingSkills": ["부족한기술"],
  "appealPoints": ["어필포인트"],
  "gapSummary": "갭 요약 텍스트",
  "fitScore": 75
}`;

  return generateJSON<MatchAnalysis>(userPrompt, systemPrompt);
}
