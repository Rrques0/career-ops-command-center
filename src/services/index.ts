export * from './types';
export * from './mockAdapter';
export * from './workdayAdapter';
export * from './greenhouseAdapter';
export * from './iglooAdapter';

import { MockCareerHubAdapter } from './mockAdapter';
import type { CareerHubAdapter } from './types';

export function createCareerHubAdapter(): CareerHubAdapter {
  return new MockCareerHubAdapter();
}
