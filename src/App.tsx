import { useCallback, useEffect, useRef, useState } from 'react';
import { action, snapshot, stages, safeLink, displayDate as date, type Opportunity, type Snapshot } from './services/command';
import { ActionDrawer } from './components/ActionDrawer';
import { GlacialHero } from './components/GlacialHero';
import { ProfileShare } from './components/ProfileShare';
import { QuickNavigate } from './components/QuickNavigate';
import { ApplicationExplorer } from './components/ApplicationExplorer';
import { useNavigation, usePreference, views } from './services/navigation';
export type { View } from './services/navigation';
import { IntelligenceViews } from './components/IntelligenceViews';
import { CareerStrategy } from './components/CareerStrategy';
import { JarvisBridge } from './components/JarvisBridge';
import { nextSafeAction } from './services/nextAction';
import { attentionPlan } from './services/attention';
import { AttentionAllocator } from './components/AttentionAllocator';

export function App() {
  const [data, setData] = useState<Snapshot>();
  const [offline, setOffline] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [view, setView] = useNavigation();
  const [sharing, setSharing] = useState(false);
  const [quick, setQuick] = useState(false);
  const [stage, setStage] = usePreference('stage', 'All', ['All', ...stages]);
  const [pendingJobId, setPendingJobId] = useState('');
  const refreshInFlight = useRef<{ promise: Promise<void>; requireFresh: boolean } | undefined>(undefined);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setQuick(value => !value); } };
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  }, []);
  const [selected, setSelected] = useState('');
  const refresh = useCallback(async (requireFresh = false): Promise<void> => {
    const active = refreshInFlight.current;
    if (active && (!requireFresh || active.requireFresh)) return active.promise;
    // A passive poll may already be serving stale-while-revalidate data. An
    // explicit save/action must wait for that request, then issue its own
    // fresh read instead of inheriting the stale promise.
    if (active && requireFresh) {
      await active.promise;
      return refresh(true);
    }
    const request = (async () => {
      try { setData(await snapshot({ requireFresh })); setOffline(''); } catch (error) { setOffline(String(error)); }
    })();
    refreshInFlight.current = { promise: request, requireFresh };
    try { await request; } finally { if (refreshInFlight.current?.promise === request) refreshInFlight.current = undefined; }
  }, []);
  const refreshFresh = useCallback(async (): Promise<void> => {
    // Contact notes are an audit write. Bypass the passive poll singleflight
    // so the drawer cannot close over a stale snapshot after the save.
    try { setData(await snapshot({ requireFresh: true })); setOffline(''); } catch (error) { setOffline(String(error)); }
  }, []);
  useEffect(() => {
    void refresh();
    const poll = () => { if (document.visibilityState === 'visible') void refresh(); };
    const onVisibility = () => { if (document.visibilityState === 'visible') void refresh(); };
    const id = setInterval(poll, 15000);
    document.addEventListener('visibilitychange', onVisibility);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisibility); };
  }, [refresh]);
  async function run(kind: string, jobId = '', options: { preserveSelection?: boolean } = {}) {
    setBusy(true); setMessage('');
    try {
      await action('tasks', { kind, jobId });
      if (jobId && ['evaluate', 'strategy'].includes(kind)) setPendingJobId(jobId);
      if (options.preserveSelection) setView('Applications');
      else if (kind === 'organize') { setStage('Discovered'); setView('Applications'); }
      else if (kind === 'autopilot') { setStage('All'); setView('Applications'); }
      else setView('Activity');
      if (!options.preserveSelection) setSelected('');
      await refresh(true);
    }
    catch (error) { setMessage(String(error)); } finally { setBusy(false); }
  }
  async function transition(job: Opportunity, stage: string) {
    setBusy(true);
    try { await action('stage', { jobId: job.id, stage }); setMessage(`${job.company}: saved as ${stage}`); await refresh(true); }
    catch (error) { setMessage(String(error)); } finally { setBusy(false); }
  }
  const working = busy || !!offline || !!data?.tasks.some(t => t.status === 'running');
  const job = data?.jobs.find(j => j.id === selected);
  const matches = data?.jobs.filter(j => j.stage === 'Discovered').slice(0, 8) ?? [];
  const next = data ? nextSafeAction(data) : undefined;
  const attention = data ? attentionPlan(data) : undefined;
  const nextDisabled = busy || !!offline;
  function prepare(job: Opportunity) { setSelected(job.id); void run('evaluate', job.id, { preserveSelection: true }); }
  function doNextAction() {
    if (!next || nextDisabled) return;
    if (next.kind === 'review' || next.kind === 'lifecycle') setSelected(next.job.id);
    else if (next.kind === 'evaluate') prepare(next.job);
    else if (next.kind === 'queue') void run('autopilot');
    else setView('Activity');
  }
  const nextControl = next && { title: next.title, detail: next.detail, button: next.button, disabled: nextDisabled, run: doNextAction };
  useEffect(() => { if (pendingJobId && data && !data.tasks.some(task => task.status === 'running')) setPendingJobId(''); }, [data, pendingJobId]);
  return <div data-career-hub className="command-shell" data-view={view}>
    <aside className="rail"><div className="brand"><span className="sigil">CO</span><div>CAREER OPS<small>OPERATOR CONSOLE</small></div></div><div className="rail-group"><span className="rail-label">WORK</span><nav aria-label="Work navigation">{views.slice(0, 3).map((v, i) => <button key={v} aria-current={view === v ? 'page' : undefined} onClick={() => setView(v)}><span>0{i + 1}</span>{v}</button>)}</nav></div><div className="rail-group"><span className="rail-label">REFERENCE</span><nav aria-label="Reference navigation">{views.slice(3).map((v, i) => <button key={v} aria-current={view === v ? 'page' : undefined} onClick={() => setView(v)}><span>0{i + 4}</span>{v}</button>)}</nav></div><div className="rail-bottom"><span className="signal"/> LOCAL INSTANCE<small>Python intelligence / React console<br/>User-controlled applications</small></div></aside>
    <div className="workspace"><header className="masthead"><div><span className="eyebrow">PERSONAL OPERATIONS / {view.toUpperCase()}</span><h1>{view === 'Command' ? 'Career intelligence command' : view}</h1></div><button className="quick-trigger" onClick={() => setQuick(true)}>Quick search <kbd>Ctrl K</kbd></button><div className="connection" role="status" aria-live="polite"><span className={offline ? 'signal warning' : 'signal'}/>{offline ? 'ENGINE OFFLINE' : data?.performance?.status === 'stale' ? 'SNAPSHOT STALE' : data?.performance?.status === 'degraded' ? 'ENGINE DEGRADED' : data ? 'ENGINE CONNECTED' : 'CONNECTING'}<small>{data ? `Snapshot r${data.performance?.snapshotRevision ?? '—'} · ${data.performance?.status ?? 'local'} · ${date(data.generatedAt)}` : 'Loading local records'}</small></div></header>
    {offline && <div className="notice error" role="alert">{offline} {data && 'Showing the last successful snapshot.'}<button onClick={() => void refresh()}>Retry connection</button></div>}
    {!offline && data?.performance?.status === 'stale' && <div className="notice" role="status">Refreshing local records. You are viewing the last complete, verified snapshot.</div>}
    {!offline && data?.performance?.status === 'degraded' && <div className="notice error" role="status">The latest local refresh needs repair. Your last complete, verified snapshot is still available.</div>}
    {message && <div className="notice" role="status">{message}<button onClick={() => setMessage('')}>Dismiss</button></div>}
    {!data ? <section className="panel"><h2>{offline ? 'Start the local engine' : 'Reading your Career Ops files…'}</h2><p>Open My Career Hub from your Desktop. The launcher starts the Python engine and web interface together.</p></section> : <>
      {view === 'Command' && <GlacialHero data={data} action={nextControl!} explore={() => { setStage('Discovered'); setView('Applications'); }}/>}
      {!!data.syncPending?.length && <div className="notice error" role="alert">{data.syncPending.length} stage updates are saved locally but still need synchronization with the native tracker.<button onClick={async () => { try { await action('sync', {}); await refresh(true); } catch (error) { setMessage(String(error)); } }}>Retry synchronization</button></div>}
      {view === 'Command' && attention && <AttentionAllocator plan={attention} disabled={nextDisabled} onNext={doNextAction} onOpenJob={job => setSelected(job.id)} onOpenSources={() => setView('Sources')} onQueue={() => void run('autopilot')}/>} 
      <section className="identity"><div><span className="eyebrow">OPERATOR / AK</span><h2>{data.operator.name}</h2><p>{data.operator.headline}</p></div><div className="identity-meta"><b>{data.operator.location}</b>{safeLink(data.operator.linkedin ?? '') && <a href={safeLink(data.operator.linkedin ?? '')} target="_blank" rel="noreferrer">My LinkedIn profile ↗</a>}{safeLink(data.operator.portfolio ?? '') && <a href={safeLink(data.operator.portfolio ?? '')} target="_blank" rel="noreferrer">Professional evidence ↗</a>}<button onClick={() => setSharing(true)}>Draft a LinkedIn project post</button><span>WGU Cybersecurity · {data.operator.education.remaining_classes ?? 'Unknown'} classes remaining</span><span>Early-career cyber · infrastructure · GRC · manufacturing IT/OT</span></div></section>
      {view === 'Command' && <CareerStrategy data={data}/>} 
      {view === 'Command' && <JarvisBridge brain={data.jarvis}/>}
      {view === 'Command' && <>
        <div className="telemetry-grid"><Metric label="LAST SCAN / CHECKED" value={data.scan.checked.toLocaleString()} detail={date(data.scan.timestamp)}/><Metric label="NEWLY SAVED" value={String(data.scan.added)} detail="Added by the latest recorded scan"/><Metric label="FILTERED + DEDUPED" value={(data.scan.filtered + data.scan.duplicates).toLocaleString()} detail="Recorded exclusions from the scanner"/><Metric label="EVALUATION REPORTS" value={String(data.jobs.filter(j => j.report).length)} detail="Existing reports in Career Ops"/></div>
        <section className="panel"><div className="section-label">APPLICATION FUNNEL<span>Current saved stages</span></div><div className="funnel">{stages.map((stage, i) => <button key={stage} onClick={() => { setStage(stage); setView('Applications'); }}><small>0{i + 1} / {stage}</small><strong>{data.funnel[stage]}</strong></button>)}</div></section>
        <section className="panel"><div className="section-label">PRIORITY MATRIX<span>Top {matches.length} unevaluated / transparent attention signal</span></div><p className="muted">Attention combines 60% native title/location triage with 40% portfolio evidence coverage. It is a workflow ordering signal—not a skills-match percentage, hiring probability, or estimate of other applicants.</p><div className="matrix-wrap"><table><thead><tr><th>Opportunity</th><th>Attention</th><th>Why it surfaced</th><th>Action</th></tr></thead><tbody>{matches.map(j => <tr key={j.id}><td><button className="plain" onClick={() => setSelected(j.id)}><b>{j.company}</b><span>{j.role}</span></button><small>{j.location}</small></td><td><strong className="mono">{j.attentionScore ?? '—'}</strong><small>{j.triagePercent}% triage · {j.evidenceScore ?? '—'}% evidence</small><span className={`tier ${j.tier}`}>{j.tier}</span></td><td>{j.rationale}<small>{j.evidenceRationale}</small></td><td><button disabled={working} onClick={() => prepare(j)}>Prepare pack</button><button disabled={busy || !!offline} onClick={() => void transition(j, 'Archived')}>Archive</button><button onClick={() => setSelected(j.id)}>Draft / details</button></td></tr>)}</tbody></table></div>{!matches.length && <p>No unevaluated roles. Run a scan to discover opportunities.</p>}</section>
      </>}
      {view === 'Applications' && <ApplicationExplorer jobs={data.jobs} stage={stage} setStage={setStage} busy={busy || !!offline} working={working} select={setSelected} transition={transition} run={kind => void run(kind)} next={nextControl!}/>}

      {!['Command', 'Applications'].includes(view) && <IntelligenceViews view={view} data={data} working={working} run={run} select={setSelected}/>}
      <footer>ARCHIS KHANAL / CAREER OPERATIONS<span>{data.jobs.length} opportunities · Local SQLite persistence</span></footer>
    </>}
    </div>{sharing && <ProfileShare close={() => setSharing(false)}/>} {quick && <QuickNavigate jobs={data?.jobs ?? []} close={() => setQuick(false)} navigate={setView} select={setSelected}/>}{job && !quick && <ActionDrawer key={job.id} job={job} disabled={working} busy={busy || !!offline} preparing={pendingJobId === job.id && working} close={() => setSelected('')} run={run} transition={transition} saved={refreshFresh}/>}</div>;
}
function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <article className="metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>; }
