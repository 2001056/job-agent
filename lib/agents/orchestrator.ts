import type { AgentLog, AgentName, AgentState, SSEEvent } from '../types/agent.types';
import { runAnalyzer } from './analyzer';
import { runMatcher } from './matcher';
import { runReviewer } from './reviewer';
import { runScraper } from './scraper';
import { runWriter } from './writer';
import { toUserMessage } from '../error-formatter';

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

export async function runOrchestrator(
  jobUrl: string,
  userId: string,
  onEvent?: (event: SSEEvent) => void,
): Promise<AgentState> {
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

  const emit = (event: SSEEvent) => {
    onEvent?.(event);
  };

  const addLog = (log: AgentLog) => {
    state.logs.push(log);
    state.updatedAt = now();
    emit({ type: 'log', data: log, timestamp: now() });
  };

  const emitStateUpdate = () => {
    emit({
      type: 'state_update',
      data: {
        currentAgent: state.currentAgent,
        status: state.status,
        updatedAt: state.updatedAt,
      },
      timestamp: now(),
    });
  };

  try {
    // 1. Scraper
    state.currentAgent = 'scraper';
    emitStateUpdate();
    addLog(makeLog('scraper', 'scraper 에이전트 시작'));
    state.rawJobText = await withRetry(() => runScraper(jobUrl));
    addLog(makeLog('scraper', `스크래핑 완료 (${state.rawJobText.length}자)`));
    addLog(makeLog('scraper', 'scraper 에이전트 완료'));

    // 2. Analyzer
    state.currentAgent = 'analyzer';
    emitStateUpdate();
    addLog(makeLog('analyzer', 'analyzer 에이전트 시작'));
    state.structuredJob = await withRetry(() => runAnalyzer(state.rawJobText!));
    addLog(makeLog('analyzer', `분석 완료: ${state.structuredJob.position} @ ${state.structuredJob.companyName}`));
    addLog(makeLog('analyzer', 'analyzer 에이전트 완료'));

    // 3. Matcher
    state.currentAgent = 'matcher';
    emitStateUpdate();
    addLog(makeLog('matcher', 'matcher 에이전트 시작'));
    state.matchAnalysis = await withRetry(() => runMatcher(state.structuredJob!, userId));
    addLog(makeLog('matcher', `매칭 완료: fitScore ${state.matchAnalysis.fitScore}`));
    addLog(makeLog('matcher', 'matcher 에이전트 완료'));

    // 4 & 5. Writer + Reviewer loop
    let draft = '';
    let feedback = state.reviewFeedback;

    do {
      state.currentAgent = 'writer';
      emitStateUpdate();
      addLog(makeLog('writer', 'writer 에이전트 시작'));
      addLog(makeLog('writer', `자기소개서 초안 생성 시작 (시도 ${state.retryCount + 1})`));
      draft = await withRetry(() => runWriter(state.structuredJob!, state.matchAnalysis!));
      state.draftCoverLetter = draft;
      addLog(makeLog('writer', `초안 생성 완료 (${draft.length}자)`));
      addLog(makeLog('writer', 'writer 에이전트 완료'));

      state.currentAgent = 'reviewer';
      emitStateUpdate();
      addLog(makeLog('reviewer', 'reviewer 에이전트 시작'));
      feedback = await withRetry(() => runReviewer(draft, state.matchAnalysis!));
      state.reviewFeedback = feedback;
      addLog(makeLog('reviewer', `검토 완료: score ${feedback.score}, passed ${feedback.passed}`));
      addLog(makeLog('reviewer', 'reviewer 에이전트 완료'));

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

    emit({ type: 'complete', data: state, timestamp: now() });
  } catch (err) {
    const agent = state.currentAgent ?? 'orchestrator';
    // 상세 에러는 서버 콘솔에만 기록
    console.error(`[orchestrator][${agent}]`, err);
    const userMsg = toUserMessage(err);
    addLog(makeLog(agent, `오류 발생: ${userMsg}`, 'error'));
    state.status = 'error';
    state.updatedAt = now();
    emit({ type: 'error', data: { message: userMsg }, timestamp: now() });
    throw err;
  }

  return state;
}
