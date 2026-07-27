import fs from 'fs';
import path from 'path';
import { generateText } from '../llm/gemini';
import type { MatchAnalysis, StructuredJob } from '../types/agent.types';

function loadGuide(): string {
  try {
    const guidePath = path.join(process.cwd(), 'lib', 'cover-letter-guide.md');
    return fs.readFileSync(guidePath, 'utf-8');
  } catch {
    return '';
  }
}

export async function runWriter(job: StructuredJob, analysis: MatchAnalysis): Promise<string> {
  const guide = loadGuide();

  const systemPrompt = `당신은 채용 전문가입니다. 반드시 한국어로 작성하세요. 절대 중국어나 다른 언어를 사용하지 마세요.

아래 자기소개서 작성 가이드를 엄격히 준수해 작성합니다.

${guide}`;

  const userPrompt = `위 가이드의 원칙을 지켜 아래 정보로 맞춤형 자기소개서를 작성하세요.
분량: 800~1000자. 반드시 한국어로만 작성.

지원 회사: ${job.companyName}
지원 포지션: ${job.position}
회사 문화 키워드: ${job.companyCulture.join(', ')}

[이력서 기반 어필 포인트]
${analysis.appealPoints.map((p) => `- ${p}`).join('\n')}

[매칭된 기술]
${analysis.matchedSkills.map((s) => `- ${s}`).join('\n')}

[부족한 기술 — 성장 의지와 학습 계획으로 긍정적으로 표현]
${analysis.missingSkills.map((s) => `- ${s}`).join('\n')}

[갭 요약]
${analysis.gapSummary}

가이드의 4섹션 구조를 적용하고, AI티 패턴(~것이 강점입니다, ~할 수 있습니다 등)을 반드시 제거하세요.`;

  return generateText(userPrompt, systemPrompt);
}
