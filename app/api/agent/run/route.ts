import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { runOrchestrator } from '@/lib/agents/orchestrator';
import { emitJobEvent, setJobState } from '@/lib/job-store';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json() as { jobUrl?: string; userId?: string };
  const { jobUrl, userId = 'anonymous' } = body;

  if (!jobUrl || typeof jobUrl !== 'string') {
    return NextResponse.json({ error: 'jobUrl is required' }, { status: 400 });
  }

  const jobId = crypto.randomUUID();

  // waitUntil: 응답 반환 후에도 Vercel이 백그라운드 작업을 완료될 때까지 유지
  waitUntil(
    runOrchestrator(jobUrl, userId, (event) => {
      emitJobEvent(jobId, event);
    })
      .then((finalState) => setJobState(jobId, finalState))
      .catch((err) => console.error(`[job:${jobId}] orchestrator error:`, err))
  );

  return NextResponse.json({ jobId });
}
