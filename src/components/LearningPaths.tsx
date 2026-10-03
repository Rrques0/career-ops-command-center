import type { LearningPath } from '../services';

export function LearningPaths({ paths }: { paths: LearningPath[] }) {
  return <section className="page" aria-labelledby="learning-title"><div className="page-heading"><div><p className="eyebrow">Skill development</p><h1 id="learning-title">Build skills with a purpose.</h1></div><p>{paths.length} pathways</p></div><div className="learning-list">{paths.map((path, index) => <article className="learning-card" key={path.id}><span className="path-index">0{index + 1}</span><div><span className={`status ${path.completionStatus}`}>{path.completionStatus.replace('-', ' ')}</span><h2>{path.topic}</h2><p>{path.provider} · {path.estimatedHours} hours</p></div><a href={path.url} className="secondary-button link-button">{path.completionStatus === 'in-progress' ? 'Resume' : path.completionStatus === 'completed' ? 'Review' : 'Start path'}</a></article>)}</div></section>;
}
