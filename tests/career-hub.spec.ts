import { expect, test } from '@playwright/test';

const emptyFunnel = { Discovered: 0, Evaluated: 0, Applied: 0, 'Screen/Interview': 0, Offer: 0, Archived: 0 };

function fixtureJob(source: Record<string, unknown>, changes: Record<string, unknown>) {
  return {
    ...source,
    id: 'e2e-next-action-role', company: 'Fixture Fabrication', role: 'Systems Administrator', location: 'Syracuse, NY',
    url: 'https://example.test/jobs/fixture', stage: 'Discovered', date: '2026-09-26', updatedAt: '2026-09-26T00:00:00Z',
    notes: '', trackerNumber: '', rank: 999, tier: 'HIGH', triagePercent: 99, rationale: 'Controlled priority fixture.',
    lane: 'Systems / Infrastructure / IAM', bridgeLabel: 'Direct target', evaluationScore: 0, gaps: [], strengths: [],
    nextAction: 'Review the live posting.', report: '', draft: '', events: [], ...changes,
  };
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Archis Khanal', exact: true })).toBeVisible();
});

test('real engine telemetry, all modules, and Shadow DOM isolation', async ({ page, request }) => {
  const data = await (await request.get('/api/snapshot')).json();
  await expect(page.locator('.metric').first()).toContainText(data.scan.checked.toLocaleString());
  await expect(page.getByRole('region', { name: 'Career strategy' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Jarvis bridge' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Jarvis bridge' })).toContainText('READ-ONLY');
  await expect(page.locator('.strategy-panel .section-label').nth(1)).toContainText('PROOF BEFORE POLISH');
  await expect(page.locator('tbody tr')).toHaveCount(Math.min(8, data.funnel.Discovered));
  for (const name of ['Applications', 'Projects', 'Skills & credentials', 'Sources', 'Activity', 'My documents', 'Guide']) {
    await page.getByRole('navigation').getByRole('button', { name, exact: true }).click();
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  }
  expect(await page.evaluate(() => !!document.getElementById('career-hub-root')?.shadowRoot)).toBe(true);
});

test('portfolio index distinguishes original work, forks, and local projects', async ({ page }) => {
  await page.getByRole('navigation', { name: 'Work navigation' }).getByRole('button', { name: 'Projects', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible();
  await expect(page.getByText('career-ops-command-center', { exact: true })).toBeVisible();
  await expect(page.getByText('GitHub fork / experiment').first()).toBeVisible();
  await expect(page.getByText('BLACKLINE FABRICATION NODE', { exact: true })).toBeVisible();
});

test('application search, drawer, persistent transitions and contact notes', async ({ page, request }) => {
  const data = await (await request.get('/api/snapshot')).json();
  const job = data.jobs.find((j: { trackerNumber: string; stage: string }) => !j.trackerNumber && j.stage === 'Discovered');
  expect(job).toBeTruthy();
  await page.getByRole('navigation').getByRole('button', { name: 'Applications', exact: true }).click();
  await page.getByLabel('Search applications').fill(job.role);
  const card = page.locator('.job-card').filter({ hasText: job.company }).filter({ hasText: job.role }).first();
  await card.getByRole('button').first().click();
  const drawer = page.getByRole('dialog');
  await expect(drawer).toBeVisible();
    const pack = drawer.locator('.application-pack');
    await expect(pack).toBeVisible();
    await expect(pack.locator('.section-label')).toContainText('MINIMUM VIABLE APPLICATION PACK');
    await pack.getByText('Preview pack', { exact: true }).click();
    await expect(pack.locator('pre')).toContainText(job.company);
  await drawer.getByLabel('Application stage', { exact: true }).selectOption('Archived');
  await expect(drawer.getByLabel('Application stage', { exact: true })).toHaveValue('Archived');
  await drawer.getByLabel('Actual contact name').fill('TEST RECORD — local test database');
  await drawer.getByLabel('Conversation or referral note').fill('<script>window.bad = true</script>');
  await drawer.getByRole('button', { name: 'Save contact note' }).click();
  await expect(drawer.getByText('Contact note saved.', { exact: true })).toBeVisible();
  await page.reload();
  const fresh = await (await request.get('/api/snapshot')).json();
  const saved = fresh.jobs.find((j: { id: string }) => j.id === job.id);
  expect(saved.stage).toBe('Archived');
  expect(saved.events.some((e: { kind: string }) => e.kind === 'contact')).toBe(true);
  expect(await page.evaluate(() => Object.prototype.hasOwnProperty.call(window, 'bad'))).toBe(false);
  // Restore the fixture stage in the isolated browser-test database.
  await request.post('/api/stage', { headers: { 'X-Career-Ops': 'local' }, data: { jobId: job.id, stage: 'Discovered' } });
});

test('offline state is clear and recovers without placeholders', async ({ page }) => {
  await page.route('**/api/snapshot', route => route.fulfill({ status: 503, body: '{}' }));
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.getByRole('alert')).toContainText('engine is unavailable', { timeout: 10000 });
  await expect(page.getByRole('heading', { name: 'Archis Khanal', exact: true })).toBeVisible();
  await page.unroute('**/api/snapshot');
  await page.getByRole('button', { name: 'Retry connection' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('phone layout has no page-level horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('captures command console for visual inspection', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.screenshot({ path: 'test-results/command-center.png', fullPage: true });
});

test('LinkedIn project draft is editable and stays draft-only', async ({ page }) => {
  await page.getByRole('button', { name: 'Draft a LinkedIn project post' }).click();
  const dialog = page.getByRole('dialog', { name: 'LinkedIn draft' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('LinkedIn post draft').fill('My reviewed project draft');
  await expect(dialog.getByLabel('LinkedIn post draft')).toHaveValue('My reviewed project draft');
  await expect(dialog.getByRole('link', { name: 'Open LinkedIn' })).toHaveAttribute('href', 'https://www.linkedin.com/feed/');
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dialog).toHaveCount(0);
});

test('application prefills persist locally and preview safe macros', async ({ page }) => {
  await page.getByRole('navigation').getByRole('button', { name: 'My documents', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'My documents', exact: true })).toBeVisible();
  await page.getByLabel('First name').fill('Archis');
  await page.getByLabel('Last name').fill('Khanal');
  await page.getByText('Preview macro block').click();
  await expect(page.locator('.prefill-vault pre')).toContainText('First name: Archis');
  await page.reload();
  await expect(page.getByLabel('First name')).toHaveValue('Archis');
  await expect(page.getByLabel('Last name')).toHaveValue('Khanal');
});

test('learning roadmap keeps WGU and certification paths organized', async ({ page }) => {
  await page.getByRole('navigation').getByRole('button', { name: 'Skills & credentials', exact: true }).click();
  const board = page.getByRole('region', { name: 'Learning paths' });
  await expect(board).toBeVisible();
  for (const title of ['Finish the WGU Cybersecurity & Information Assurance program', 'OSCP preparation', 'CCNA preparation', 'RHCA preparation path', 'SSCP preparation']) {
    await expect(board.getByRole('heading', { name: title, exact: true })).toBeVisible();
  }
  const wgu = board.getByLabel('Finish the WGU Cybersecurity & Information Assurance program status');
  await wgu.selectOption('completed');
  await page.reload();
  await page.getByRole('navigation').getByRole('button', { name: 'Skills & credentials', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Learning paths' }).getByLabel('Finish the WGU Cybersecurity & Information Assurance program status')).toHaveValue('completed');
});

test('quick navigation and saved application preferences', async ({ page }) => {
  await expect(page.locator('.glacial-hero')).toBeVisible();
  await page.keyboard.press('Control+k');
  const quick = page.getByRole('dialog', { name: 'Quick navigation' });
  await expect(quick).toBeVisible();
  await quick.getByLabel('Search pages or opportunities').fill('Applications');
  await quick.getByRole('button', { name: 'Applications Open page' }).click();
  await expect(page).toHaveURL(/#Applications$/);
  await page.getByLabel('Search applications').fill('security');
  await page.getByRole('button', { name: 'Board', exact: true }).click();
  await page.reload();
  await expect(page.getByLabel('Search applications')).toHaveValue('security');
  await expect(page.getByRole('button', { name: 'Board', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Reset filters' }).click();
  await page.getByRole('button', { name: /^Ready to review/ }).click();
  await expect(page.getByLabel('Stage', { exact: true })).toHaveValue('Evaluated');
  await page.getByRole('navigation').getByRole('button', { name: 'Sources', exact: true }).click();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Applications', exact: true })).toBeVisible();
});

test('one-click queue run starts repeatable triage and lands on applications', async ({ page }) => {
  let submitted: unknown;
  await page.route('**/api/tasks', async route => {
    submitted = route.request().postDataJSON();
    await route.fulfill({ status: 202, contentType: 'application/json', body: '{"id":"queue-refresh-test"}' });
  });
  await page.getByRole('button', { name: /Run my queue/ }).first().click();
  await expect(page).toHaveURL(/#Applications$/);
  await expect(page.getByLabel('Stage', { exact: true })).toHaveValue('All');
  expect(submitted).toEqual({ kind: 'autopilot', jobId: '' });
});

test('one next action evaluates the top discovered role and keeps its pack workspace open', async ({ page, request }) => {
  const base = await (await request.get('/api/snapshot')).json();
  const job = fixtureJob(base.jobs[0], {});
  const fixture = { ...base, jobs: [job], tasks: [], funnel: { ...emptyFunnel, Discovered: 1 } };
  const writes: string[] = []; let submitted: unknown;
  page.on('request', request => { if (request.method() === 'POST') writes.push(new URL(request.url()).pathname); });
  await page.route('**/api/snapshot', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(fixture) }));
  await page.route('**/api/tasks', async route => { submitted = route.request().postDataJSON(); await route.fulfill({ status: 202, contentType: 'application/json', body: '{"id":"next-action-evaluate"}' }); });
  await page.reload();
  await page.getByRole('button', { name: 'Do next safe action' }).click();
  await expect(page).toHaveURL(/#Applications$/);
  const drawer = page.getByRole('dialog', { name: 'Systems Administrator' });
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText('Fixture Fabrication');
  expect(submitted).toEqual({ kind: 'evaluate', jobId: 'e2e-next-action-role' });
  expect(writes).toEqual(['/api/tasks']);
});

test('one next action opens the best evaluated pack without starting a task', async ({ page, request }) => {
  const base = await (await request.get('/api/snapshot')).json();
  const job = fixtureJob(base.jobs[0], { stage: 'Evaluated', report: 'Grounded evaluation fixture.', evaluationScore: 5 });
  const fixture = { ...base, jobs: [job], tasks: [], funnel: { ...emptyFunnel, Evaluated: 1 } };
  const writes: string[] = [];
  page.on('request', request => { if (request.method() === 'POST') writes.push(new URL(request.url()).pathname); });
  await page.route('**/api/snapshot', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(fixture) }));
  await page.reload();
  await page.getByRole('button', { name: 'Do next safe action' }).click();
  const drawer = page.getByRole('dialog', { name: 'Systems Administrator' });
  await expect(drawer).toBeVisible();
  await expect(drawer.locator('.application-pack')).toBeVisible();
  expect(writes).toEqual([]);
});

test('one next action runs the queue only when no role needs review', async ({ page, request }) => {
  const base = await (await request.get('/api/snapshot')).json();
  const fixture = { ...base, jobs: [], tasks: [], funnel: emptyFunnel };
  let submitted: unknown;
  await page.route('**/api/snapshot', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(fixture) }));
  await page.route('**/api/tasks', async route => { submitted = route.request().postDataJSON(); await route.fulfill({ status: 202, contentType: 'application/json', body: '{"id":"next-action-queue"}' }); });
  await page.reload();
  await page.getByRole('button', { name: 'Do next safe action' }).click();
  await expect(page).toHaveURL(/#Applications$/);
  await expect(page.getByLabel('Stage', { exact: true })).toHaveValue('All');
  expect(submitted).toEqual({ kind: 'autopilot', jobId: '' });
});

test('one next action opens a running workflow instead of starting a duplicate', async ({ page, request }) => {
  const base = await (await request.get('/api/snapshot')).json();
  const job = fixtureJob(base.jobs[0], {});
  const fixture = { ...base, jobs: [job], funnel: { ...emptyFunnel, Discovered: 1 }, tasks: [{ id: 'running-task', kind: 'evaluate', status: 'running', started: new Date().toISOString(), finished: '', log: 'Working…' }] };
  const writes: string[] = [];
  page.on('request', request => { if (request.method() === 'POST') writes.push(new URL(request.url()).pathname); });
  await page.route('**/api/snapshot', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(fixture) }));
  await page.reload();
  await page.getByRole('button', { name: 'Do next safe action' }).click();
  await expect(page).toHaveURL(/#Activity$/);
  expect(writes).toEqual([]);
});

test('one next action surfaces the latest failed workflow before retrying', async ({ page, request }) => {
  const base = await (await request.get('/api/snapshot')).json();
  const job = fixtureJob(base.jobs[0], {});
  const fixture = { ...base, jobs: [job], funnel: { ...emptyFunnel, Discovered: 1 }, tasks: [{ id: 'failed-task', kind: 'evaluate', status: 'failed', started: new Date().toISOString(), finished: new Date().toISOString(), log: 'Usage limit reached.' }] };
  const writes: string[] = [];
  page.on('request', request => { if (request.method() === 'POST') writes.push(new URL(request.url()).pathname); });
  await page.route('**/api/snapshot', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(fixture) }));
  await page.reload();
  await page.getByRole('button', { name: 'Do next safe action' }).click();
  await expect(page).toHaveURL(/#Activity$/);
  await expect(page.getByText('Usage limit reached.', { exact: true })).toBeVisible();
  expect(writes).toEqual([]);
});

test('one next action prioritizes an active application over a fresh scan', async ({ page, request }) => {
  const base = await (await request.get('/api/snapshot')).json();
  const job = fixtureJob(base.jobs[0], { stage: 'Applied', nextAction: 'Send a polite follow-up after the recorded wait window.' });
  const fixture = { ...base, jobs: [job], tasks: [], funnel: { ...emptyFunnel, Applied: 1 } };
  const writes: string[] = [];
  page.on('request', request => { if (request.method() === 'POST') writes.push(new URL(request.url()).pathname); });
  await page.route('**/api/snapshot', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(fixture) }));
  await page.reload();
  await page.getByRole('button', { name: 'Do next safe action' }).click();
  const drawer = page.getByRole('dialog', { name: 'Systems Administrator' });
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText('Send a polite follow-up after the recorded wait window.');
  expect(writes).toEqual([]);
});

test('funnel opens the matching stage and mobile list remains usable', async ({ page }) => {
  await page.locator('.funnel').getByRole('button', { name: /Evaluated/ }).click();
  await expect(page.getByLabel('Stage', { exact: true })).toHaveValue('Evaluated');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'List', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/mobile-applications.png', fullPage: true });
});
