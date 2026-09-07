import { IceScene } from './IceScene';
import { displayDate, type Snapshot } from '../services/command';
export function GlacialHero({data,working,run,explore}:{data:Snapshot;working:boolean;run:()=>void;explore:()=>void}){
  return <section className="glacial-hero" aria-label="Career command landscape">
    <IceScene/>
    <div className="scene-grain" aria-hidden="true"/>
    <div className="scene-coordinate">AK — 001<br/>PERSONAL CAREER OPERATIONS<br/><span>CONNECTED / LOCAL ENGINE</span></div>
    <div className="hero-heading"><span className="hero-kicker">ARCHIS KHANAL / CAREER INTELLIGENCE</span><h2>MAKE YOUR<br/><span>WORK COUNT.</span></h2><p>Turn real technical work into focused opportunity.<br/>One private system for your next move.</p><button disabled={working} onClick={run}>FIND + EVALUATE <span>↗</span></button></div>
    <div className="scene-marker marker-one"><span>+</span><div>01 / INGESTION<b>{data.scan.checked.toLocaleString()}</b><small>JOBS CHECKED</small></div></div>
    <div className="scene-marker marker-two"><span>+</span><div>02 / INTELLIGENCE<b>{data.jobs.filter(j=>j.report).length.toString().padStart(2,'0')}</b><small>VERIFIED REPORT FILES</small></div></div>
    <div className="scene-caption"><span>LIVE DATA / {data.operator.name.toUpperCase()}</span><span>LAST SCAN — {displayDate(data.scan.timestamp)}</span></div>
    <button className="scene-explore" onClick={explore}>EXPLORE YOUR PIPELINE <span>↓</span></button>
  </section>;
}
