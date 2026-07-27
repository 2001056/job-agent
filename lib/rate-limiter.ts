// 인메모리 Rate Limiter
// 단일 서버리스 인스턴스 기준으로 동작합니다.

const MAX_CONCURRENT_JOBS = 3;
const COOLDOWN_MS = 60_000; // 60초
const URL_DEDUP_MS = 60_000; // 동일 URL 60초 중복 차단

let activeJobs = 0;

// userId → 마지막 완료 시각
const cooldownMap = new Map<string, number>();
// `${userId}::${url}` → 마지막 요청 시각
const urlDedupMap = new Map<string, number>();

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
}

export function checkRunLimit(userId: string, jobUrl: string): RateLimitResult {
  const now = Date.now();

  if (activeJobs >= MAX_CONCURRENT_JOBS) {
    return { allowed: false, reason: `현재 서버가 바쁩니다. 잠시 후 다시 시도해주세요. (동시 실행 최대 ${MAX_CONCURRENT_JOBS}개)` };
  }

  const lastFinished = cooldownMap.get(userId);
  if (lastFinished && now - lastFinished < COOLDOWN_MS) {
    const remainSec = Math.ceil((COOLDOWN_MS - (now - lastFinished)) / 1000);
    return { allowed: false, reason: `분석 후 ${remainSec}초 뒤에 다시 시도할 수 있습니다.` };
  }

  const dedupKey = `${userId}::${jobUrl}`;
  const lastUrl = urlDedupMap.get(dedupKey);
  if (lastUrl && now - lastUrl < URL_DEDUP_MS) {
    const remainSec = Math.ceil((URL_DEDUP_MS - (now - lastUrl)) / 1000);
    return { allowed: false, reason: `같은 공고를 ${remainSec}초 내에 다시 분석할 수 없습니다.` };
  }

  return { allowed: true };
}

export function acquireJob(userId: string, jobUrl: string): void {
  activeJobs++;
  urlDedupMap.set(`${userId}::${jobUrl}`, Date.now());
}

export function releaseJob(userId: string): void {
  activeJobs = Math.max(0, activeJobs - 1);
  cooldownMap.set(userId, Date.now());
}

// 오래된 항목 주기적 정리 (메모리 누수 방지)
setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of cooldownMap) {
    if (now - ts > COOLDOWN_MS * 2) cooldownMap.delete(key);
  }
  for (const [key, ts] of urlDedupMap) {
    if (now - ts > URL_DEDUP_MS * 2) urlDedupMap.delete(key);
  }
}, 120_000);
