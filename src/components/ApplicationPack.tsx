import { useMemo, useState } from 'react';
import type { Opportunity } from '../services/command';

export function ApplicationPack({ job }: { job: Opportunity }) {
  const [status, setStatus] = useState('');
  const fit = job.strengths.slice(0, 3);
  const gaps = job.gaps.slice(0, 3);
  const pack = useMemo(() => [
    `APPLICATION REVIEW PACK — ${job.company}`,
    `Role: ${job.role}`,
    `Lane: ${job.lane || 'Review'}`,
    `Position: ${job.bridgeLabel || 'Review'}`,
    `Priority: ${job.tier} / ${job.triagePercent}%`,
    '', 'GROUNDED FIT', ...(fit.length ? fit.map(item => `- ${item}`) : ['- Evaluate this role to load report-backed fit evidence.']),
    '', 'OBJECTIONS / GAPS', ...(gaps.length ? gaps.map(item => `- ${item}`) : ['- No report-backed gaps recorded yet.']),
    '', `NEXT ACTION: ${job.nextAction || 'Review the live posting and decide whether to evaluate or apply.'}`,
    '', 'Review this pack before using any employer-facing material. Career Ops never submits or sends it automatically.',
  ].join('\n'), [job, fit, gaps]);
  async function copy() {
    try { await navigator.clipboard.writeText(pack); setStatus('Review pack copied.'); setTimeout(() => setStatus(''), 1800); }
    catch { setStatus('Clipboard unavailable — select the preview manually.'); }
  }
  return <section className="application-pack" aria-label="Application pack"><div className="section-label">MINIMUM VIABLE APPLICATION PACK<span>{job.lane || 'ROLE LANE'} / REVIEW ONLY</span></div><p className="muted">One review block: lane, position, grounded fit, objections, and next action. No employer-facing claim is created without evidence.</p><button type="button" onClick={() => void copy()}>Copy review pack</button><span className="pack-status" role="status">{status}</span><details><summary>Preview pack</summary><pre>{pack}</pre></details></section>;
}
