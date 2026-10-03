import type { Snapshot } from '../services/command';

type CommandStripProps = {
  data: Snapshot;
  onFind: () => void;
  onReview: () => void;
  onPrepare: () => void;
  onTrack: () => void;
  onShowProof: () => void;
};

export function CommandStrip({ data, onFind, onReview, onPrepare, onTrack, onShowProof }: CommandStripProps) {
  const discovered = data.jobs.filter(job => job.stage === 'Discovered').length;
  const active = data.jobs.filter(job => ['Applied', 'Screen/Interview', 'Offer'].includes(job.stage)).length;
  const reports = data.jobs.filter(job => Boolean(job.report)).length;
  const actions = [
    { index: '01', label: 'Find roles', detail: `${data.scan.checked.toLocaleString()} source checks recorded`, onClick: onFind },
    { index: '02', label: 'Review queue', detail: `${discovered} roles waiting for review`, onClick: onReview },
    { index: '03', label: 'Prepare pack', detail: `${reports} evidence-backed reports ready`, onClick: onPrepare },
    { index: '04', label: 'Track applications', detail: `${active} active employer conversations`, onClick: onTrack },
  ];
  return <section className="command-strip" aria-label="Core workflow shortcuts">
    <div className="command-strip-intro">
      <span className="eyebrow">THE OPERATING LOOP</span>
      <strong>Discover → decide → prepare → follow up</strong>
      <button className="proof-link" onClick={onShowProof}>See product proof ↓</button>
    </div>
    <div className="command-actions">
      {actions.map(action => <button key={action.index} className={action.index === '02' ? 'command-action active' : 'command-action'} onClick={action.onClick}>
        <span className="command-index">{action.index}</span>
        <b>{action.label}</b>
        <small>{action.detail}</small>
        <em>Open →</em>
      </button>)}
    </div>
  </section>;
}
