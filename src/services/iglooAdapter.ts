import type { EmployeeProfile, LearningPath } from './types';
import { IntegrationClient, type IntegrationClientOptions } from './http';

export class IglooAdapter {
  private readonly client: IntegrationClient;
  constructor(options: IntegrationClientOptions) { this.client = new IntegrationClient(options); }

  getEmployeeProfile(employeeId: string, signal?: AbortSignal) {
    return this.client.get<EmployeeProfile>(`/api/integrations/igloo/profiles/${encodeURIComponent(employeeId)}`, signal);
  }

  getLearningPaths(employeeId: string, signal?: AbortSignal) {
    return this.client.get<LearningPath[]>(`/api/integrations/igloo/profiles/${encodeURIComponent(employeeId)}/learning`, signal);
  }
}
