'use client';

import type { AgentLog, AgentName, AgentState } from '@/lib/types/agent.types';

interface AgentProgressProps {
  currentAgent: AgentName | null;
  logs: AgentLog[];
  status: AgentState['status'];
}

const AGENT_ORDER: AgentName[] = ['scraper', 'analyzer', 'matcher', 'writer', 'reviewer'];
const AGENT_LABELS: Record<string, string> = {
  scraper: '공고 스크래핑',
  analyzer: '공고 분석',
  matcher: '이력서 매칭',
  writer: '자기소개서 작성',
  reviewer: '품질 검토',
};

type AgentStatus = 'idle' | 'active' | 'done' | 'error';

function getAgentStatus(
  agentName: AgentName,
  currentAgent: AgentName | null,
  status: AgentState['status'],
  logs: AgentLog[],
): AgentStatus {
  const idx = AGENT_ORDER.indexOf(agentName);
  const currentIdx = currentAgent ? AGENT_ORDER.indexOf(currentAgent) : -1;

  if (status === 'error') {
    if (agentName === currentAgent) return 'error';
    if (idx < currentIdx) return 'done';
    return 'idle';
  }
  if (agentName === currentAgent) return 'active';
  if (status === 'done') return 'done';
  if (currentIdx > idx) return 'done';

  // logs에서 완료 메시지 확인
  const agentLogs = logs.filter((l) => l.agent === agentName);
  const hasDone = agentLogs.some((l) => l.message.includes('완료'));
  if (hasDone && currentIdx > idx) return 'done';

  return 'idle';
}

function StatusIcon({ agentStatus }: { agentStatus: AgentStatus }) {
  if (agentStatus === 'active') {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100">
        <svg
          className="h-4 w-4 animate-spin text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </span>
    );
  }
  if (agentStatus === 'done') {
    return <span className="flex h-6 w-6 items-center justify-center text-base">✅</span>;
  }
  if (agentStatus === 'error') {
    return <span className="flex h-6 w-6 items-center justify-center text-base">❌</span>;
  }
  return <span className="flex h-6 w-6 items-center justify-center text-base">⏳</span>;
}

export default function AgentProgress({ currentAgent, logs, status }: AgentProgressProps) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-gray-700">에이전트 진행 상태</h3>
      <ol className="flex flex-col gap-2">
        {AGENT_ORDER.map((agent) => {
          const agentStatus = getAgentStatus(agent, currentAgent, status, logs);
          return (
            <li
              key={agent}
              className={`flex items-center gap-3 rounded-lg border px-4 py-2 text-sm transition-colors ${
                agentStatus === 'active'
                  ? 'border-blue-300 bg-blue-50 font-medium text-blue-900'
                  : agentStatus === 'done'
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : agentStatus === 'error'
                  ? 'border-red-200 bg-red-50 text-red-800'
                  : 'border-gray-200 bg-white text-gray-500'
              }`}
            >
              <StatusIcon agentStatus={agentStatus} />
              <span>{AGENT_LABELS[agent]}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
