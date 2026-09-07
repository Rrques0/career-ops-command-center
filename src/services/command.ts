export const stages = ['Discovered', 'Evaluated', 'Applied', 'Screen/Interview', 'Offer', 'Archived'] as const;
export type Stage = typeof stages[number];
export interface AuditEvent { id: number; kind: string; timestamp: string; payload: Record<string, string> }
export interface Opportunity {
  id: string; company: string; role: string; location: string; url: string; stage: Stage;
  date: string; updatedAt: string; notes: string; trackerNumber: string; rank: number;
  tier: 'HIGH' | 'GOOD' | 'REVIEW' | 'STRETCH'; triagePercent: number; rationale: string;
  evaluationScore?: number; gaps: string[]; strengths: string[]; nextAction: string;
  report: string; draft: string; events: AuditEvent[];
}
export interface Task { id: string; kind: string; status: string; started: string; finished: string; log: string; summary?: string }
export interface Snapshot {
  generatedAt: string;
  operator: { name: string; headline: string; location: string; linkedin?: string; targets: string[]; skills: string;
    certifications: string; confirmedStack: string[]; provenance: string; resume: string;
    education: { institution?: string; program?: string; remaining_classes?: number; grading?: string; graduation_date?: string } };
  jobs: Opportunity[];
  sources: { company: string; status: string; detail: string; timestamp: string; latencyMs: number | null }[];
  scan: { checked: number; added: number; filtered: number; duplicates: number; status: string; timestamp: string };
  scanHistory: { timestamp: string; found: string; new_added: string }[];
  funnel: Record<Stage, number>; scholarships: string; tasks: Task[];
  githubProfile?: string; projects: { name: string; kind: string; url: string; description: string; language: string; fork: boolean; updatedAt: string }[];
  syncPending: { id: string; error: string }[];
}
export async function snapshot(): Promise<Snapshot> {
  const response = await fetch('/api/snapshot', { cache: 'no-store', signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('The local Python engine is unavailable. Reopen the Desktop shortcut.');
  const value = await response.json();
  if (!Array.isArray(value.jobs) || !value.operator || !Array.isArray(value.tasks)) throw new Error('The engine returned an invalid snapshot.');
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
