"""Federate the existing native GUI parsers and intelligence engine without launching Tk."""
import csv
import hashlib
import importlib.util
import re
import sys
import subprocess
import os
import threading
from dataclasses import asdict
from importlib.machinery import SourceFileLoader
from pathlib import Path
import yaml
from .store import Store, STAGES, now

ROOT = Path(__file__).resolve().parents[1]
ENGINE = ROOT / 'career-ops'
sys.path.insert(0, str(ENGINE))
loader = SourceFileLoader('career_native_bridge', str(ENGINE / 'career_ops_gui.pyw'))
spec = importlib.util.spec_from_loader(loader.name, loader)
native = importlib.util.module_from_spec(spec)
sys.modules[loader.name] = native
loader.exec_module(native)

def read(path):
    return path.read_text(encoding='utf-8-sig', errors='replace') if path.is_file() else ''

def rows(path):
    return list(csv.DictReader(read(path).splitlines(), delimiter='\t'))

def safe_url(value):
    from urllib.parse import urlparse
    try:
        p = urlparse(value)
        return value if p.scheme in ('https', 'http') and p.hostname and not p.username else ''
    except ValueError:
        return ''

def section(text, heading):
    match = re.search(r'^## ' + re.escape(heading) + r'\s*\n(.*?)(?=^## |\Z)', text, re.M | re.S)
    return match[1].strip() if match else ''

def identity(url):
    return 'url-' + hashlib.sha256(url.rstrip('/').encode()).hexdigest()[:20]

def report_path(ref):
    candidate = ((ENGINE / 'data' / ref) if ref.startswith('..') else ENGINE / ref).resolve()
    return candidate if candidate.is_relative_to((ENGINE / 'reports').resolve()) else None

class Bridge:
    def __init__(self, store):
        self.store = store
        self.sync_lock = threading.Lock()
    def snapshot(self):
        pending = native.parse_pipeline()
        applications = native.parse_applications()
        intel = native.build_snapshot(ENGINE, pending, applications)
        states = self.store.states()
        jobs, urls = [], set()
        for app in applications:
            path = report_path(app.report)
            report = read(path) if path else ''
            match = re.search(r'^\*\*URL:\*\*\s*(\S+)', report, re.M)
            url = safe_url(match[1]) if match else ''
            if url: urls.add(url.rstrip('/'))
            machine = re.search(r'```yaml\s*\n(.*?)```', report, re.S)
            try: details = yaml.safe_load(machine[1]) if machine else {}
            except yaml.YAMLError: details = {}
            details = details if isinstance(details, dict) else {}
            status = app.status.lower()
            stage = ('Archived' if status in ('rejected', 'discarded', 'skip', 'hired', 'withdrawn', 'archived') else
                     'Screen/Interview' if status in ('responded', 'interview', 'screen') else
                     'Applied' if status == 'applied' else 'Offer' if status == 'offer' else 'Evaluated')
            jobs.append(self.job(identity(url) if url else 'app-' + app.number, app.company, app.role, '', url, stage,
                                 app.date, app.notes, app.number, report, details))
        for job in pending:
            url = safe_url(job.url)
            if not url or url.rstrip('/') in urls: continue
            urls.add(url.rstrip('/'))
            job_id = identity(url)
            jobs.append(self.job(job_id, job.company, job.role, job.location, url,
                                 'Discovered', job.posted, '', '', '', {}))
        projections = self.store.projections()
        for job in jobs:
            saved = states.get(job['id'])
            if saved:
                # Completed writes defer to the native tracker so native GUI changes stay visible.
                projection = projections.get(job['id'], {})
                if not job['trackerNumber'] or projection.get('status') == 'pending':
                    job['stage'] = saved['stage']
                job['updatedAt'] = saved['updated']
        profile = yaml.safe_load(read(ENGINE / 'config/profile.yml')) or {}
        cv = read(ENGINE / 'cv.md')
        confirmed = yaml.safe_load(read(ROOT / 'data/operator.yml')) or {}
        jobs.sort(key=lambda j: j['rank'], reverse=True)
        health = rows(ENGINE / 'data/portal-health.tsv')
        latest = {}
        for row in sorted(health, key=lambda r: r.get('timestamp', '')):
            latest[row.get('company', '')] = row
        sources = [{'company': r.get('company', ''), 'status':
                    'Live' if r.get('status') == 'reachable' else 'Empty' if r.get('status') == 'empty' else 'Needing Repair',
                    'detail': r.get('status', ''), 'timestamp': r.get('timestamp', ''),
                    'latencyMs': None} for r in latest.values()]
        source_map = {r['company']: r for r in sources}
        for row in self.store.sources():
            if row['timestamp'] >= source_map.get(row['company'], {}).get('timestamp', ''):
                source_map[row['company']] = {'company': row['company'], 'status': row['status'],
                    'detail': row['detail'], 'timestamp': row['timestamp'], 'latencyMs': row['latency']}
        sources = sorted(source_map.values(), key=lambda r: (r['status'] == 'Live', r['company']))
        history = rows(ENGINE / 'data/scan-runs.tsv')[-12:]
        return {'generatedAt': now(), 'operator': {'name': profile.get('candidate', {}).get('full_name', 'Profile unavailable'),
            'headline': confirmed.get('headline', profile.get('narrative', {}).get('headline', '')),
            'location': profile.get('candidate', {}).get('location', ''),
            'linkedin': safe_url('https://' + str(profile.get('candidate', {}).get('linkedin', '')).removeprefix('https://').removeprefix('http://')),
            'targets': profile.get('target_roles', {}).get('primary', []),
            'education': profile.get('education_context', {}),
            'skills': section(cv, 'Core Skills'), 'certifications': section(cv, 'Certifications'),
            'confirmedStack': confirmed.get('stack', []), 'provenance': confirmed.get('source', ''),
            'resume': cv}, 'jobs': jobs, 'sources': sources,
            'scan': asdict(intel.latest_scan), 'scanHistory': history,
            'funnel': {stage: sum(j['stage'] == stage for j in jobs) for stage in STAGES},
            'syncPending': [p for p in projections.values() if p['status'] == 'pending'],
            'scholarships': read(ENGINE / 'data/scholarships.md'),
            'projects': (yaml.safe_load(read(ROOT / 'data/public-projects.json')) or {}).get('projects', []),
            'githubProfile': (yaml.safe_load(read(ROOT / 'data/public-projects.json')) or {}).get('githubProfile', '')}
    def job(self, job_id, company, role, location, url, stage, date, notes, number, report, details):
        assessment = native.assess_job({'role': role, 'location': location})
        strategies = []
        if number:
            strategies = list((ENGINE / 'documents/employer-strategies').glob(f'{int(number):03d}-*.md')) if number.isdigit() else []
        return {'id': job_id, 'company': company, 'role': role, 'location': location or 'See posting',
            'url': url, 'stage': stage, 'date': date, 'updatedAt': '', 'notes': notes,
            'trackerNumber': number, 'rank': assessment.priority, 'tier': assessment.tier,
            'triagePercent': max(0, min(100, round((assessment.priority + 5) / 18 * 100))),
            'rationale': assessment.reason, 'evaluationScore': details.get('score') if isinstance(details.get('score'), (int, float)) else None,
            'gaps': [str(g) for g in details.get('soft_gaps', [])] if isinstance(details.get('soft_gaps'), list) else [],
            'strengths': [str(g) for g in details.get('top_strengths', [])] if isinstance(details.get('top_strengths'), list) else [],
            'nextAction': details.get('next_action', ''), 'report': report,
            'draft': '\n\n'.join(read(p) for p in strategies), 'events': self.store.events(job_id)}
    def find(self, job_id):
        return next((j for j in self.snapshot()['jobs'] if j['id'] == job_id), None)
    def transition(self, job, stage):
        if stage == 'Discovered' and job['trackerNumber']:
            raise ValueError('This role has entered the native tracker. Use Evaluated to return it to review.')
        if stage == 'Evaluated' and not job['report']:
            raise ValueError('Run Evaluate first to create the evaluation report.')
        self.store.transition(job['id'], stage, job['stage'], job['trackerNumber'])
        self.sync()
    def sync(self):
        if not self.sync_lock.acquire(blocking=False): return
        try:
            for job_id, p in self.store.projections().items():
                if p['status'] != 'pending': continue
                state = {'Screen/Interview': 'Interview', 'Archived': 'Discarded'}.get(p['stage'], p['stage'])
                try:
                    result = subprocess.run(['node', 'set-status.mjs', '--row', p['tracker'], state, '--source', 'web', '--json'],
                        cwd=ENGINE, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=30,
                        creationflags=0x08000000 if os.name == 'nt' else 0)
                    if result.returncode: raise ValueError('Native tracker rejected the update; retry synchronization or inspect the tracker.')
                    with self.store.connect() as db:
                        db.execute("UPDATE projections SET status='synced',error='' WHERE id=? AND stage=?", (job_id, p['stage']))
                except Exception as error:
                    with self.store.connect() as db:
                        db.execute('UPDATE projections SET error=? WHERE id=?', (str(error), job_id))
        finally:
            self.sync_lock.release()
