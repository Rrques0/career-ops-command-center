export const stages = ['Discovered', 'Evaluated', 'Applied', 'Screen/Interview', 'Offer', 'Archived'] as const;
export type Stage = typeof stages[number];
export interface AuditEvent { id: number; kind: string; timestamp: string; payload: Record<string, string> }
export interface Opportunity {
  id: string; company: string; role: string; location: string; url: string; stage: Stage;
  date: string; updatedAt: string; notes: string; trackerNumber: string; rank: number;
  tier: 'HIGH' | 'GOOD' | 'REVIEW' | 'STRETCH'; triagePercent: number; rationale: string;
  attentionScore?: number; evidenceScore?: number; evidenceBand?: 'direct' | 'adjacent' | 'gap' | 'unmapped';
  evidenceRationale?: string; evidenceProofPoints?: string[];
  lane?: string; bridgeLabel?: string;
  evaluationScore?: number; gaps: string[]; strengths: string[]; nextAction: string;
  report: string; draft: string; events: AuditEvent[];
}
export interface LearningPathRecord {
  id: string; title: string; track: string; provider: string; url: string;
  status: 'planned' | 'in-progress' | 'completed'; goal: string; nextStep: string;
  timebox: string; lane: string; source: string;
}
export interface JarvisSnapshot {
  status: 'Live' | 'Unavailable'; source: string; root: string; statePath: string; lastIndexed: string;
  mission: string; activeProject: string; nextAction: string;
  tasks: { id: string; title: string; done: boolean; project: string }[];
  evidence: { date: string; observation: string; confidence: string }[];
  blockers: string[]; readOnly: boolean;
}
export interface Task { id: string; kind: string; status: string; started: string; finished: string; log: string; summary?: string }
export interface SnapshotPerformance {
  status: 'healthy' | 'stale' | 'degraded'; snapshotRevision: number;
  lastSuccessfulSnapshotAt: string;
  telemetry: {
    cacheHits: number; staleServes: number; rebuilds: number; parserRebuilds: number;
    fingerprintMs: { p50: number; p95: number; p99: number };
    rebuildMs: { p50: number; p95: number; p99: number };
  };
}
export interface Snapshot {
  generatedAt: string;
  operator: { name: string; headline: string; location: string; linkedin?: string; portfolio?: string; targets: string[]; skills: string;
    certifications: string; confirmedStack: string[]; provenance: string; resume: string;
    education: { institution?: string; program?: string; remaining_classes?: number; grading?: string; graduation_date?: string } };
  jobs: Opportunity[];
  sources: { company: string; status: string; detail: string; timestamp: string; latencyMs: number | null }[];
  scan: { checked: number; added: number; filtered: number; duplicates: number; status: string; timestamp: string };
  scanHistory: { timestamp: string; found: string; new_added: string }[];
  funnel: Record<Stage, number>; scholarships: string; tasks: Task[];
  githubProfile?: string; projects: { name: string; kind: string; url: string; description: string; language: string; fork: boolean; updatedAt: string }[];
  caseStudies: { id: string; title: string; lane: string; situation: string; risk: string; action: string; result: string; learned: string }[];
  learningPaths: LearningPathRecord[];
  jarvis: JarvisSnapshot;
  syncPending: { id: string; error: string }[];
  professionalEvidence?: { source: string; capturedAt: string; provenance: string; calculus: { description?: string; weights?: { triage?: number; portfolio_evidence?: number } } };
  performance?: SnapshotPerformance;
}
let cachedSnapshot: Snapshot | undefined;
let cachedEtag = '';
export async function snapshot(options: { requireFresh?: boolean } = {}): Promise<Snapshot> {
  const headers = cachedEtag ? { 'If-None-Match': cachedEtag } : undefined;
  const endpoint = options.requireFresh ? '/api/snapshot?fresh=1' : '/api/snapshot';
  const response = await fetch(endpoint, { cache: 'no-store', headers, signal: AbortSignal.timeout(15000) });
  if (response.status === 304 && cachedSnapshot) return cachedSnapshot;
  if (!response.ok) throw new Error('The local Python engine is unavailable. Reopen the Desktop shortcut.');
  const value = await response.json();
  if (!Array.isArray(value.jobs) || !value.operator || !Array.isArray(value.tasks)) throw new Error('The engine returned an invalid snapshot.');
  cachedEtag = response.headers.get('ETag') || cachedEtag;
  cachedSnapshot = value;
  return value;
}
export async function action(path: 'tasks' | 'stage' | 'contact' | 'sync', data: Record<string, string>) {
  const response = await fetch(`/api/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Career-Ops': 'local' }, body: JSON.stringify(data) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Action failed');
  return result;
}
export function safeLink(value: string) { try { const u = new URL(value); return ['http:', 'https:'].includes(u.protocol) ? value : undefined; } catch { return undefined; } }
export const displayDate = (s: string) => s ? new Date(s).toLocaleString() : 'Not recorded';
