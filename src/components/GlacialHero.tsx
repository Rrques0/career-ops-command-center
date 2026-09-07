import { displayDate, type Snapshot } from '../services/command';
export function GlacialHero({data,working,run,explore}:{data:Snapshot;working:boolean;run:()=>void;explore:()=>void}){
  return <section className="glacial-hero premium-hero" aria-label="Career command overview">
    <div className="hero-copy"><span className="hero-kicker">CAREER OPS FOR {data.operator.name.toUpperCase()}</span><h2>Your next role,<br/><em>properly managed.</em></h2><p>Bring job discovery, thoughtful evaluation, application records, and portfolio work into one focused workspace.</p><div className="hero-actions"><button disabled={working} onClick={run}>Find roles to review <span>→</span></button><button className="secondary-hero" onClick={explore}>View my pipeline</button></div><small>Last source scan: {displayDate(data.scan.timestamp)}</small></div>
    <div className="hero-visual" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orbit-core"><span>CAREER<br/>OPS</span></div><div className="orbit-note note-one">{data.scan.checked.toLocaleString()}<small>roles examined</small></div><div className="orbit-note note-two">{data.jobs.filter(j=>j.report).length}<small>reports ready</small></div></div>
    <div className="hero-footer"><span><i/> Local-first and private</span><span>Your decisions stay yours</span></div>
  </section>;
}
