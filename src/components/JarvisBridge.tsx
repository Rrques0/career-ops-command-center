import type { JarvisSnapshot } from '../services/command';

export function JarvisBridge({ brain }: { brain: JarvisSnapshot }) {
  const live = brain.status === 'Live';
  return <section className="panel jarvis-bridge" aria-label="Jarvis bridge">
    <div className="section-label">JARVIS BRIDGE<span className={live ? 'good' : 'amber'}>{brain.status} / READ-ONLY</span></div>
    <p className="muted">Career Ops reads a small projection from your local Fresh JArvis / Super War Room state. It does not crawl, rewrite, or upload vault notes.</p>
    {live ? <>
      <div className="jarvis-meta"><span><b>Mission</b>{brain.mission || 'Not set'}</span><span><b>Project</b>{brain.activeProject || 'Not set'}</span><span><b>Last state update</b>{brain.lastIndexed ? new Date(brain.lastIndexed).toLocaleString() : 'Not recorded'}</span></div>
      <div className="jarvis-next"><small>NEXT JARVIS ACTION</small><strong>{brain.nextAction || 'Capture the next meaningful action.'}</strong></div>
      <div className="jarvis-grid"><div><b>{brain.tasks.length}</b><small>active tasks</small></div><div><b>{brain.evidence.length}</b><small>recent evidence</small></div><div><b>{brain.blockers.length}</b><small>blockers</small></div></div>
      {!!brain.evidence.length && <details><summary>Recent evidence</summary>{brain.evidence.map(item => <p className="jarvis-feed" key={`${item.date}-${item.observation}`}><b>{item.confidence}</b> {item.observation}<small>{item.date}</small></p>)}</details>}
      {!!brain.blockers.length && <details><summary>Open blockers</summary>{brain.blockers.map((item, index) => <p className="jarvis-feed" key={`${item}-${index}`}>{item}</p>)}</details>}
    </> : <p>No approved Jarvis state was found. Set <code>CAREER_OPS_JARVIS_ROOT</code> to an explicit local root, then restart the local engine.</p>}
  </section>;
}
