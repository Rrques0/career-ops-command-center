"""Atomic, incremental local snapshot reads for the Career Ops command center.

The native bridge remains the source for Career Ops parsing and ranking.  This
module only owns coherent HTTP projections: it content-addresses the small set
of files the bridge reads, reuses unchanged slices, and never publishes a
mixture of old career data and new task activity.
"""
from __future__ import annotations

import gzip
import hashlib
import json
import math
import os
import threading
import time
from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING, Any, Iterable

from .bridge import ENGINE, ROOT, Bridge, jarvis_snapshot, jarvis_state_candidates

if TYPE_CHECKING:
    from .tasks import Tasks


def _utc_now():
    return datetime.now(timezone.utc).isoformat()


def _path_label(path: Path):
    """Use a stable local label inside a digest without exposing it in a response."""
    try:
        return path.resolve().relative_to(ROOT.resolve()).as_posix()
    except (OSError, ValueError):
        return str(path)


def _file_bytes(digest, path: Path, label: str):
    digest.update(b'F\0')
    digest.update(label.encode('utf-8', 'surrogatepass'))
    digest.update(b'\0')
    try:
        with path.open('rb') as handle:
            while chunk := handle.read(131072):
                digest.update(chunk)
    except OSError as error:
        # An unreadable input is still a distinct source state.  The bridge
        # itself remains responsible for deciding whether it can parse it.
        digest.update(f'!unreadable:{type(error).__name__}'.encode())


def content_fingerprint(namespace: str, roots: Iterable[Path], extra: Iterable[str] = ()): 
    """Hash exact source content, including missing and unreadable inputs.

    Directory contents are sorted by their stable labels.  No mtime/size is
    used as a correctness signal, so editor timestamp granularity cannot turn
    an unchanged conditional request into a false cache miss.
    """
    digest = hashlib.sha256()
    digest.update(namespace.encode('utf-8'))
    digest.update(b'\0')
    for value in extra:
        digest.update(str(value).encode('utf-8', 'surrogatepass'))
        digest.update(b'\0')
    for root in sorted((Path(path) for path in roots), key=_path_label):
        label = _path_label(root)
        try:
            if root.is_file():
                _file_bytes(digest, root, label)
            elif root.is_dir():
                digest.update(b'D\0')
                digest.update(label.encode('utf-8', 'surrogatepass'))
                digest.update(b'\0')
                try:
                    files = sorted((path for path in root.rglob('*') if path.is_file()), key=_path_label)
                except OSError as error:
                    digest.update(f'!unreadable-directory:{type(error).__name__}'.encode())
                    files = []
                for path in files:
                    _file_bytes(digest, path, _path_label(path))
            else:
                digest.update(b'M\0')
                digest.update(label.encode('utf-8', 'surrogatepass'))
                digest.update(b'\0')
        except OSError as error:
            digest.update(f'!source-error:{type(error).__name__}:{label}'.encode('utf-8', 'replace'))
    return digest.hexdigest()


def career_source_paths():
    """Return only files/directories that can affect ``Bridge.snapshot``."""
    return (
        ENGINE / 'data' / 'pipeline.md',
        ENGINE / 'data' / 'applications.md',
        ENGINE / 'applications.md',  # native fallback when the data tracker is absent
        ENGINE / 'data' / 'portal-health.tsv',
        ENGINE / 'data' / 'scan-runs.tsv',
        ENGINE / 'data' / 'scholarships.md',
        ENGINE / 'cv.md',
        ENGINE / 'config' / 'profile.yml',
        ENGINE / 'reports',
        ENGINE / 'documents' / 'employer-strategies',
        ROOT / 'data' / 'operator.yml',
        ROOT / 'data' / 'case-studies.yml',
        ROOT / 'data' / 'learning-paths.yml',
        ROOT / 'data' / 'public-projects.json',
        ROOT / 'data' / 'professional-evidence.yml',
    )


@dataclass(frozen=True)
class SourceFingerprints:
    career: str
    tasks: int
    jarvis: str


@dataclass(frozen=True)
class SnapshotResult:
    """A pre-encoded HTTP result.  ``raw`` and ``gzip_raw`` are immutable bytes."""
    status: int
    etag: str = ''
    raw: bytes = b''
    gzip_raw: bytes = b''
    stale: bool = False
    state: str = 'degraded'


@dataclass(frozen=True)
class _CachedSlice:
    fingerprint: object
    value: Any


@dataclass(frozen=True)
class _SnapshotEntry:
    fingerprints: SourceFingerprints
    revision: int
    generated_at: str
    generated_monotonic: float
    fresh: SnapshotResult
    stale: SnapshotResult
    degraded: SnapshotResult


class SnapshotReadModel:
    """Small coherence seam for career, task, and Jarvis projections.

    ``read`` is safe for concurrent HTTP handlers.  Warm reads reuse encoded
    bytes; a changed source starts one background rebuild and receives the last
    complete revision with an explicit stale/degraded marker.  Explicit command
    actions call ``projection(require_fresh=True)`` so they never decide from a
    stale role list.
    """
    _SCOPES = frozenset({'career', 'tasks', 'jarvis'})
    _SAMPLE_LIMIT = 128
    _WAIT_SECONDS = 30

    def __init__(self, bridge: Bridge, tasks: 'Tasks'):
        self.bridge = bridge
        self.tasks = tasks
        self._condition = threading.Condition(threading.RLock())
        self._entry: _SnapshotEntry | None = None
        self._career: _CachedSlice | None = None
        self._tasks: _CachedSlice | None = None
        self._jarvis: _CachedSlice | None = None
        self._dirty_epoch = {scope: 0 for scope in self._SCOPES}
        self._rebuilding = False
        self._building_fingerprints: SourceFingerprints | None = None
        self._failed_fingerprints: SourceFingerprints | None = None
        self._last_error_at = ''
        self._retry_after = 0.0
        self._samples = {
            'fingerprint': deque(maxlen=self._SAMPLE_LIMIT),
            'rebuild': deque(maxlen=self._SAMPLE_LIMIT),
            'request': deque(maxlen=self._SAMPLE_LIMIT),
        }
        self._metrics = {
            'requests': 0, 'cacheHits': 0, 'conditionalHits': 0,
            'staleServes': 0, 'rebuilds': 0, 'parserRebuilds': 0,
            'rebuildFailures': 0, 'fingerprintChecks': 0,
        }

    def invalidate(self, scope='career'):
        """Mark a locally-written slice dirty without initiating a parser run."""
        if scope not in self._SCOPES:
            raise ValueError('Unknown snapshot scope')
        with self._condition:
            self._dirty_epoch[scope] += 1
            self._failed_fingerprints = None
            self._retry_after = 0.0

    def _record_sample(self, name: str, milliseconds: float):
        with self._condition:
            self._samples[name].append(round(max(milliseconds, 0.0), 3))

    @staticmethod
    def _percentiles(values):
        if not values:
            return {'p50': 0, 'p95': 0, 'p99': 0}
        ordered = sorted(values)

        def percentile(percent):
            index = max(0, math.ceil(len(ordered) * percent / 100) - 1)
            return round(ordered[index], 2)

        return {'p50': percentile(50), 'p95': percentile(95), 'p99': percentile(99)}

    def _telemetry_locked(self):
        return {
            **self._metrics,
            'fingerprintMs': self._percentiles(self._samples['fingerprint']),
            'rebuildMs': self._percentiles(self._samples['rebuild']),
            'requestMs': self._percentiles(self._samples['request']),
        }

    def _fingerprints(self):
        started = time.perf_counter()
        try:
            revisions = self.bridge.store.revisions()
            career = content_fingerprint('career', career_source_paths())
            configured = os.environ.get('CAREER_OPS_JARVIS_ROOT', '')
            jarvis = content_fingerprint('jarvis', jarvis_state_candidates(), (configured,))
            return SourceFingerprints(
                career=f'{career}:{revisions["career"]}',
                tasks=revisions['tasks'],
                jarvis=jarvis,
            )
        finally:
            elapsed = (time.perf_counter() - started) * 1000
            with self._condition:
                self._metrics['fingerprintChecks'] += 1
            self._record_sample('fingerprint', elapsed)

    def _is_current_locked(self, entry: _SnapshotEntry | None, fingerprints: SourceFingerprints):
        if not entry or entry.fingerprints != fingerprints:
            return False
        return not any(self._dirty_epoch.values())

    def _result_for_entry_locked(self, entry: _SnapshotEntry, fingerprints: SourceFingerprints):
        if self._failed_fingerprints == fingerprints:
            return entry.degraded
        return entry.stale

    def _claim_rebuild_locked(self, force=False):
        if self._rebuilding:
            return False
        if not force and time.monotonic() < self._retry_after:
            return False
        self._rebuilding = True
        return True

    def _background_rebuild(self):
        self._run_rebuild()

    def _start_background(self):
        try:
            threading.Thread(target=self._background_rebuild, name='career-ops-snapshot', daemon=True).start()
        except Exception:
            with self._condition:
                self._rebuilding = False
                self._last_error_at = _utc_now()
                self._retry_after = time.monotonic() + 1
                self._metrics['rebuildFailures'] += 1
                self._condition.notify_all()

    def _make_result(self, payload, state: str):
        raw = json.dumps(payload, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
        compressed = gzip.compress(raw, compresslevel=6)
        return SnapshotResult(
            status=200,
            etag='"' + hashlib.sha256(raw).hexdigest()[:32] + '"',
            raw=raw,
            gzip_raw=compressed,
            stale=state != 'healthy',
            state=state,
        )

    def _make_payloads_locked(self, base, revision: int, generated_at: str):
        telemetry = self._telemetry_locked()
        values = {}
        for state in ('healthy', 'stale', 'degraded'):
            payload = dict(base)
            payload['performance'] = {
                'status': state,
                'snapshotRevision': revision,
                'lastSuccessfulSnapshotAt': generated_at,
                'telemetry': telemetry,
            }
            values[state] = self._make_result(payload, state)
        return values

    def _build(self):
        """Build and publish only if a before/after source read is stable."""
        for _attempt in range(3):
            before = self._fingerprints()
            with self._condition:
                self._building_fingerprints = before
                epochs = dict(self._dirty_epoch)
                career = self._career if self._career and self._career.fingerprint == before.career and not epochs['career'] else None
                tasks = self._tasks if self._tasks and self._tasks.fingerprint == before.tasks and not epochs['tasks'] else None
                jarvis = self._jarvis if self._jarvis and self._jarvis.fingerprint == before.jarvis and not epochs['jarvis'] else None

            if career is None:
                with self._condition:
                    self._metrics['parserRebuilds'] += 1
                career = _CachedSlice(before.career, self.bridge.snapshot(include_jarvis=False))
            if tasks is None:
                tasks = _CachedSlice(before.tasks, self.tasks.list())
            if jarvis is None:
                jarvis = _CachedSlice(before.jarvis, jarvis_snapshot())

            after = self._fingerprints()
            with self._condition:
                changed_during_build = any(self._dirty_epoch[scope] != epochs[scope] for scope in self._SCOPES)
            if after != before or changed_during_build:
                continue

            generated_at = _utc_now()
            with self._condition:
                # A write may have happened immediately after the second
                # fingerprint.  In that case a new reader will start the next
                # rebuild instead of accepting this entry as current.
                if any(self._dirty_epoch[scope] != epochs[scope] for scope in self._SCOPES):
                    continue
                base = dict(career.value)
                base['generatedAt'] = generated_at
                base['tasks'] = tasks.value
                base['jarvis'] = jarvis.value
                revision = (self._entry.revision if self._entry else 0) + 1
                self._metrics['rebuilds'] += 1
                variants = self._make_payloads_locked(base, revision, generated_at)
                self._career, self._tasks, self._jarvis = career, tasks, jarvis
                self._entry = _SnapshotEntry(
                    fingerprints=before, revision=revision, generated_at=generated_at,
                    generated_monotonic=time.monotonic(), fresh=variants['healthy'],
                    stale=variants['stale'], degraded=variants['degraded'],
                )
                self._dirty_epoch = {scope: 0 for scope in self._SCOPES}
                self._failed_fingerprints = None
                self._last_error_at = ''
                self._retry_after = 0.0
                return
        raise RuntimeError('Local source files changed during snapshot rebuild')

    def _run_rebuild(self):
        started = time.perf_counter()
        try:
            self._build()
        except Exception:
            with self._condition:
                self._metrics['rebuildFailures'] += 1
                self._failed_fingerprints = self._building_fingerprints
                self._last_error_at = _utc_now()
                # Briefly avoid a tight retry loop for a malformed local file.
                self._retry_after = time.monotonic() + 1
        finally:
            self._record_sample('rebuild', (time.perf_counter() - started) * 1000)
            with self._condition:
                self._rebuilding = False
                self._building_fingerprints = None
                self._condition.notify_all()

    def _wait_for_fresh(self):
        with self._condition:
            owned = self._claim_rebuild_locked(force=True)
        if owned:
            self._run_rebuild()
            return
        deadline = time.monotonic() + self._WAIT_SECONDS
        with self._condition:
            while self._rebuilding and time.monotonic() < deadline:
                self._condition.wait(timeout=max(0.01, deadline - time.monotonic()))

    def _read(self, if_none_match='', require_fresh=False):
        try:
            fingerprints = self._fingerprints()
        except Exception:
            with self._condition:
                return SnapshotResult(status=503, state='degraded')
        with self._condition:
            entry = self._entry
            if self._is_current_locked(entry, fingerprints):
                self._metrics['cacheHits'] += 1
                if if_none_match and if_none_match == entry.fresh.etag:
                    self._metrics['conditionalHits'] += 1
                    return SnapshotResult(status=304, etag=entry.fresh.etag, state='healthy')
                return entry.fresh
            if entry and not require_fresh:
                start_background = self._claim_rebuild_locked()
                self._metrics['staleServes'] += 1
                result = self._result_for_entry_locked(entry, fingerprints)
            else:
                start_background = False
                result = None
        if result:
            if start_background:
                self._start_background()
            return result

        self._wait_for_fresh()
        try:
            fresh_fingerprints = self._fingerprints()
        except Exception:
            return SnapshotResult(status=503, state='degraded')
        with self._condition:
            entry = self._entry
            if self._is_current_locked(entry, fresh_fingerprints):
                if if_none_match and if_none_match == entry.fresh.etag:
                    self._metrics['conditionalHits'] += 1
                    return SnapshotResult(status=304, etag=entry.fresh.etag, state='healthy')
                return entry.fresh
            # Explicit actions must not make a decision from an older projection.
            if require_fresh:
                return SnapshotResult(status=503, state='degraded')
            if entry:
                self._metrics['staleServes'] += 1
                return self._result_for_entry_locked(entry, fresh_fingerprints)
            return SnapshotResult(status=503, state='degraded')

    def read(self, if_none_match='', require_fresh=False):
        started = time.perf_counter()
        with self._condition:
            self._metrics['requests'] += 1
        try:
            return self._read(if_none_match, require_fresh)
        finally:
            self._record_sample('request', (time.perf_counter() - started) * 1000)

    def projection(self, require_fresh=True):
        """Return a caller-owned mapping, never the cache's mutable structure."""
        result = self.read(require_fresh=require_fresh)
        if result.status != 200 or (require_fresh and result.stale):
            raise RuntimeError('A current local snapshot is not available')
        return json.loads(result.raw.decode('utf-8'))

    def find(self, job_id, require_fresh=True):
        projection = self.projection(require_fresh=require_fresh)
        return next((job for job in projection.get('jobs', []) if job.get('id') == job_id), None)

    def health(self):
        """Expose only aggregate, local performance state—not source contents."""
        try:
            fingerprints = self._fingerprints()
        except Exception:
            fingerprints = None
        with self._condition:
            entry = self._entry
            if not entry:
                status = 'degraded'
                start_background = self._claim_rebuild_locked()
            elif fingerprints and self._is_current_locked(entry, fingerprints):
                status = 'healthy'
                start_background = False
            elif fingerprints and self._failed_fingerprints == fingerprints:
                status = 'degraded'
                start_background = self._claim_rebuild_locked()
            else:
                status = 'stale'
                start_background = self._claim_rebuild_locked()
            age = round(max(0, (time.monotonic() - entry.generated_monotonic) * 1000)) if entry else None
            value = {
                'service': 'career-ops-command',
                'status': status,
                'snapshotRevision': entry.revision if entry else 0,
                'lastSuccessfulSnapshotAt': entry.generated_at if entry else '',
                'cacheAgeMs': age,
                'rebuilding': self._rebuilding,
                'lastErrorAt': self._last_error_at,
                'telemetry': self._telemetry_locked(),
            }
        if start_background:
            self._start_background()
        return value
