import type { JobPosting } from './types';
import { IntegrationClient, type IntegrationClientOptions } from './http';

export class GreenhouseAdapter {
  private readonly client: IntegrationClient;
  constructor(options: IntegrationClientOptions) { this.client = new IntegrationClient(options); }

  getInternalJobs(signal?: AbortSignal) {
    return this.client.get<JobPosting[]>('/api/integrations/greenhouse/internal-jobs', signal);
  }
}
