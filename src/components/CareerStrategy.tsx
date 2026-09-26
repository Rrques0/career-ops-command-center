import type { Snapshot } from '../services/command';

const lanes = ['Manufacturing IT/OT', 'Systems / Infrastructure / IAM', 'Cybersecurity / GRC / CMMC'];

export function CareerStrategy({ data }: { data: Snapshot }) {
  const laneCount = (lane: string) => data.jobs.filter(job => job.lane === lane).length;
  const bridgeCount = (label: string) => data.jobs.filter(job => job.bridgeLabel === label).length;
  return <section className="strategy-grid" aria-label="Career strategy"><article className="panel strategy-panel"><div className="section-label">CAREER LANES<span>RECRUITER-READABLE POSITIONING</span></div><p className="strategy-lead">Systems and infrastructure operator securing manufacturing environments across identity, networks, ERP/OT systems, and CMMC/NIST compliance.</p><div className="lane-list">{lanes.map(lane => <div key={lane}><span>{lane}</span><b>{laneCount(lane)}</b><small>saved roles</small></div>)}</div><div className="bridge-row"><span>Direct target <b>{bridgeCount('Direct target')}</b></span><span>Strong bridge <b>{bridgeCount('Strong bridge')}</b></span><span>Stretch <b>{bridgeCount('Stretch')}</b></span></div></article><article className="panel strategy-panel"><div className="section-label">PROOF BEFORE POLISH<span>WHAT TO SHOW FIRST</span></div><p className="muted">Each lane maps your confirmed evidence to the employer problem before a resume is tailored.</p><div className="case-list">{data.caseStudies.slice(0, 4).map(study => <details key={study.id}><summary>{study.title}<span>{study.lane}</span></summary><p><b>Risk:</b> {study.risk}</p><p><b>Action:</b> {study.action}</p><p><b>Result:</b> {study.result}</p></details>)}</div></article></section>;
}
