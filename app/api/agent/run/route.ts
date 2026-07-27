import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { runOrchestrator } from '@/lib/agents/orchestrator';
import { emitJobEvent, setJobState } from '@/lib/job-store';
import { acquireJob, checkRunLimit, releaseJob } from '@/lib/rate-limiter';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json() as { jobUrl?: string; userId?: string };
  const { jobUrl, userId = 'anonymous' } = body;

  if (!jobUrl || typeof jobUrl !== 'string') {
    return NextResponse.json({ error: 'jobUrl is required' }, { status: 400 });
  }

  const limit = checkRunLimit(userId, jobUrl);
  if (!limit.allowed) {
    return NextResponse.json({ error: limit.reason }, { status: 429 });
  }

  const jobId = crypto.randomUUID();
  acquireJob(userId, jobUrl);

  waitUntil(
    runOrchestrator(jobUrl, userId, (event) => {
      emitJobEvent(jobId, event);
    })
      .then((finalState) => setJobState(jobId, finalState))
      .catch((err) => console.error(`[job:${jobId}] orchestrator error:`, err))
      .finally(() => releaseJob(userId))
  );

  return NextResponse.json({ jobId });
}
