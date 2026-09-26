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
        self.assertTrue(all(j.get('lane') and j.get('bridgeLabel') for j in value['jobs']))

    def test_stages_and_contacts_survive_reopening_and_audit_cannot_change(self):
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
        with self.assertRaises(HTTPError) as error: urlopen(url + '/api/../data/operator.yml')
        self.assertEqual(error.exception.code, 404)

if __name__ == '__main__':
    unittest.main()
