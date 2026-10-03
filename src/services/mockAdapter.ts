import type { CareerHubAdapter, CareerHubSnapshot } from './types';

const snapshot: CareerHubSnapshot = {
  employee: {
    id: 'archis-khanal',
    displayName: 'Archis Khanal',
    currentDepartment: 'Advanced PMC · Regulated Manufacturing',
    role: 'Systems & Manufacturing IT Engineer / System Security Officer',
    skills: [
      'CMMC Level 2', 'NIST SP 800-171', 'IT/OT integration', 'Systems security',
      'Python', 'FastAPI', 'GraphQL', 'Microsoft 365', 'Active Directory',
      'Network discovery', 'Incident response', 'Technical documentation'
    ],
    targetRoles: [
      'Manufacturing IT / OT Engineer', 'Systems Security / Infrastructure Analyst',
      'Cybersecurity / GRC Analyst', 'CMMC / NIST 800-171 Specialist',
      'IT Automation / Business Systems Analyst'
    ],
    mentorshipStatus: 'seeking'
  },
  jobs: [
    {
      id: 'palantir-fdie-new-grad', title: 'Forward Deployed Infrastructure Engineer, New Grad — US Government', department: 'Palantir',
      location: 'New York, NY', workMode: 'On-site', postedAt: '2025-10-29',
      summary: 'Career Ops target combining infrastructure, customer-facing delivery, security, and complex operational problem solving.',
      requirements: ['Infrastructure troubleshooting', 'Customer-facing technical delivery', 'U.S. Government work eligibility'],
      skills: ['Systems security', 'Network discovery', 'Technical documentation'], internalApplyUrl: 'https://jobs.lever.co/palantir/91117724-9389-48dc-912f-98e48d4d45d8'
    },
    {
      id: 'vercel-grc', title: 'GRC Analyst', department: 'Vercel',
      location: 'United States', workMode: 'Remote', postedAt: '2026-07-02',
      summary: 'A direct path from CMMC ownership, control evidence, policy authorship, and technical automation into product-company GRC.',
      requirements: ['Security compliance experience', 'Control evidence and audit support', 'Cross-functional communication'],
      skills: ['CMMC Level 2', 'NIST SP 800-171', 'Technical documentation'], internalApplyUrl: 'https://job-boards.greenhouse.io/vercel/jobs/6102654004'
    },
    {
      id: 'dolby-infosec', title: 'Information Security Engineer', department: 'Dolby',
      location: 'Atlanta, GA', workMode: 'Hybrid', postedAt: '2026-09-02',
      summary: 'Career Ops evaluated this as a security-operations and compliance-builder opportunity with some tooling and location gaps to verify.',
      requirements: ['Security operations', 'Incident response', 'Enterprise security tooling'],
      skills: ['Systems security', 'Incident response', 'Microsoft 365'], internalApplyUrl: 'https://4dayweek.io/job/information-security-engineer-at-dolby-79d9c200'
    },
    {
      id: 'stability-junior-it', title: 'Junior IT Support Engineer', department: 'Stability AI',
      location: 'United States', workMode: 'Remote', postedAt: '2026-09-01',
      summary: 'An early-career systems role aligned with your Microsoft, identity, endpoint, and practical troubleshooting experience.',
      requirements: ['End-user support', 'Identity and endpoint administration', 'Clear communication'],
      skills: ['Microsoft 365', 'Active Directory', 'Technical documentation'], internalApplyUrl: 'https://stability.ai/careers?gh_jid=4965729101'
    }
  ],
  learningPaths: [
    { id: 'learn-1', topic: 'Finish the remaining 7 WGU cybersecurity courses', provider: 'Western Governors University', url: 'https://my.wgu.edu/', completionStatus: 'in-progress', estimatedHours: 70 },
    { id: 'learn-2', topic: 'Build an OT/ICS security lab and document the evidence', provider: 'Career Ops development pathway', url: '#career-ops-learning', completionStatus: 'not-started', estimatedHours: 12 },
    { id: 'learn-3', topic: 'CMMC and NIST 800-171 applied practice', provider: 'Current professional experience', url: '#career-ops-learning', completionStatus: 'completed', estimatedHours: 44 }
  ],
  mentors: [
    { id: 'mentor-target-1', displayName: 'Manufacturing IT / OT leader', role: 'Mentor target — identity not yet researched', department: 'Syracuse or regulated manufacturing', expertise: ['OT security', 'Plant-floor systems', 'Career transitions'], availability: 'Use Career Ops contact research' },
    { id: 'mentor-target-2', displayName: 'CMMC or GRC practitioner', role: 'Mentor target — identity not yet researched', department: 'Defense industrial base', expertise: ['CMMC', 'NIST SP 800-171', 'Compliance careers'], availability: 'Use Career Ops contact research' },
    { id: 'mentor-target-3', displayName: 'Systems security engineer', role: 'Mentor target — identity not yet researched', department: 'Infrastructure security', expertise: ['Systems security', 'Incident response', 'Infrastructure careers'], availability: 'Use Career Ops contact research' }
  ]
};

export class MockCareerHubAdapter implements CareerHubAdapter {
  async getSnapshot(_employeeId: string, signal?: AbortSignal): Promise<CareerHubSnapshot> {
    await delay(120, signal);
    return structuredClone(snapshot);
  }

  async requestMentor(_mentorId: string, signal?: AbortSignal): Promise<void> {
    await delay(150, signal);
  }
}

function delay(milliseconds: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, milliseconds);
    signal?.addEventListener('abort', () => {
      window.clearTimeout(timer);
      reject(new DOMException('Request cancelled', 'AbortError'));
    }, { once: true });
  });
}
