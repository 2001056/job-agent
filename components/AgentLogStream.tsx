'use client';

import { useEffect, useRef } from 'react';
import type { AgentLog } from '@/lib/types/agent.types';

interface AgentLogStreamProps {
  logs: AgentLog[];
}

const LEVEL_STYLES: Record<AgentLog['level'], string> = {
  info: 'text-gray-500',
  warn: 'text-yellow-600',
  error: 'text-red-600',
};

export default function AgentLogStream({ logs }: AgentLogStreamProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-sm font-semibold text-gray-700">실시간 로그</h3>
      <div className="h-48 overflow-y-auto rounded-lg border border-gray-200 bg-gray-950 p-3 font-mono text-xs">
        {logs.length === 0 ? (
          <p className="text-gray-500">로그가 없습니다.</p>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="flex gap-2">
              <span className="shrink-0 text-gray-600">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className="shrink-0 text-purple-400">[{log.agent}]</span>
              <span className={LEVEL_STYLES[log.level]}>{log.message}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
