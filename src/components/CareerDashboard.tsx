import type { EmployeeProfile, JobPosting, LearningPath } from '../services';

interface Props {
  employee: EmployeeProfile;
  jobs: JobPosting[];
  learningPaths: LearningPath[];
  onBrowseJobs: () => void;
  onOpenLearning: () => void;
}

export function CareerDashboard({ employee, jobs, learningPaths, onBrowseJobs, onOpenLearning }: Props) {
  const target = employee.targetRoles[0];
  const recommended = jobs
    .map(job => ({ job, score: getMatchScore(employee.skills, job.skills) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
  const skillGaps = [...new Set(recommended.flatMap(({ job }) => job.skills))]
    .filter(skill => !employee.skills.some(current => current.toLowerCase() === skill.toLowerCase()))
    .slice(0, 4);
  const completed = learningPaths.filter(path => path.completionStatus === 'completed').length;

  return (
    <section className="page" aria-labelledby="dashboard-title">
      <div className="hero">
        <div>
          <p className="eyebrow">Your next chapter</p>
          <h1 id="dashboard-title">Good morning, {employee.displayName.split(' ')[0]}.</h1>
          <p className="hero-copy">You’re building toward <strong>{target}</strong>. Here’s the clearest path forward.</p>
        </div>
        <div className="momentum" aria-label={`${completed} learning paths completed`}>
          <span>{completed}/{learningPaths.length}</span>
          <small>paths completed</small>
        </div>
      </div>

      <div className="dashboard-grid">
        <article className="panel wide">
          <div className="panel-heading">
            <div><p className="eyebrow">Best next moves</p><h2>Roles matched to you</h2></div>
            <button className="text-button" onClick={onBrowseJobs}>View all roles →</button>
          </div>
          <div className="recommendations">
            {recommended.map(({ job, score }) => (
              <div className="recommendation" key={job.id}>
                <div className="score" aria-label={`${score}% skill match`}><strong>{score}%</strong><span>match</span></div>
                <div><h3>{job.title}</h3><p>{job.department} · {job.workMode}</p></div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel accent-panel">
          <p className="eyebrow">Growth focus</p>
          <h2>Skills that unlock more roles</h2>
          <div className="chips">{skillGaps.map(skill => <span className="chip" key={skill}>{skill}</span>)}</div>
          <button className="primary-button" onClick={onOpenLearning}>Explore learning paths</button>
        </article>

        <article className="panel wide">
          <p className="eyebrow">This week</p>
          <h2>One meaningful step</h2>
          <div className="next-step">
            <span className="step-number">01</span>
            <div><h3>Continue {learningPaths.find(path => path.completionStatus === 'in-progress')?.topic}</h3><p>About 35 minutes left in your current module.</p></div>
            <button className="secondary-button" onClick={onOpenLearning}>Resume</button>
          </div>
        </article>
      </div>
    </section>
  );
}

function getMatchScore(employeeSkills: string[], roleSkills: string[]) {
  const known = new Set(employeeSkills.map(skill => skill.toLowerCase()));
  const matched = roleSkills.filter(skill => known.has(skill.toLowerCase())).length;
  return Math.round(58 + (matched / Math.max(roleSkills.length, 1)) * 37);
}
