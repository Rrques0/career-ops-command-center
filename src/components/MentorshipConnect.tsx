import { useState } from 'react';
import type { MentorProfile } from '../services';

interface Props {
  mentors: MentorProfile[];
  requestedMentorIds: string[];
  onRequestMentor: (mentorId: string) => Promise<void>;
}

export function MentorshipConnect({ mentors, requestedMentorIds, onRequestMentor }: Props) {
  const [index, setIndex] = useState(0);
  const mentor = mentors[index % mentors.length];

  async function requestConnection() {
    await onRequestMentor(mentor.id);
  }

  return (
    <section className="page mentorship-page" aria-labelledby="mentor-title">
      <div className="page-heading"><div><p className="eyebrow">Career Ops outreach</p><h1 id="mentor-title">Find the right career guide.</h1></div><p>No identities are invented</p></div>
      <div className="mentor-layout">
        <article className="mentor-card" data-testid="mentor-card">
          <div className="mentor-portrait" aria-hidden="true">{initials(mentor.displayName)}</div>
          <p className="match-label">Recommended target · {mentor.availability}</p>
          <h2>{mentor.displayName}</h2><p className="mentor-role">{mentor.role}<br />{mentor.department}</p>
          <div className="chips centered">{mentor.expertise.map(item => <span className="chip" key={item}>{item}</span>)}</div>
          <p className="mentor-copy">This is a contact archetype based on your Career Ops targets. Research must verify a real person before any outreach is drafted.</p>
          <div className="mentor-actions">
            <button className="secondary-button" onClick={() => setIndex(value => (value + 1) % mentors.length)}>Next match</button>
            <button className="primary-button" onClick={requestConnection} disabled={requestedMentorIds.includes(mentor.id)}>{requestedMentorIds.includes(mentor.id) ? 'Research queued' : 'Queue research'}</button>
          </div>
        </article>
        <aside className="mentor-aside"><p className="eyebrow">How it works</p><h2>Research first. Reach out with purpose.</h2><ol><li>Choose the kind of mentor who fits your goal.</li><li>Career Ops researches a real, relevant person.</li><li>You review every draft before anything is sent.</li></ol></aside>
      </div>
    </section>
  );
}

function initials(name: string) { return name.split(' ').map(part => part[0]).join('').slice(0, 2); }
