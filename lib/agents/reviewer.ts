import { generateJSON } from '../llm/gemini';
import type { MatchAnalysis, ReviewFeedback } from '../types/agent.types';

export async function runReviewer(draft: string, analysis: MatchAnalysis): Promise<ReviewFeedback> {
  const systemPrompt =
    '당신은 채용 전문가입니다. 자기소개서의 품질을 평가해 JSON으로 반환하세요. 모든 텍스트 필드는 반드시 한국어로 작성하세요.';

  const userPrompt = `다음 자기소개서 초안을 채용 공고 요구사항과 비교해 평가하고 아래 JSON 스키마에 맞게 반환하세요.
score가 70 이상이면 passed를 true로, 미만이면 false로 설정하세요.

자기소개서 초안:
${draft}

채용 공고 요구사항:
- 매칭된 기술: ${analysis.matchedSkills.join(', ')}
- 부족한 기술: ${analysis.missingSkills.join(', ')}
- 어필 포인트: ${analysis.appealPoints.join(', ')}
- 갭 요약: ${analysis.gapSummary}

출력 스키마:
{
  "passed": true,
  "score": 85,
  "issues": ["개선 필요 사항"],
  "suggestions": ["구체적 개선 제안"]
}`;

  const feedback = await generateJSON<ReviewFeedback>(userPrompt, systemPrompt);
  return {
    ...feedback,
    passed: feedback.score >= 70,
  };
}
