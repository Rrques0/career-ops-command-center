import { useState } from 'react';
import { safeLink, type LearningPathRecord } from '../services/command';

type Status = LearningPathRecord['status'];

function readOverrides(): Record<string, Status> {
  try {
    const value = JSON.parse(localStorage.getItem('career-ui:learning-path-status-v1') || '{}');
    return value && typeof value === 'object' ? value : {};
  } catch { return {}; }
}

export function LearningPathBoard({ paths }: { paths: LearningPathRecord[] }) {
  const [overrides, setOverrides] = useState<Record<string, Status>>(readOverrides);
  function update(id: string, status: Status) {
    const next = { ...overrides, [id]: status };
    setOverrides(next);
    try { localStorage.setItem('career-ui:learning-path-status-v1', JSON.stringify(next)); } catch { /* private mode: retain this session */ }
  }
  return <section className="panel learning-path-board" aria-label="Learning paths">
    <div className="section-label">LEARNING PATHS<span>WGU / CERTIFICATION ROADMAP</span></div>
    <p className="muted">A practical sequence for your current career lanes. Status is a local planning preference; verify current eligibility, pricing, and exam requirements with each provider.</p>
    <div className="learning-path-grid">{paths.map(path => {
      const status = overrides[path.id] || path.status;
      const link = safeLink(path.url);
      return <article className="learning-path-card" key={path.id}>
        <div className="learning-path-top"><span className={`path-status ${status}`}>{status.replace('-', ' ')}</span><span className="path-track">{path.track}</span></div>
        <h3>{path.title}</h3>
        <p className="learning-provider">{path.provider} · {path.lane}</p>
        <p><b>Why:</b> {path.goal}</p>
        <p><b>Next:</b> {path.nextStep}</p>
        <small>{path.timebox} · {path.source}</small>
        <div className="learning-path-actions">
          {link && <a href={link} target="_blank" rel="noreferrer">Open official resource ↗</a>}
          <select aria-label={`${path.title} status`} value={status} onChange={event => update(path.id, event.target.value as Status)}>
            <option value="planned">Planned</option><option value="in-progress">In progress</option><option value="completed">Completed</option>
          </select>
        </div>
      </article>;
    })}</div>
  </section>;
}
