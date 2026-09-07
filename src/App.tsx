import { useCallback, useEffect, useState } from 'react';
import { action, snapshot, stages, safeLink, displayDate as date, type Opportunity, type Snapshot } from './services/command';
import { ActionDrawer } from './components/ActionDrawer';
import { GlacialHero } from './components/GlacialHero';
import { ProfileShare } from './components/ProfileShare';
import { QuickNavigate } from './components/QuickNavigate';
import { ApplicationExplorer } from './components/ApplicationExplorer';
import { useNavigation, usePreference, views } from './services/navigation';
export type { View } from './services/navigation';
import { IntelligenceViews } from './components/IntelligenceViews';

export function App() {
  const [data, setData] = useState<Snapshot>();
  const [offline, setOffline] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [view, setView] = useNavigation();
  const [sharing, setSharing] = useState(false);
  const [quick, setQuick] = useState(false);
  const [stage, setStage] = usePreference('stage', 'All', ['All', ...stages]);
  const [hero, setHero] = usePreference('hero', 'show', ['show', 'hide']);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setQuick(value => !value); } };
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  }, []);
  const [selected, setSelected] = useState('');
  const refresh = useCallback(async () => {
    try { setData(await snapshot()); setOffline(''); } catch (error) { setOffline(String(error)); }
  }, []);
  useEffect(() => { void refresh(); const id = setInterval(() => void refresh(), 5000); return () => clearInterval(id); }, [refresh]);
  async function run(kind: string, jobId = '') {
    setBusy(true); setMessage('');
    try { await action('tasks', { kind, jobId }); setView('Activity'); setSelected(''); await refresh(); }
    catch (error) { setMessage(String(error)); } finally { setBusy(false); }
  }
  async function transition(job: Opportunity, stage: string) {
    setBusy(true);
    try { await action('stage', { jobId: job.id, stage }); setMessage(`${job.company}: saved as ${stage}`); await refresh(); }
    catch (error) { setMessage(String(error)); } finally { setBusy(false); }
  }
  const working = busy || !!offline || !!data?.tasks.some(t => t.status === 'running');
  const job = data?.jobs.find(j => j.id === selected);
  const matches = data?.jobs.filter(j => j.stage === 'Discovered').slice(0, 8) ?? [];
  const reviewed = data?.jobs.find(j => j.report && j.stage === 'Evaluated');
  const repairs = data?.sources.filter(s => s.status === 'Needing Repair').length ?? 0;
  return <div data-career-hub className="command-shell" data-view={view}>
    <aside className="rail"><div className="brand"><span className="sigil">CO</span><div>CAREER OPS<small>OPERATOR CONSOLE</small></div></div><div className="rail-group"><span className="rail-label">WORK</span><nav aria-label="Work navigation">{views.slice(0, 3).map((v, i) => <button key={v} aria-current={view === v ? 'page' : undefined} onClick={() => setView(v)}><span>0{i + 1}</span>{v}</button>)}</nav></div><div className="rail-group"><span className="rail-label">REFERENCE</span><nav aria-label="Reference navigation">{views.slice(3).map((v, i) => <button key={v} aria-current={view === v ? 'page' : undefined} onClick={() => setView(v)}><span>0{i + 4}</span>{v}</button>)}</nav></div><div className="rail-bottom"><span className="signal"/> LOCAL INSTANCE<small>Python intelligence / React console<br/>User-controlled applications</small></div></aside>
    <div className="workspace"><header className="masthead"><div><span className="eyebrow">PERSONAL OPERATIONS / {view.toUpperCase()}</span><h1>{view === 'Command' ? 'Career intelligence command' : view}</h1></div><button className="quick-trigger" onClick={() => setQuick(true)}>Quick search <kbd>Ctrl K</kbd></button><div className="connection"><span className={offline ? 'signal warning' : 'signal'}/>{offline ? 'ENGINE OFFLINE' : data ? 'ENGINE CONNECTED' : 'CONNECTING'}<small>{data ? `Read ${date(data.generatedAt)}` : 'Loading local records'}</small></div></header>
    {offline && <div className="notice error" role="alert">{offline} {data && 'Showing the last successful snapshot.'}<button onClick={() => void refresh()}>Retry connection</button></div>}
    {message && <div className="notice" role="status">{message}<button onClick={() => setMessage('')}>Dismiss</button></div>}
    {!data ? <section className="panel"><h2>{offline ? 'Start the local engine' : 'Reading your Career Ops files…'}</h2><p>Open My Career Hub from your Desktop. The launcher starts the Python engine and web interface together.</p></section> : <>
      {view === 'Command' && <div className="focus-controls"><button onClick={() => setHero(hero === 'show' ? 'hide' : 'show')}>{hero === 'show' ? 'Focus mode · hide scene' : 'Show ice scene'}</button><button onClick={() => setView('Applications')}>Go straight to my applications →</button></div>}
      {view === 'Command' && hero === 'show' && <GlacialHero data={data} working={working} run={() => void run('autopilot')} explore={() => setView('Applications')}/>}
      {!!data.syncPending?.length && <div className="notice error" role="alert">{data.syncPending.length} stage updates are saved locally but still need synchronization with the native tracker.<button onClick={async () => { try { await action('sync', {}); await refresh(); } catch (error) { setMessage(String(error)); } }}>Retry synchronization</button></div>}
      <section className="identity"><div><span className="eyebrow">OPERATOR / AK</span><h2>{data.operator.name}</h2><p>{data.operator.headline}</p></div><div className="identity-meta"><b>{data.operator.location}</b>{safeLink(data.operator.linkedin ?? '') && <a href={safeLink(data.operator.linkedin ?? '')} target="_blank" rel="noreferrer">My LinkedIn profile ↗</a>}<button onClick={() => setSharing(true)}>Draft a LinkedIn project post</button><span>WGU Cybersecurity · {data.operator.education.remaining_classes ?? 'Unknown'} classes remaining</span><span>Early-career cyber · infrastructure · GRC · manufacturing IT/OT</span></div></section>
      {view === 'Command' && <>
        <section className="today"><div className="section-label">TODAY<span>03 NEXT ACTIONS</span></div><div className="action-grid"><button disabled={working} onClick={() => void run('autopilot')}><span>01 / DISCOVER + EVALUATE</span><b>Build your next application shortlist</b><small>Run the scanner; evaluate up to 3 strongest roles. AI usage may apply.</small><em>Run daily workflow →</em></button><button disabled={!reviewed} onClick={() => reviewed && setSelected(reviewed.id)}><span>02 / REVIEW</span><b>{reviewed ? `Review ${reviewed.company}` : 'Review your application pipeline'}</b><small>{reviewed?.role ?? 'Evaluate a role to create an application pack.'}</small><em>Open application pack →</em></button><button onClick={() => setView('Sources')}><span>03 / SOURCE READINESS</span><b>{repairs} sources need attention</b><small>Inspect recorded failures and run source verification.</small><em>Inspect source health →</em></button></div></section>
        <div className="telemetry-grid"><Metric label="LAST SCAN / CHECKED" value={data.scan.checked.toLocaleString()} detail={date(data.scan.timestamp)}/><Metric label="NEWLY SAVED" value={String(data.scan.added)} detail="Added by the latest recorded scan"/><Metric label="FILTERED + DEDUPED" value={(data.scan.filtered + data.scan.duplicates).toLocaleString()} detail="Recorded exclusions from the scanner"/><Metric label="EVALUATION REPORTS" value={String(data.jobs.filter(j => j.report).length)} detail="Existing reports in Career Ops"/></div>
        <section className="panel"><div className="section-label">APPLICATION FUNNEL<span>Current saved stages</span></div><div className="funnel">{stages.map((stage, i) => <button key={stage} onClick={() => { setStage(stage); setView('Applications'); }}><small>0{i + 1} / {stage}</small><strong>{data.funnel[stage]}</strong></button>)}</div></section>
        <section className="panel"><div className="section-label">PRIORITY MATRIX<span>Top {matches.length} unevaluated / rule-based triage</span></div><p className="muted">Priority % normalizes the Python ranker’s title and location rules. It is not a skills-match percentage or an estimate of other applicants.</p><div className="matrix-wrap"><table><thead><tr><th>Opportunity</th><th>Priority</th><th>Why it surfaced</th><th>Action</th></tr></thead><tbody>{matches.map(j => <tr key={j.id}><td><button className="plain" onClick={() => setSelected(j.id)}><b>{j.company}</b><span>{j.role}</span></button><small>{j.location}</small></td><td><strong className="mono">{j.triagePercent}%</strong><span className={`tier ${j.tier}`}>{j.tier}</span></td><td>{j.rationale}</td><td><button disabled={working} onClick={() => void run('evaluate', j.id)}>Evaluate</button><button disabled={busy || !!offline} onClick={() => void transition(j, 'Archived')}>Archive</button><button onClick={() => setSelected(j.id)}>Draft / details</button></td></tr>)}</tbody></table></div>{!matches.length && <p>No unevaluated roles. Run a scan to discover opportunities.</p>}</section>
      </>}
      {view === 'Applications' && <ApplicationExplorer jobs={data.jobs} stage={stage} setStage={setStage} busy={busy || !!offline} working={working} select={setSelected} transition={transition} run={kind => void run(kind)}/>}

      {!['Command', 'Applications'].includes(view) && <IntelligenceViews view={view} data={data} working={working} run={run} select={setSelected}/>}
      <footer>ARCHIS KHANAL / CAREER OPERATIONS<span>{data.jobs.length} opportunities · Local SQLite persistence</span></footer>
    </>}
    </div>{sharing && <ProfileShare close={() => setSharing(false)}/>} {quick && <QuickNavigate jobs={data?.jobs ?? []} close={() => setQuick(false)} navigate={setView} select={setSelected}/>}{job && !quick && <ActionDrawer key={job.id} job={job} disabled={working} busy={busy || !!offline} close={() => setSelected('')} run={run} transition={transition} saved={refresh}/>}</div>;
}
function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <article className="metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>; }
