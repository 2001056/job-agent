import { NextRequest, NextResponse } from 'next/server';
import { runOrchestrator } from '@/lib/agents/orchestrator';
import { emitJobEvent, setJobState } from '@/lib/job-store';

export async function POST(req: NextRequest) {
  const body = await req.json() as { jobUrl?: string; userId?: string };
  const { jobUrl, userId = 'anonymous' } = body;

  if (!jobUrl || typeof jobUrl !== 'string') {
    return NextResponse.json({ error: 'jobUrl is required' }, { status: 400 });
  }

  const jobId = crypto.randomUUID();

  // 백그라운드에서 비동기 실행 (await 없이)
  void runOrchestrator(jobUrl, userId, (event) => {
    emitJobEvent(jobId, event);
  })
    .then((finalState) => {
      setJobState(jobId, finalState);
    })
    .catch((err) => {
      console.error(`[job:${jobId}] orchestrator error:`, err);
    });

  return NextResponse.json({ jobId });
}
