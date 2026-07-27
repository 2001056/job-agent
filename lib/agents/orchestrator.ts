import type { AgentLog, AgentName, AgentState } from '../types/agent.types';
import { runAnalyzer } from './analyzer';
import { runMatcher } from './matcher';
import { runReviewer } from './reviewer';
import { runScraper } from './scraper';
import { runWriter } from './writer';

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) await sleep(1000 * (attempt + 1));
    }
  }
  throw lastError;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function now() {
  return new Date().toISOString();
}

function makeLog(agent: AgentName, message: string, level: AgentLog['level'] = 'info'): AgentLog {
  return { agent, message, timestamp: now(), level };
}

export async function runOrchestrator(jobUrl: string, userId: string): Promise<AgentState> {
  const state: AgentState = {
    jobId: crypto.randomUUID(),
    userId,
    jobUrl,
    rawJobText: null,
    structuredJob: null,
    resumeChunks: [],
    matchAnalysis: null,
    draftCoverLetter: null,
    reviewFeedback: null,
    finalCoverLetter: null,
    logs: [],
    status: 'running',
    currentAgent: null,
    retryCount: 0,
    createdAt: now(),
    updatedAt: now(),
  };

  const addLog = (log: AgentLog) => {
    state.logs.push(log);
    state.updatedAt = now();
  };

  try {
    // 1. Scraper
    state.currentAgent = 'scraper';
    addLog(makeLog('scraper', '채용 공고 스크래핑 시작'));
    state.rawJobText = await withRetry(() => runScraper(jobUrl));
    addLog(makeLog('scraper', `스크래핑 완료 (${state.rawJobText.length}자)`));

    // 2. Analyzer
    state.currentAgent = 'analyzer';
    addLog(makeLog('analyzer', '공고 텍스트 분석 시작'));
    state.structuredJob = await withRetry(() => runAnalyzer(state.rawJobText!));
    addLog(makeLog('analyzer', `분석 완료: ${state.structuredJob.position} @ ${state.structuredJob.companyName}`));

    // 3. Matcher
    state.currentAgent = 'matcher';
    addLog(makeLog('matcher', '이력서-공고 갭 분석 시작'));
    state.matchAnalysis = await withRetry(() => runMatcher(state.structuredJob!, userId));
    addLog(makeLog('matcher', `매칭 완료: fitScore ${state.matchAnalysis.fitScore}`));

    // 4 & 5. Writer + Reviewer loop
    let draft = '';
    let feedback = state.reviewFeedback;

    do {
      state.currentAgent = 'writer';
      addLog(makeLog('writer', `자기소개서 초안 생성 시작 (시도 ${state.retryCount + 1})`));
      draft = await withRetry(() => runWriter(state.structuredJob!, state.matchAnalysis!));
      state.draftCoverLetter = draft;
      addLog(makeLog('writer', `초안 생성 완료 (${draft.length}자)`));

      state.currentAgent = 'reviewer';
      addLog(makeLog('reviewer', '자기소개서 품질 검토 시작'));
      feedback = await withRetry(() => runReviewer(draft, state.matchAnalysis!));
      state.reviewFeedback = feedback;
      addLog(makeLog('reviewer', `검토 완료: score ${feedback.score}, passed ${feedback.passed}`));

      if (!feedback.passed && state.retryCount < 2) {
        state.retryCount++;
        addLog(makeLog('reviewer', `품질 기준 미달, 재생성 시도 (${state.retryCount}/2)`, 'warn'));
      } else {
        break;
      }
    } while (true);

    // 6. Finalize
    state.finalCoverLetter = draft;
    state.status = 'done';
    state.currentAgent = null;
    state.updatedAt = now();
    addLog(makeLog('orchestrator', '파이프라인 완료'));
  } catch (err) {
    const agent = state.currentAgent ?? 'orchestrator';
    addLog(makeLog(agent, `오류 발생: ${err instanceof Error ? err.message : String(err)}`, 'error'));
    state.status = 'error';
    state.updatedAt = now();
    throw err;
  }

  return state;
}
