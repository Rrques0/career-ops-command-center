# Career Ops command center

## File structure and ownership

```text
src/
  App.tsx                       Navigation, live snapshot, workflow actions
  bootstrap.tsx                 Shadow DOM mount
  components/
    GlacialHero.tsx              Real ingestion counters and primary action
    IceScene.tsx                 Original lightweight WebGL ice sculpture
    ActionDrawer.tsx             Reports, drafts, stages, contact notes, audit
    IntelligenceViews.tsx        Sources, skills, activity, documents, guide
  services/command.ts            Typed HTTP interface and safe links
  styles.css, ice-theme.css      Isolated operational and visual styling
backend/
  server.py                     Loopback HTTP interface and static dist server
  bridge.py                     Native parser federation and tracker projection
  store.py                      SQLite persistence and append-only event log
  tasks.py                      Serialized, allowlisted background workflows
  test_bridge.py                Persistence, integration and security tests
scripts/
  launch-career-hub.ps1          Desktop startup and health check
  verify-source-health.mjs       Native source probes with measured duration
  check-bundle.mjs               200 KB compressed JS/CSS budget
tests/career-hub.spec.ts         Browser verification with isolated database
data/
  operator.yml                  User-confirmed private profile additions
  command-center.sqlite3        Local states, events, tasks and source observations
career-ops/                      Existing engine and canonical career files
```

The bridge is the module seam: React does not parse Markdown or call engine commands. It consumes one typed snapshot and narrow write operations. Legacy scaffold adapters are not imported by the production bootstrap.

## HTTP interface

| Endpoint | Responsibility |
| --- | --- |
| GET /api/health | Local service identity |
| GET /api/snapshot | Profile, jobs, reports, metrics, sources, history and task state |
| POST /api/tasks | Start an allowlisted workflow; returns task ID |
| POST /api/stage | Validate stage, persist event, project tracked status |
| POST /api/contact | Persist a user-recorded contact note and source link |
| POST /api/sync | Retry pending canonical tracker projections |

Writes use application/json and X-Career-Ops: local. Host and Origin are checked. Inputs are not interpolated into shell strings. Static file resolution is restricted to dist. The browser retains the last successful snapshot during outages and marks it stale.

## Data semantics

Profile facts come from cv.md, config/profile.yml and user-confirmed operator.yml. Source and scan counters come from engine files, never fixed example values. A source observation is timestamped evidence, not a guarantee that the source remains reachable. Probe duration includes retries; historic rows without measurements show no invented latency.

Jobs share URL-based identities across discovery and evaluation. The funnel is a count of current saved stages, not historical conversion analytics. Stage changes append immutable SQLite events; native tracked jobs also use the canonical set-status.mjs writer. Failed projections remain pending for explicit retry. SQLite triggers reject normal updates/deletes to audit events, but this is not a tamper-proof security boundary against the machine owner.

Untracked discovered-job stages live in SQLite. The web app's auto workflow respects these stages; independent legacy native queue processing may not respect web-only archived items. Native tracker writes outside this app are reflected on refresh but do not create new web audit events.

Priority percentages normalize the existing Python title/location ranker, not applicant-pool standing or verified skills-match percentages. Its heuristics can miss geography or seniority constraints. Full evaluation must check posting requirements, work authorization, location and evidence. Reports and contact notes are not independently verified merely because they are saved.

## UI specifications

- Command: ice scene, real scan counters, next actions, saved-stage funnel, top eight unevaluated opportunities.
- Applications: searchable lifecycle lanes and accessible dialog with report/draft text, status actions and contact history.
- Skills: grounded profile skills, certifications and report-derived gaps.
- Sources: timestamped source status, measured probe duration where available, verification action.
- Activity: persistent task logs, failure summaries and running state. AI usage failures remain visible.
- My documents: resume, existing reports, scholarship records and workflow access.
- Guide: plain-English guidance for the application workflow.

Animation respects reduced motion, pauses offscreen and caps rendering resolution/rate. No copied Igloo model or brand assets are used.

## Validation and limitations

Run npm run build, python -m unittest backend.test_bridge -v, and npm run test:e2e. Eight backend tests cover authentic snapshots, identity, durable/idempotent stages, audit immutability, retryable tracker writes, origin checks and task validation. Five browser tests cover module navigation, filtering, saved contacts/stages, offline recovery, phone overflow and visual capture. Browser mutations use test-results/browser-state.sqlite3 and an untracked opportunity; they do not submit applications or run paid AI evaluations.

These tests do not prove live AI evaluation succeeds, independently verify every listing, or certify enterprise production readiness. A recent real scan succeeded, but subsequent AI evaluation failed because the configured account reported a usage limit. Generated PDF workflows still depend on the native engine and its output directory. This is a local, single-user application, not a hosted intranet or government-scale service.
