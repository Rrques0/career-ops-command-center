# Snapshot Read Model

## Outcome

The Career Ops command center should feel immediate without presenting a mixture
of old pipeline records, new task progress, or invented performance claims. This
module makes one complete, locally verified snapshot available to the React
console while retaining the native Career Ops engine, tracker, and user files as
the source of truth.

## User-facing contract

- Every successful `/api/snapshot` response represents one immutable
  `snapshotRevision`.
- An unchanged conditional request returns `304 Not Modified` without invoking
  the native parser or serializing the full payload again.
- When a known-good snapshot is being rebuilt, the previous complete revision is
  served with a plainly labelled `stale` state rather than blocking the console.
- A failed rebuild never replaces known-good local records with placeholders. A
  cold-start failure returns a generic `503`; details stay in local diagnostics.
- `/api/health` reports `healthy`, `stale`, or `degraded`, the last successful
  revision/time, cache age, and bounded aggregate timing telemetry.

## Module and seam

`backend.snapshot_model.SnapshotReadModel` sits at the HTTP read seam. Its small
interface is intentionally the only place callers need to understand cache
coherence:

```text
read(if_none_match='', require_fresh=False) -> SnapshotResult
projection(require_fresh=True) -> mapping
find(job_id, require_fresh=True) -> mapping | None
invalidate(scope='career' | 'tasks' | 'jarvis') -> None
health() -> mapping
```

The implementation owns source fingerprinting, component reuse, single-flight
rebuilds, stale-while-revalidate, response encoding, and timing samples. The
server only writes a `SnapshotResult`; `Tasks` asks for a consistent projection;
the native bridge remains responsible for parsing and ranking Career Ops data.

## Dependency map

```text
Career Ops pipeline / tracker / reports / drafts / CV / profile ─┐
Root operator, project, study, and case-study records            ├─ career slice
Career Ops local state, events, sources, projections             ┘

SQLite task table ────────────────────────────────────────────────── tasks slice
Approved Fresh JArvis / Super War Room state.json ─────────────────── jarvis slice
                                      ↓
                         atomic immutable response revision
```

External source files use deterministic content hashes. Local SQLite writes use
revision triggers, so stage/contact/source writes and task lifecycle updates are
event-driven rather than waiting for a filesystem timestamp. The existing
15-second browser refresh remains a safety net for native tools or manual edits
outside the command center.

## Composition rules

The native bridge produces the cached `career` projection without reading Jarvis.
Task activity and the read-only Jarvis projection are independently cached, then
composed into one serialized response. A rebuild checks its source fingerprints
before and after parsing; it publishes only a stable set of inputs. Concurrent
requests share one rebuild. Cached raw and gzip JSON bytes are reused on warm
responses.

## Measurement and budgets

The runtime keeps bounded samples for fingerprint, rebuild, and request paths;
health reports p50/p95/p99 plus cache hits, stale serves, and parser rebuilds.
`python -m backend.benchmark_snapshot --check` is the repeatable local budget
gate: it checks warm conditional reads against a conservative hardware-neutral
threshold and emits aggregate data only. `--record` appends an aggregate run to
the local performance history; it never records a resume, job, report, or token.

## Non-goals and integrity

- No application, message, contact, or canonical-stage change is automated.
- A rule-based priority remains a Career Ops triage signal, not a response
  likelihood, candidate percentile, or market-value claim.
- "Human actions saved" and estimated time saved are not displayed until the
  system has explicit, user-recorded evidence to support them.
- No new watcher, cloud connection, credential store, or third-party dependency
  is introduced.
