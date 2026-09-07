export type CompletionStatus = 'not-started' | 'in-progress' | 'completed';
export type MentorshipStatus = 'seeking' | 'available' | 'matched' | 'not-participating';
export type WorkMode = 'On-site' | 'Hybrid' | 'Remote';

export interface JobPosting {
  id: string;
  title: string;
  department: string;
  location: string;
  workMode: WorkMode;
  summary: string;
  requirements: string[];
  skills: string[];
  internalApplyUrl: string;
  postedAt: string;
}

export interface EmployeeProfile {
  id: string;
  displayName: string;
  currentDepartment: string;
  role: string;
  skills: string[];
  targetRoles: string[];
  mentorshipStatus: MentorshipStatus;
}

export interface LearningPath {
  id: string;
  topic: string;
  provider: string;
  url: string;
  completionStatus: CompletionStatus;
  estimatedHours: number;
}

export interface MentorProfile {
  id: string;
  displayName: string;
  role: string;
  department: string;
  expertise: string[];
  availability: string;
}

export interface CareerHubSnapshot {
  employee: EmployeeProfile;
  jobs: JobPosting[];
  learningPaths: LearningPath[];
  mentors: MentorProfile[];
}

export interface CareerHubAdapter {
  getSnapshot(employeeId: string, signal?: AbortSignal): Promise<CareerHubSnapshot>;
  requestMentor(mentorId: string, signal?: AbortSignal): Promise<void>;
}
