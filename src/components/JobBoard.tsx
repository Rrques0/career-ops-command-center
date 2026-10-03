import { useMemo, useState } from 'react';
import type { JobPosting } from '../services';

interface Props { jobs: JobPosting[] }

export function JobBoard({ jobs }: Props) {
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('All departments');
  const [selected, setSelected] = useState<JobPosting>();
  const departments = ['All departments', ...new Set(jobs.map(job => job.department))];
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return jobs.filter(job => {
      const matchesSearch = !search || [job.title, job.department, job.summary, ...job.skills]
        .some(value => value.toLowerCase().includes(search));
      return matchesSearch && (department === 'All departments' || job.department === department);
    });
  }, [department, jobs, query]);

  return (
    <section className="page" aria-labelledby="job-board-title">
      <div className="page-heading"><div><p className="eyebrow">Career Ops pipeline</p><h1 id="job-board-title">Your saved opportunities.</h1></div><p>{filtered.length} tracked roles</p></div>
      <div className="filters" role="search">
        <label><span>Search roles or skills</span><input aria-label="Search roles or skills" value={query} onChange={event => setQuery(event.target.value)} placeholder="Try “data”, “security”, or “SQL”" /></label>
        <label><span>Department</span><select value={department} onChange={event => setDepartment(event.target.value)}>{departments.map(value => <option key={value}>{value}</option>)}</select></label>
      </div>
      <div className="job-list" aria-live="polite">
        {filtered.map(job => (
          <article className="job-card" key={job.id} data-testid="job-card">
            <div className="job-card-top"><span className="department-badge">{job.department}</span><span>{formatDate(job.postedAt)}</span></div>
            <h2>{job.title}</h2><p>{job.summary}</p>
            <div className="job-meta"><span>{job.location}</span><span>{job.workMode}</span></div>
            <div className="chips">{job.skills.map(skill => <span className="chip muted" key={skill}>{skill}</span>)}</div>
            <button className="primary-button" onClick={() => setSelected(job)}>View & apply</button>
          </article>
        ))}
        {!filtered.length && <div className="empty-state"><h2>No roles found</h2><p>Try a broader keyword or another department.</p></div>}
      </div>
      {selected && <ApplyDialog job={selected} onClose={() => setSelected(undefined)} />}
    </section>
  );
}

function ApplyDialog({ job, onClose }: { job: JobPosting; onClose: () => void }) {
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="apply-title">
        <button className="close-button" aria-label="Close application details" onClick={onClose}>×</button>
        <p className="eyebrow">Career Ops opportunity</p><h2 id="apply-title">{job.title}</h2><p>{job.summary}</p>
        <h3>What you’ll bring</h3><ul>{job.requirements.map(item => <li key={item}>{item}</li>)}</ul>
        <div className="dialog-actions"><button className="secondary-button" onClick={onClose}>Not now</button><a className="primary-button link-button" href={job.internalApplyUrl} target="_blank" rel="noreferrer">Open job posting</a></div>
      </section>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${value}T12:00:00`));
}
