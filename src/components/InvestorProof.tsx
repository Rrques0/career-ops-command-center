import type { Snapshot } from '../services/command';

export function InvestorProof({ data, onOpenProjects }: { data: Snapshot; onOpenProjects: () => void }) {
  const reports = data.jobs.filter(job => Boolean(job.report)).length;
  const active = data.jobs.filter(job => ['Applied', 'Screen/Interview', 'Offer'].includes(job.stage)).length;
  const sourceCount = data.sources.length;
  const evidenceUrl = data.professionalEvidence?.source;
  return <section id="investor-proof" className="investor-proof" aria-label="Product proof">
    <div className="proof-heading">
      <div><span className="eyebrow">PRODUCT PROOF / LOCAL TELEMETRY</span><h2>A career system with an operating rhythm.</h2></div>
      <p>Career Ops turns scattered search work into a measurable, reviewable pipeline without taking the final decision away from the operator.</p>
    </div>
    <div className="proof-metrics">
      <article><span>PIPELINE</span><strong>{data.jobs.length}</strong><small>roles held in one local queue</small></article>
      <article><span>SOURCE CHECKS</span><strong>{data.scan.checked.toLocaleString()}</strong><small>recorded scanner activity</small></article>
      <article><span>REPORTS READY</span><strong>{reports}</strong><small>saved evaluation artifacts</small></article>
      <article><span>ACTIVE THREADS</span><strong>{active}</strong><small>applied, interview, or offer</small></article>
    </div>
    <div className="proof-pillars">
      <article><span>01 / WORKFLOW COMPRESSION</span><h3>One queue replaces scattered tabs.</h3><p>Discover, evaluate, prepare, and follow up from one review surface with saved stages and audit history.</p></article>
      <article><span>02 / EVIDENCE LAYER</span><h3>Proof before polish.</h3><p>Role ordering combines native triage with source-annotated portfolio evidence. The signal is transparent—not a hiring prediction.</p></article>
      <article><span>03 / TRUST BOUNDARY</span><h3>Automation stops before commitment.</h3><p>{sourceCount} source records and local persistence are visible, while applications, messages, and submissions remain human-controlled.</p></article>
    </div>
    <div className="proof-footer">
      <span><i/> HUMAN APPROVAL REQUIRED</span>
      <div>{evidenceUrl && <a href={evidenceUrl} target="_blank" rel="noreferrer">View source evidence ↗</a>}<button onClick={onOpenProjects}>View shipped projects →</button></div>
    </div>
  </section>;
}
