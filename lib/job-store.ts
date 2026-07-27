import type { AgentState, SSEEvent } from './types/agent.types';

// 서버리스 환경 주의: 동일 인스턴스 내에서만 유효
const jobStore = new Map<string, AgentState>();
const jobListeners = new Map<string, ((event: SSEEvent) => void)[]>();

export function setJobState(jobId: string, state: AgentState): void {
  jobStore.set(jobId, state);
}

export function getJobState(jobId: string): AgentState | undefined {
  return jobStore.get(jobId);
}

export function addJobListener(jobId: string, cb: (event: SSEEvent) => void): void {
  const listeners = jobListeners.get(jobId) ?? [];
  listeners.push(cb);
  jobListeners.set(jobId, listeners);
}

export function removeJobListener(jobId: string, cb: (event: SSEEvent) => void): void {
  const listeners = jobListeners.get(jobId);
  if (!listeners) return;
  const updated = listeners.filter((l) => l !== cb);
  if (updated.length === 0) {
    jobListeners.delete(jobId);
  } else {
    jobListeners.set(jobId, updated);
  }
}

export function emitJobEvent(jobId: string, event: SSEEvent): void {
  const listeners = jobListeners.get(jobId);
  if (!listeners) return;
  for (const cb of listeners) {
    cb(event);
  }
}
