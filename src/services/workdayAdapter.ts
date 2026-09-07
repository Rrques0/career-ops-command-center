import type { CareerHubSnapshot } from './types';
import { IntegrationClient, type IntegrationClientOptions } from './http';

export class WorkdayAdapter {
  private readonly client: IntegrationClient;
  constructor(options: IntegrationClientOptions) { this.client = new IntegrationClient(options); }

  getWorkerCareerSnapshot(employeeId: string, signal?: AbortSignal) {
    return this.client.get<CareerHubSnapshot>(`/api/integrations/workday/workers/${encodeURIComponent(employeeId)}/career`, signal);
  }
}
