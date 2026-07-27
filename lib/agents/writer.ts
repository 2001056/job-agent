import { generateText } from '../llm/gemini';
import type { MatchAnalysis, StructuredJob } from '../types/agent.types';

export async function runWriter(job: StructuredJob, analysis: MatchAnalysis): Promise<string> {
  const systemPrompt =
    '당신은 채용 전문가입니다. 지원자의 강점을 부각하는 설득력 있는 자기소개서를 반드시 한국어로 작성하세요. 절대 중국어나 다른 언어를 사용하지 마세요.';

  const userPrompt = `다음 정보를 바탕으로 맞춤형 자기소개서를 작성하세요. 분량은 800~1000자로 제한합니다.

지원 회사: ${job.companyName}
지원 포지션: ${job.position}

어필 포인트:
${analysis.appealPoints.map((p) => `- ${p}`).join('\n')}

매칭된 기술:
${analysis.matchedSkills.map((s) => `- ${s}`).join('\n')}

부족한 기술 (성장 의지와 학습 계획으로 긍정적으로 표현):
${analysis.missingSkills.map((s) => `- ${s}`).join('\n')}

위 정보를 활용해 지원자의 강점을 강조하고, 부족한 부분은 성장 의지와 적극적인 학습 자세로 표현하는 설득력 있는 자기소개서를 작성하세요.`;

  return generateText(userPrompt, systemPrompt);
}
