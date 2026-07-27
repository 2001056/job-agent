'use client';

import { useState, useEffect, useRef } from 'react';
import type { AgentLog, AgentName, AgentState, SSEEvent } from '@/lib/types/agent.types';
import JobUrlInput from '@/components/JobUrlInput';
import ResumeUploader from '@/components/ResumeUploader';
import AgentProgress from '@/components/AgentProgress';
import AgentLogStream from '@/components/AgentLogStream';
import ResultViewer from '@/components/ResultViewer';

function createUserId(): string {
  return 'user-' + Math.random().toString(36).slice(2, 10);
}

const initialState: Omit<AgentState, 'jobId' | 'userId' | 'jobUrl' | 'createdAt' | 'updatedAt'> = {
  rawJobText: null,
  structuredJob: null,
  resumeChunks: [],
  matchAnalysis: null,
  draftCoverLetter: null,
  reviewFeedback: null,
  finalCoverLetter: null,
  logs: [],
  status: 'idle',
  currentAgent: null,
  retryCount: 0,
};

export default function Home() {
  const [userId] = useState<string>(createUserId);
  const [agentState, setAgentState] = useState<AgentState | null>(null);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [currentAgent, setCurrentAgent] = useState<AgentName | null>(null);
  const [status, setStatus] = useState<AgentState['status']>('idle');
  const [running, setRunning] = useState(false);
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  const handleStart = async (jobUrl: string) => {
    // 이전 EventSource 정리
    eventSourceRef.current?.close();
    eventSourceRef.current = null;

    setRunning(true);
    setLogs([]);
    setCurrentAgent(null);
    setStatus('running');
    setAgentState(null);

    try {
      const res = await fetch('/api/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobUrl, userId }),
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? '분석 시작 실패');
      }

      const { jobId } = await res.json() as { jobId: string };

      // SSE 구독
      const es = new EventSource(`/api/agent/stream?jobId=${encodeURIComponent(jobId)}`);
      eventSourceRef.current = es;

      es.onmessage = (e) => {
        const event = JSON.parse(e.data as string) as SSEEvent;

        if (event.type === 'log') {
          const log = event.data as AgentLog;
          setLogs((prev) => [...prev, log]);
        } else if (event.type === 'state_update') {
          const update = event.data as Partial<AgentState>;
          if (update.currentAgent !== undefined) setCurrentAgent(update.currentAgent ?? null);
          if (update.status) setStatus(update.status);
        } else if (event.type === 'complete') {
          const finalState = event.data as AgentState;
          setAgentState(finalState);
          setLogs(finalState.logs);
          setCurrentAgent(null);
          setStatus('done');
          setRunning(false);
          es.close();
        } else if (event.type === 'error') {
          const errData = event.data as { message: string };
          setLogs((prev) => [
            ...prev,
            {
              agent: 'orchestrator',
              message: `오류: ${errData.message}`,
              level: 'error',
              timestamp: new Date().toISOString(),
            },
          ]);
          setStatus('error');
          setRunning(false);
          es.close();
        }
      };

      es.onerror = () => {
        setLogs((prev) => [
          ...prev,
          {
            agent: 'orchestrator' as const,
            message: '연결이 끊어졌습니다. 잠시 후 다시 시도해주세요.',
            level: 'error' as const,
            timestamp: new Date().toISOString(),
          },
        ]);
        setStatus('error');
        setRunning(false);
        es.close();
      };
    } catch (err) {
      setLogs((prev) => [
        ...prev,
        {
          agent: 'orchestrator',
          message: `오류: ${err instanceof Error ? err.message : String(err)}`,
          level: 'error',
          timestamp: new Date().toISOString(),
        },
      ]);
      setStatus('error');
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">Job Agent</h1>
        <p className="text-sm text-gray-500">AI 기반 채용 공고 분석 및 자기소개서 생성</p>
      </header>

      {/* 안내 배너 */}
      <div className="bg-blue-50 border-b border-blue-100 px-6 py-2.5">
        <p className="text-xs text-blue-700 text-center leading-relaxed">
          📚 본 서비스는 <span className="font-semibold">학습 목적</span>으로 제작된 프로젝트입니다.
          무료 AI 모델의 성능 제약으로 인해 <span className="font-semibold">AI 요청 한도 초과 오류</span>가 발생할 수 있습니다.
          오류 발생 시 <span className="font-semibold">5~10분 후 재시도</span>해 주세요.
        </p>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 왼쪽 패널 */}
          <div className="flex flex-col gap-6">
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-gray-700">이력서</h2>
              <ResumeUploader
                userId={userId}
                onUploaded={(count) => {
                  setResumeUploaded(true);
                  setLogs((prev) => [
                    ...prev,
                    {
                      agent: 'orchestrator',
                      message: `이력서 업로드 완료 (${count}개 청크)`,
                      level: 'info',
                      timestamp: new Date().toISOString(),
                    },
                  ]);
                }}
              />
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-gray-700">채용 공고</h2>
              <JobUrlInput onSubmit={handleStart} disabled={running} />
              {!resumeUploaded && (
                <p className="mt-2 text-xs text-yellow-600">
                  이력서를 먼저 업로드하면 더 정확한 분석이 가능합니다.
                </p>
              )}
            </section>
          </div>

          {/* 오른쪽 패널 */}
          <div className="flex flex-col gap-6">
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <AgentProgress currentAgent={currentAgent} logs={logs} status={status} />
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <AgentLogStream logs={logs} />
            </section>
          </div>
        </div>

        {/* 하단 결과 패널 */}
        {status === 'done' && agentState && (
          <div className="mt-6">
            <ResultViewer state={agentState} />
          </div>
        )}
      </main>
    </div>
  );
}
