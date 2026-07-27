export type AgentName =
  | 'scraper'
  | 'analyzer'
  | 'matcher'
  | 'writer'
  | 'reviewer'
  | 'orchestrator';

export interface AgentLog {
  agent: AgentName;
  message: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
}

export interface StructuredJob {
  companyName: string;
  position: string;
  requiredSkills: string[];
  preferredSkills: string[];
  responsibilities: string[];
  companyCulture: string[];
  keywords: string[];
}

export interface MatchAnalysis {
  matchedSkills: string[];
  missingSkills: string[];
  appealPoints: string[];
  gapSummary: string;
  fitScore: number;
}

export interface ReviewFeedback {
  passed: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
}

export interface AgentState {
  jobId: string;
  userId: string;
  jobUrl: string;
  rawJobText: string | null;
  structuredJob: StructuredJob | null;
  resumeChunks: string[];
  matchAnalysis: MatchAnalysis | null;
  draftCoverLetter: string | null;
  reviewFeedback: ReviewFeedback | null;
  finalCoverLetter: string | null;
  logs: AgentLog[];
  status: 'idle' | 'running' | 'done' | 'error';
  currentAgent: AgentName | null;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

export type SSEEventType = 'log' | 'state_update' | 'complete' | 'error';

export interface SSEEvent {
  type: SSEEventType;
  data: AgentLog | Partial<AgentState> | { message: string };
  timestamp: string;
}
