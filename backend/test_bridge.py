import json
import sqlite3
import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.request import Request, urlopen
from urllib.error import HTTPError

from backend.bridge import Bridge, identity, native, safe_url
from backend.server import create_server
from backend.snapshot_model import SnapshotReadModel, content_fingerprint
from backend.professional_fit import professional_fit
from backend.store import Store, now
from backend.tasks import Tasks

class BridgeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.store = Store(Path(self.temp.name) / 'state.sqlite3')
        self.bridge = Bridge(self.store)

    def test_real_snapshot_has_no_demo_data_and_uses_engine_metrics(self):
        value = self.bridge.snapshot()
        self.assertEqual(value['operator']['name'], 'Archis Khanal')
        self.assertTrue(value['jobs'])
        self.assertGreater(value['scan']['checked'], 0)
        self.assertEqual(len(value['jobs']), sum(value['funnel'].values()))
        self.assertEqual(len({j['id'] for j in value['jobs']}), len(value['jobs']))
        self.assertNotIn('Jordan Lee', json.dumps(value))
        self.assertTrue(value['caseStudies'])
        self.assertEqual({path['id'] for path in value['learningPaths']}, {'wgu-cybersecurity', 'oscp-prep', 'ccna-prep', 'rhca-prep', 'sscp-prep'})
        self.assertIn('7 remaining classes', value['learningPaths'][0]['goal'])
        self.assertIn(value['jarvis']['status'], {'Live', 'Unavailable'})
        self.assertTrue(value['jarvis']['readOnly'])
        self.assertTrue(all(j.get('lane') and j.get('bridgeLabel') for j in value['jobs']))

    def test_stages_and_contacts_survive_reopening_and_audit_cannot_change(self):
        before = self.store.revisions()
        self.store.transition('test', 'Applied', 'Discovered')
        self.store.contact('test', 'Test contact', '<script>test</script>', 'https://example.com/evidence')
        reopened = Store(self.store.path)
        self.assertEqual(reopened.states()['test']['stage'], 'Applied')
        events = reopened.events('test')
        self.assertEqual(len(events), 2)
        self.assertTrue(events[0]['timestamp'])
        with self.assertRaises(sqlite3.IntegrityError):
            with reopened.connect() as db: db.execute("UPDATE events SET kind='changed'")
        with self.assertRaises(sqlite3.IntegrityError):
            with reopened.connect() as db: db.execute('DELETE FROM events')
        self.assertGreater(reopened.revisions()['career'], before['career'])

    def test_task_writes_have_a_separate_sqlite_revision(self):
        before = self.store.revisions()
        with self.store.connect() as db:
            db.execute('INSERT INTO tasks VALUES(?,?,?,?,?,?)', ('revision-test', 'scan', 'running', now(), '', ''))
        after = self.store.revisions()
        self.assertEqual(after['career'], before['career'])
        self.assertGreater(after['tasks'], before['tasks'])

    def test_snapshot_read_model_reuses_conditional_bytes_and_rebuilds_from_revisions(self):
        tasks = Tasks(self.bridge)
        model = SnapshotReadModel(self.bridge, tasks)
        first = model.read()
        self.assertEqual(first.status, 200)
        self.assertEqual(json.loads(first.raw)['performance']['status'], 'healthy')
        self.assertEqual(model.read(first.etag).status, 304)

        # This is an event-driven local write: no source-file mtime is needed
        # for the model to see that its career slice must be rebuilt.
        self.store.contact('model-revision-test', 'Recorded contact', 'Reviewed evidence', '')
        stale = model.read(first.etag)
        self.assertEqual(stale.status, 200)
        self.assertTrue(stale.stale)
        self.assertIn(stale.state, {'stale', 'degraded'})
        self.assertEqual(json.loads(stale.raw)['performance']['snapshotRevision'], 1)

        fresh = model.read(require_fresh=True)
        value = json.loads(fresh.raw)
        self.assertEqual(fresh.status, 200)
        self.assertFalse(fresh.stale)
        self.assertGreaterEqual(value['performance']['snapshotRevision'], 2)
        self.assertNotEqual(fresh.etag, first.etag)
        health = model.health()
        self.assertIn(health['status'], {'healthy', 'stale', 'degraded'})
        self.assertIn('rebuildMs', health['telemetry'])

    def test_content_fingerprint_is_content_addressed_not_timestamp_addressed(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'source.txt'
            path.write_text('same', encoding='utf-8')
            first = content_fingerprint('test', [path])
            path.touch()
            self.assertEqual(content_fingerprint('test', [path]), first)
            path.write_text('changed', encoding='utf-8')
            self.assertNotEqual(content_fingerprint('test', [path]), first)

    def test_idempotent_transition_and_rejected_stage(self):
        self.store.transition('test', 'Archived', 'Discovered')
        self.store.transition('test', 'Archived', 'Discovered')
        self.assertEqual(len(self.store.events('test')), 1)
        with self.assertRaises(ValueError): self.store.transition('test', 'invented', 'Discovered')
        with self.assertRaises(ValueError):
            self.bridge.transition({'id': 'test', 'trackerNumber': '', 'report': '', 'stage': 'Discovered'}, 'Evaluated')

    def test_native_write_failure_is_retryable_and_durable(self):
        job = {'id': 'test', 'trackerNumber': '11', 'report': 'test report', 'stage': 'Evaluated'}
        with patch('backend.bridge.subprocess.run', side_effect=OSError('test offline')):
            self.bridge.transition(job, 'Applied')
        self.assertEqual(self.store.projections()['test']['status'], 'pending')
        with patch('backend.bridge.subprocess.run') as run:
            run.return_value.returncode = 0
            self.bridge.sync()
            self.assertIn('set-status.mjs', run.call_args.args[0])
        self.assertEqual(self.store.projections()['test']['status'], 'synced')

    def test_pending_identity_matches_evaluated_identity(self):
        self.assertEqual(identity('https://example.com/job/'), identity('https://example.com/job'))

    def test_untrusted_urls_and_arbitrary_tasks_are_rejected(self):
        for url in ['javascript:alert(1)', 'file:///C:/private', 'https://user:pass@example.com']:
            self.assertEqual(safe_url(url), '')
        with self.assertRaises(ValueError): Tasks(self.bridge).launch('powershell')

    def test_organize_runs_the_free_scanner_and_prepares_a_review_queue(self):
        tasks = Tasks(self.bridge)
        with self.store.connect() as db:
            db.execute('INSERT INTO tasks VALUES(?,?,?,?,?,?)', ('unit-organize', 'organize', 'running', now(), '', ''))
        queue = {'jobs': [
            {'stage': 'Discovered', 'company': 'Northstar Fabrication', 'role': 'Systems Administrator', 'tier': 'HIGH', 'triagePercent': 91},
            {'stage': 'Evaluated', 'company': 'Example', 'role': 'Ignored', 'tier': 'GOOD', 'triagePercent': 75},
        ]}
        tasks.lock.acquire()
        with patch.object(tasks, 'command') as command, patch.object(self.bridge, 'snapshot', return_value=queue):
            tasks.run('unit-organize', 'organize', None)
        self.assertEqual(command.call_args.args[1], ['node', 'scan.mjs', '--since', '14', '--quiet'])
        with self.store.connect() as db:
            result = db.execute('SELECT status,log FROM tasks WHERE id=?', ('unit-organize',)).fetchone()
        self.assertEqual(result['status'], 'completed')
        self.assertIn('Queue refreshed. 1 top discovered roles', result['log'])
        self.assertIn('Northstar Fabrication', result['log'])

    def test_existing_ranker_prioritizes_early_career_and_does_not_claim_percentile(self):
        junior = native.assess_job({'role': 'Junior Security Analyst', 'location': 'Syracuse'})
        senior = native.assess_job({'role': 'Senior Security Manager', 'location': 'Remote'})
        self.assertGreater(junior.priority, senior.priority)
        self.assertIn('early-career', junior.reason)

    def test_professional_portfolio_is_a_grounded_coverage_signal_not_a_percentile(self):
        direct = professional_fit('CMMC NIST Compliance Analyst', 'Cybersecurity / GRC / CMMC')
        self.assertEqual(direct['band'], 'direct')
        self.assertEqual(direct['score'], 100)
        self.assertIn('cmmc-readiness', direct['proofPoints'])
        self.assertNotIn('percentile', direct['rationale'].lower())
        cloud = professional_fit('Cloud Security Engineer', 'Systems / Infrastructure / IAM')
        self.assertLess(cloud['score'], 100)
        self.assertIn('cloud/platform', cloud['rationale'])

    def test_http_requires_same_origin_and_custom_header(self):
        server = create_server(0, Path(self.temp.name) / 'http.sqlite3')
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)
        url = f'http://127.0.0.1:{server.server_port}'
        for headers in ({'Origin': 'https://attacker.example', 'X-Career-Ops': 'local'}, {}):
            req = Request(url + '/api/tasks', b'{"kind":"scan"}', headers=headers | {'Content-Type': 'application/json'})
            with self.assertRaises(HTTPError) as error: urlopen(req)
            self.assertEqual(error.exception.code, 403)
        with urlopen(url + '/api/health') as response:
            self.assertEqual(json.load(response)['service'], 'career-ops-command')
        with urlopen(Request(url + '/api/health', headers={'Accept-Encoding': 'gzip'})) as response:
            self.assertEqual(response.headers.get('Content-Encoding'), 'gzip')
        with urlopen(url + '/api/snapshot') as response:
            etag = response.headers.get('ETag')
            self.assertTrue(etag)
        with self.assertRaises(HTTPError) as error:
            urlopen(Request(url + '/api/snapshot', headers={'If-None-Match': etag}))
        self.assertEqual(error.exception.code, 304)
        with self.assertRaises(HTTPError) as error: urlopen(url + '/api/../data/operator.yml')
        self.assertEqual(error.exception.code, 404)

if __name__ == '__main__':
    unittest.main()
