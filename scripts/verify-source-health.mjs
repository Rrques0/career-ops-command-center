// Reuse the scanner's provider registry and the native portal verifier.
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { verifyCompanies } from '../career-ops/verify-portals.mjs';
import { loadProviders } from '../career-ops/providers/_registry.mjs';
import { makeHttpCtx } from '../career-ops/providers/_http.mjs';

const require = createRequire(new URL('../career-ops/package.json', import.meta.url));
const yaml = require('js-yaml');
const portals = yaml.load(await readFile(new URL('../career-ops/portals.yml', import.meta.url), 'utf8'));
const companies = portals.tracked_companies ?? [];
const providers = await loadProviders(fileURLToPath(new URL('../career-ops/providers', import.meta.url)));
let index = 0;
async function worker() {
  while (index < companies.length) {
    const company = companies[index++];
    const start = performance.now();
    try {
      const [result] = await verifyCompanies([company], { providers, httpCtx: makeHttpCtx() });
      console.log('SOURCE_RESULT ' + JSON.stringify({ name: result.name,
        status: result.status === 'live' ? 'Live' : result.status === 'empty' ? 'Empty' : 'Needing Repair',
        detail: result.errorKind || result.reason || result.status,
        timestamp: new Date().toISOString(), latencyMs: Math.round(performance.now() - start) }));
    } catch (error) {
      console.log('SOURCE_RESULT ' + JSON.stringify({ name: company.name, status: 'Needing Repair',
        detail: String(error), timestamp: new Date().toISOString(), latencyMs: Math.round(performance.now() - start) }));
    }
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
console.log(`Verified ${companies.length} configured sources. Duration includes provider probes and retries.`);
