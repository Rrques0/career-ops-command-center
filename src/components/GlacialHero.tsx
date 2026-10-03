import { displayDate, type Snapshot } from '../services/command';
export function GlacialHero({data,action,explore}:{data:Snapshot;action:{title:string;detail:string;button:string;disabled:boolean;run:()=>void};explore:()=>void}){
  const reports = data.jobs.filter(job => Boolean(job.report)).length;
  const active = data.jobs.filter(job => ['Applied', 'Screen/Interview', 'Offer'].includes(job.stage)).length;
  return <section className="glacial-hero premium-hero" aria-label="Career command overview">
    <div className="hero-copy"><span className="hero-kicker">CAREER OPS FOR {data.operator.name.toUpperCase()}</span><h2>Your next role,<br/><em>properly managed.</em></h2><p>Turn scattered search work into a measurable pipeline: discover, evaluate, prepare, follow up.</p><div className="hero-actions"><button aria-label="Do next safe action" disabled={action.disabled} onClick={action.run}>{action.button} <span>→</span></button><button className="secondary-hero" onClick={explore}>Review discovered roles</button></div><div className="hero-metrics"><span><b>{data.scan.checked.toLocaleString()}</b> checked</span><span><b>{reports}</b> reports ready</span><span><b>{active}</b> active threads</span></div><small>NEXT / {action.title} · Public scan + repeatable AI triage · Last run: {displayDate(data.scan.timestamp)}</small></div>
    <div className="hero-visual" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orbit-core"><span>CAREER<br/>OPS</span></div><div className="orbit-note note-one">{data.scan.checked.toLocaleString()}<small>roles examined</small></div><div className="orbit-note note-two">{data.jobs.filter(j=>j.report).length}<small>reports ready</small></div></div>
    <div className="hero-footer"><span><i/> Local-first and private</span><span>Your decisions stay yours</span></div>
  </section>;
}
