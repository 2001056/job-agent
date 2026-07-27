import { NextRequest } from 'next/server';
import { addJobListener, getJobState, removeJobListener } from '@/lib/job-store';
import type { SSEEvent } from '@/lib/types/agent.types';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return new Response('jobId query parameter is required', { status: 400 });
  }

  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  };

  const existingState = getJobState(jobId);

  // 이미 완료된 job이면 저장된 결과를 즉시 전송 후 complete 이벤트
  if (existingState && (existingState.status === 'done' || existingState.status === 'error')) {
    const completeEvent: SSEEvent = {
      type: 'complete',
      data: existingState,
      timestamp: new Date().toISOString(),
    };
    const body = `data: ${JSON.stringify(completeEvent)}\n\n`;
    return new Response(body, { headers });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const listener = (event: SSEEvent) => {
        try {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));

          if (event.type === 'complete' || event.type === 'error') {
            removeJobListener(jobId, listener);
            controller.close();
          }
        } catch {
          // 컨트롤러가 이미 닫힌 경우 무시
        }
      };

      addJobListener(jobId, listener);

      // 클라이언트 연결 종료 감지
      req.signal.addEventListener('abort', () => {
        removeJobListener(jobId, listener);
        try {
          controller.close();
        } catch {
          // 이미 닫힌 경우 무시
        }
      });
    },
  });

  return new Response(stream, { headers });
}
