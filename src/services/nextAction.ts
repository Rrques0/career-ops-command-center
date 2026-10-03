import type { Opportunity, Snapshot } from './command';

export type NextAction =
  | { kind: 'review'; job: Opportunity; title: string; detail: string; button: string }
  | { kind: 'evaluate'; job: Opportunity; title: string; detail: string; button: string }
  | { kind: 'lifecycle'; job: Opportunity; title: string; detail: string; button: string }
  | { kind: 'queue'; title: string; detail: string; button: string }
  | { kind: 'activity'; title: string; detail: string; button: string }
  | { kind: 'failure'; title: string; detail: string; button: string };

type NextActionState = Pick<Snapshot, 'jobs' | 'tasks'>;

function byPriority(jobs: Opportunity[]) {
  return [...jobs].sort((left, right) => (right.attentionScore ?? right.triagePercent) - (left.attentionScore ?? left.triagePercent)
    || right.rank - left.rank || right.triagePercent - left.triagePercent);
}

// One shallow, deterministic decision layer: the UI does not duplicate Career Ops ranking.
// This only chooses the next reversible action; it never applies, sends, or changes a stage.
export function nextSafeAction({ jobs, tasks }: NextActionState): NextAction {
  const running = tasks.find(task => task.status === 'running');
  if (running) return {
    kind: 'activity',
    title: 'A workflow is already running',
    detail: `${running.kind} is working locally. Open its progress instead of starting a duplicate task.`,
    button: 'Open workflow progress',
  };

  // Tasks are returned newest first. Surface the latest failure once, rather than
  // silently starting the same potentially costly workflow again.
  const latest = tasks[0];
  if (latest?.status === 'failed') return {
    kind: 'failure',
    title: `${latest.kind} needs your review`,
    detail: 'The latest local workflow failed. Review its Activity log before choosing whether to retry; Career Ops will not retry it automatically.',
    button: 'Review workflow log',
  };

  const lifecycle = [
    ['Offer', 'Review the offer from', 'Review offer workspace'],
    ['Screen/Interview', 'Prepare for', 'Open interview workspace'],
    ['Applied', 'Follow up with', 'Open follow-up workspace'],
  ] as const;
  for (const [stage, verb, button] of lifecycle) {
    const active = byPriority(jobs.filter(job => job.stage === stage))[0];
    if (active) return {
      kind: 'lifecycle', job: active,
      title: `${verb} ${active.company}`,
      detail: active.nextAction || `This role is already ${stage}. Review its saved evidence and decide the next step before starting new work.`,
      button,
    };
  }

  const reviewed = byPriority(jobs.filter(job => job.stage === 'Evaluated' && Boolean(job.report)))[0];
  if (reviewed) return {
    kind: 'review', job: reviewed,
    title: `Review ${reviewed.company}`,
    detail: `${reviewed.role} already has a report and application pack ready for your decision.`,
    button: 'Open application pack',
  };

  const discovered = byPriority(jobs.filter(job => job.stage === 'Discovered'))[0];
  if (discovered) return {
    kind: 'evaluate', job: discovered,
    title: `Prepare ${discovered.company}`,
    detail: `${discovered.role} is the highest-priority discovered role. Career Ops will evaluate it, but never apply or contact anyone for you.`,
    button: 'Prepare review pack',
  };

  return {
    kind: 'queue',
    title: 'Run a fresh career queue',
    detail: 'No discovered or evaluated role needs your attention. Scan public sources and prepare the strongest new matches.',
    button: 'Run my queue',
  };
}
