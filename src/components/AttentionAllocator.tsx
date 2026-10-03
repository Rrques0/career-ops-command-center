import type { Opportunity } from '../services/command';
import type { AttentionPlan } from '../services/attention';
import { displayDate } from '../services/command';

export function AttentionAllocator({
  plan, disabled, onNext, onOpenJob, onOpenSources, onQueue,
}: {
  plan: AttentionPlan;
  disabled: boolean;
  onNext: () => void;
  onOpenJob: (job: Opportunity) => void;
  onOpenSources: () => void;
  onQueue: () => void;
}) {
  return <section className="attention-allocator" aria-labelledby="attention-title">
    <div className="section-label"><span id="attention-title">ATTENTION ALLOCATION</span><span>VERIFIED LOCAL RECORDS</span></div>
    <div className="attention-primary">
      <div><span>ONE SAFE NEXT ACTION</span><h2>{plan.primary.title}</h2><p>{plan.primary.detail}</p></div>
      <button aria-label="Run attention decision" disabled={disabled} onClick={onNext}>{plan.primary.button} <span>→</span></button>
    </div>
    <div className="attention-status" role="status" aria-live="polite">
      <div><span>OPEN REVIEW DECISIONS</span><strong>{plan.reviewDecisionCount}</strong><small>Saved roles requiring your review</small></div>
      <div><span>RECORDED SOURCE CHECKS</span><strong>{plan.recordedSourceChecks.toLocaleString()}</strong><small>Latest recorded scan · {displayDate(plan.latestScanTimestamp)}</small></div>
      <div><span>SOURCE REPAIRS</span><strong>{plan.sourceRepairs}</strong><small>Local verification may be needed</small></div>
    </div>
    {!!plan.items.length && <div className="attention-list" aria-label="Supporting attention records">
      {plan.items.map(item => {
        if (item.kind === 'role') return <button className="attention-row" key={item.id} onClick={() => onOpenJob(item.job)}>
          <span className="attention-tier">ATTENTION {item.job.attentionScore ?? '—'} · {item.job.triagePercent}% triage</span>
          <b>{item.title}</b><small>{item.detail}</small>
          <em>Portfolio coverage: {item.job.evidenceScore ?? '—'}% · {item.evidence.state === 'ready' ? 'evaluation ready' : item.evidence.state === 'partial' ? 'partial record' : 'not evaluated'}</em>
        </button>;
        if (item.kind === 'source') return <button className="attention-row source-row" key={item.id} onClick={onOpenSources}>
          <span className="attention-tier">SOURCE HEALTH</span><b>{item.company}</b><small>{item.detail}</small><em>Inspect source readiness →</em>
        </button>;
        return <div className="attention-row workflow-row" key={item.id}>
          <span className="attention-tier">LOCAL WORKFLOW</span><b>{item.title}</b><small>{item.detail}</small>
        </div>;
      })}
    </div>}
    <button className="attention-queue" disabled={disabled} onClick={onQueue}>Run my queue <span>Find, rank, and evaluate fresh roles →</span></button>
  </section>;
}
