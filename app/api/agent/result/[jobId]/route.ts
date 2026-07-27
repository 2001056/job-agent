import { NextRequest, NextResponse } from 'next/server';
import { getJobState } from '@/lib/job-store';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const state = getJobState(jobId);

  if (!state) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  return NextResponse.json(state);
}
