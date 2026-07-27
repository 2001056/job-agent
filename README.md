# JobAgent — AI 기반 채용 공고 분석 멀티 에이전트 시스템

채용 공고 URL을 입력하면 5개의 전문 AI 에이전트가 협력하여 이력서와의 갭을 분석하고, 맞춤형 자기소개서 초안을 자동 생성하는 풀스택 AI 에이전트 프로젝트입니다.

---

## 시스템 아키텍처

```
사용자 (URL + 이력서)
        ↓
  [오케스트레이터]
        ↓
  [스크래핑 에이전트] → Jina Reader API
        ↓
  [분석 에이전트]    → 공고 구조화 파싱
        ↓
  [매칭 에이전트]    → RAG + 갭 분석
        ↓
  [작성 에이전트]    → 자기소개서 초안
        ↓
  [검토 에이전트]    → 품질 점수 평가
        ↓ (score < 70, 최대 2회 재루프)
  [최종 결과 반환]
```

SSE(Server-Sent Events)로 각 에이전트의 실행 과정을 실시간으로 화면에 스트리밍합니다.

---

## 주요 기능

- 채용 공고 스크래핑 (Jina Reader API + fallback)
- 이력서 RAG 인덱싱 (PDF/텍스트 → 청크 분할 → 임베딩 → Supabase pgvector 저장)
- 공고-이력서 갭 분석 및 fit score(0~100) 산출
- 맞춤형 자기소개서 자동 생성 + 품질 검토 재루프 (최대 2회)
- SSE 실시간 진행 시각화 (에이전트별 대기/진행/완료/오류 상태)

---

## 기술 스택 (전체 비용 0원)

| 역할 | 기술 | 비고 |
|------|------|------|
| 프레임워크 | Next.js 16 + TypeScript + Tailwind CSS | App Router |
| LLM | Google Gemini 1.5 Flash | Google AI Studio 무료 |
| 임베딩 | Google text-embedding-004 (768차원) | Gemini API 포함 |
| 벡터 DB | Supabase pgvector | Seoul 리전 |
| DB | Supabase (PostgreSQL) | 무료 500MB |
| 스크래핑 | Jina Reader API | 무료 |
| 배포 | Vercel Hobby | 무료 |

---

## 에이전트 설계

| 에이전트 | 역할 | 핵심 구현 |
|----------|------|-----------|
| **Scraper** | 공고 텍스트 추출 | Jina API 우선, 실패 시 fetch fallback, 200자 미만 오류처리 |
| **Analyzer** | 공고 구조화 | `generateJSON<StructuredJob>`, 7개 필드 강제 추출 |
| **Matcher** | 갭 분석 | RAG 검색(position+skills 쿼리) + fit score 계산 |
| **Writer** | 자기소개서 생성 | 부족 스킬→성장 의지 전환 프롬프트, 800~1000자 제한 |
| **Reviewer** | 품질 검증 | score >= 70 코드 재계산, 미달 시 Writer 재루프 |
| **Orchestrator** | 파이프라인 제어 | withRetry(2회), writer-reviewer 루프, SSE 이벤트 발행 |

---

## 기술적 도전과 해결

### 1. Vercel 서버리스 백그라운드 작업
에이전트 파이프라인은 여러 LLM 호출로 수십 초가 소요됩니다. API Route가 응답을 반환하면 서버리스 함수가 즉시 프리즈되어 파이프라인이 중단됩니다.

**해결**: `@vercel/functions`의 `waitUntil()`로 응답 반환 후에도 백그라운드 작업을 완료까지 유지합니다.

```typescript
waitUntil(
  runOrchestrator(jobUrl, userId, onEvent)
    .then(state => setJobState(jobId, state))
);
return NextResponse.json({ jobId }); // 즉시 반환
```

### 2. LLM 비결정성 대응
Reviewer가 `passed` 필드를 잘못 반환하는 경우(LLM 환각)를 방어하기 위해, API 응답과 무관하게 `score >= 70` 조건을 코드에서 재계산합니다.

```typescript
feedback.passed = feedback.score >= 70; // LLM 판단 결정론적 override
```

### 3. 벡터 DB 지연 최소화
해외 리전만 제공하는 Qdrant Cloud 대신 **Supabase pgvector(서울 리전)**을 선택해 임베딩 저장/검색 지연을 최소화했습니다.

---

## 한계점 및 개선 방향

- **인메모리 job-store**: 단일 서버리스 인스턴스 내에서만 유효합니다. 프로덕션에서는 **Supabase Realtime**으로 교체가 필요합니다.
- **Vercel Hobby 60초 제한**: LLM 호출이 많을 경우 타임아웃 가능성이 있습니다.

---

## 시작하기

### 1. 환경 변수 설정

`.env.local` 파일 생성:

```env
GEMINI_API_KEY=            # https://aistudio.google.com/apikey
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY= # Supabase > Project Settings > API > service_role
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Supabase SQL 실행

[Supabase SQL Editor](https://supabase.com/dashboard)에서 아래 쿼리를 실행하세요:

```sql
create extension if not exists vector;

create table if not exists resume_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  content text not null,
  embedding vector(768) not null,
  created_at timestamptz not null default now()
);

create index if not exists resume_chunks_user_id_idx on resume_chunks (user_id);

create or replace function search_resume_chunks(
  p_user_id text,
  query_embedding vector(768),
  match_count int
)
returns table (id uuid, content text, similarity float)
language sql stable as $$
  select id, content, 1 - (embedding <=> query_embedding) as similarity
  from resume_chunks
  where user_id = p_user_id
  order by embedding <=> query_embedding
  limit match_count;
$$;
```

### 3. 로컬 실행

```bash
npm install
npm run dev
```

---

## Vercel 배포

1. [vercel.com](https://vercel.com)에서 GitHub 레포(`2001056/job-agent`) 연결
2. **Environment Variables**에 위 `.env.local` 값 동일하게 입력
3. **Deploy** 클릭
