import { useEffect, useRef, useState } from 'react';
import { views, type View } from '../services/navigation';
import type { Opportunity } from '../services/command';

export function QuickNavigate({ jobs, close, navigate, select }: { jobs: Opportunity[]; close: () => void; navigate: (view: View) => void; select: (id: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');
  useEffect(() => {
    const node = dialog.current;
    const root = node?.getRootNode() as ShadowRoot | undefined;
    const previous = root?.activeElement as HTMLElement | null;
    node?.showModal();
    return () => { node?.close(); if (previous?.isConnected) previous.focus(); };
  }, []);
  const needle = query.trim().toLowerCase();
  const pages = views.filter(v => v.toLowerCase().includes(needle));
  const matches = needle ? jobs.filter(j => `${j.company} ${j.role} ${j.location}`.toLowerCase().includes(needle)).slice(0, 12) : [];
  return <dialog ref={dialog} className="quick-dialog" aria-label="Quick navigation" onCancel={close} onClick={e => { if (e.target === e.currentTarget) close(); }}><div className="quick-content"><div className="section-label">GO ANYWHERE<button onClick={close}>Close · Esc</button></div><label>Search pages or opportunities<input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Try Applications, GRC, or a company…"/></label><p className="muted">Tab to a result, then Enter to open. Ctrl/Cmd + K opens this search anywhere.</p><div className="quick-results">{pages.map(v => <button key={v} onClick={() => { navigate(v); close(); }}><b>{v}</b><small>Open page →</small></button>)}{matches.map(j => <button key={j.id} onClick={() => { select(j.id); close(); }}><b>{j.company} · {j.role}</b><small>{j.stage} · {j.location}</small></button>)}{!pages.length && !matches.length && <p>No matches. Try a shorter company name or role.</p>}</div></div></dialog>;
}
