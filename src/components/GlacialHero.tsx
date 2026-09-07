import { IceScene } from './IceScene';
import { displayDate, type Snapshot } from '../services/command';
export function GlacialHero({data,working,run,explore}:{data:Snapshot;working:boolean;run:()=>void;explore:()=>void}){
  return <section className="glacial-hero" aria-label="Career command landscape">
    <IceScene/>
    <div className="scene-grain" aria-hidden="true"/>
    <div className="scene-coordinate">AK — 001<br/>PERSONAL CAREER INFRASTRUCTURE<br/><span>CONNECTED / LOCAL ENGINE</span></div>
    <div className="hero-heading"><span className="hero-kicker">YOUR EXPERIENCE. NEW POSSIBILITIES.</span><h2>BUILD YOUR<br/><span>NEXT CHAPTER.</span></h2><p>One place for your next role.<br/>Grounded in what you’ve actually built.</p><button disabled={working} onClick={run}>FIND + EVALUATE <span>↗</span></button></div>
    <div className="scene-marker marker-one"><span>+</span><div>01 / INGESTION<b>{data.scan.checked.toLocaleString()}</b><small>JOBS CHECKED</small></div></div>
    <div className="scene-marker marker-two"><span>+</span><div>02 / INTELLIGENCE<b>{data.jobs.filter(j=>j.report).length.toString().padStart(2,'0')}</b><small>VERIFIED REPORT FILES</small></div></div>
    <div className="scene-caption"><span>LIVE DATA / {data.operator.name.toUpperCase()}</span><span>LAST SCAN — {displayDate(data.scan.timestamp)}</span></div>
    <button className="scene-explore" onClick={explore}>EXPLORE YOUR PIPELINE <span>↓</span></button>
  </section>;
}
