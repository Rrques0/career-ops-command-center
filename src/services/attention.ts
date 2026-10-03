import type { Opportunity, Snapshot } from './command';
import { nextSafeAction, type NextAction } from './nextAction';

export type EvidenceState = 'ready' | 'partial' | 'not-evaluated';

export type AttentionItem =
  | { kind: 'role'; id: string; job: Opportunity; title: string; detail: string; evidence: { state: EvidenceState; strengths: string[]; gaps: string[]; hasDraft: boolean } }
  | { kind: 'source'; id: string; company: string; detail: string }
  | { kind: 'workflow'; id: string; title: string; detail: string };

export interface AttentionPlan {
  primary: NextAction;
  reviewDecisionCount: number;
  sourceRepairs: number;
  recordedSourceChecks: number;
  latestScanTimestamp: string;
  items: AttentionItem[];
}

type AttentionData = Pick<Snapshot, 'jobs' | 'tasks' | 'sources' | 'scan'>;

function byPriority(jobs: Opportunity[]) {
  return [...jobs].sort((left, right) => right.rank - left.rank || right.triagePercent - left.triagePercent);
}

function evidence(job: Opportunity) {
  const hasReport = Boolean(job.report);
  const hasDraft = Boolean(job.draft);
  const hasPartial = hasDraft || job.strengths.length > 0 || job.gaps.length > 0;
  return {
    state: hasReport ? 'ready' as const : hasPartial ? 'partial' as const : 'not-evaluated' as const,
    strengths: job.strengths.slice(0, 2),
    gaps: job.gaps.slice(0, 1),
    hasDraft,
  };
}

function roleItem(job: Opportunity): AttentionItem {
  return {
    kind: 'role', id: job.id, job, title: `${job.company} · ${job.role}`,
    detail: job.nextAction || job.rationale,
    evidence: evidence(job),
  };
}

// This is deliberately a presentation-only attention plan. It delegates the
// primary choice to nextSafeAction and never manufactures probability, time, or
// candidate-comparison claims from sparse local data.
export function attentionPlan(data: AttentionData): AttentionPlan {
  const primary = nextSafeAction(data);
  const primaryJob = 'job' in primary ? primary.job : undefined;
  const seen = new Set(primaryJob ? [primaryJob.id] : []);
  const items: AttentionItem[] = [];

  if (primaryJob) items.push(roleItem(primaryJob));
  else if (primary.kind === 'activity' || primary.kind === 'failure') {
    items.push({ kind: 'workflow', id: `workflow-${primary.kind}`, title: primary.title, detail: primary.detail });
  }

  const reviewed = byPriority(data.jobs.filter(job => job.stage === 'Evaluated' && Boolean(job.report)))[0];
  if (reviewed && !seen.has(reviewed.id) && items.length < 3) {
    seen.add(reviewed.id); items.push(roleItem(reviewed));
  }

  const discovered = byPriority(data.jobs.filter(job => job.stage === 'Discovered'))[0];
  if (discovered && !seen.has(discovered.id) && items.length < 3) {
    seen.add(discovered.id); items.push(roleItem(discovered));
  }

  const repair = data.sources.find(source => source.status === 'Needing Repair');
  if (repair && items.length < 3) items.push({
    kind: 'source', id: `source-${repair.company}`, company: repair.company,
    detail: repair.detail || 'This source needs a local verification run.',
  });

  const reviewDecisionCount = data.jobs.filter(job =>
    (job.stage === 'Evaluated' && Boolean(job.report)) || ['Applied', 'Screen/Interview', 'Offer'].includes(job.stage),
  ).length;

  return {
    primary,
    reviewDecisionCount,
    sourceRepairs: data.sources.filter(source => source.status === 'Needing Repair').length,
    recordedSourceChecks: data.scan.checked,
    latestScanTimestamp: data.scan.timestamp,
    items,
  };
}
