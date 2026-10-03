"""Single-worker, persisted task runner. Only explicit, allowlisted commands run."""
import json
import os
import shutil
import subprocess
import threading
import uuid
import re
from .bridge import ENGINE, native
from .store import now

class Tasks:
    def __init__(self, bridge, read_model=None):
        self.bridge = bridge
        self.store = bridge.store
        self.read_model = read_model
        self.lock = threading.Lock()
        with self.store.connect() as db:
            db.execute("UPDATE tasks SET status='interrupted',finished=? WHERE status='running'", (now(),))
    def set_read_model(self, read_model):
        """Attach the HTTP read model after its task slice is constructible."""
        self.read_model = read_model
    def _invalidate(self, scope):
        if self.read_model:
            self.read_model.invalidate(scope)
    def projection(self, require_fresh=True):
        return self.read_model.projection(require_fresh=require_fresh) if self.read_model else self.bridge.snapshot()
    def find(self, job_id, require_fresh=True):
        if self.read_model:
            return self.read_model.find(job_id, require_fresh=require_fresh)
        return self.bridge.find(job_id)
    def list(self):
        with self.store.connect() as db:
            tasks = [dict(r) for r in db.execute('SELECT * FROM tasks ORDER BY started DESC LIMIT 12')]
        for task in tasks:
            task['summary'] = ('AI usage limit reached. Scan results are saved. Retry evaluation when your account has usage available.'
                               if task['status'] == 'failed' and 'usage limit' in task['log'].lower() else '')
        return tasks
    def launch(self, kind, job_id=''):
        if kind not in {'scan', 'organize', 'autopilot', 'evaluate', 'strategy', 'sources', 'followups', 'upskill', 'pdf', 'email', 'interview_plan', 'scholarship_find'}:
            raise ValueError('Unsupported task')
        job = self.find(job_id) if job_id else None
        if kind in {'evaluate', 'strategy'} and not job:
            raise ValueError('Choose an existing opportunity')
        if not self.lock.acquire(blocking=False):
            raise ValueError('A workflow is already running. See Activity for progress.')
        task_id = uuid.uuid4().hex
        with self.store.connect() as db:
            db.execute('INSERT INTO tasks VALUES(?,?,?,?,?,?)', (task_id, kind, 'running', now(), '', 'Starting workflow…\n'))
        self._invalidate('tasks')
        threading.Thread(target=self.run, args=(task_id, kind, job), daemon=True).start()
        return task_id
    def append(self, task_id, line):
        line = re.sub(r'(?i)(authorization:\s*bearer\s+|(?:api[_-]?key|access_token|refresh_token|client_secret)\s*[=:]\s*)[^\s,\"]+', r'\1[REDACTED]', line)
        with self.store.connect() as db:
            db.execute("UPDATE tasks SET log=substr(log || ?, -60000) WHERE id=?", (line, task_id))
        self._invalidate('tasks')
    def command(self, task_id, command):
        command = native.prepare_command(command)
        executable = shutil.which(command[0])
        if not executable:
            raise RuntimeError(f'Required executable not found: {command[0]}')
        command[0] = executable
        process = subprocess.Popen(command, cwd=ENGINE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, encoding='utf-8', errors='replace', shell=False,
            creationflags=0x08000000 if os.name == 'nt' else 0)
        def timeout():
            if process.poll() is None:
                self.append(task_id, '\nWorkflow exceeded 20 minutes and was stopped.\n')
                process.kill()
        timer = threading.Timer(1200, timeout)
        timer.start()
        try:
            for line in process.stdout:
                if line.startswith('SOURCE_RESULT '):
                    try: self.store.source(json.loads(line.removeprefix('SOURCE_RESULT ')))
                    except (ValueError, KeyError): pass
                    else: self._invalidate('career')
                self.append(task_id, line)
            if process.wait():
                raise RuntimeError(f'Workflow exited with code {process.returncode}; inspect output above')
        finally:
            timer.cancel()
    def agent(self, task_id, prompt):
        self.command(task_id, ['codex', 'exec', '--ignore-user-config', '--sandbox', 'workspace-write', prompt])
    def run(self, task_id, kind, job):
        status = 'completed'
        try:
            if kind in {'scan', 'organize', 'autopilot'}:
                self.command(task_id, ['node', 'scan.mjs', '--since', '14', '--quiet'])
            if kind == 'organize':
                queue = [j for j in self.projection()['jobs'] if j['stage'] == 'Discovered'][:5]
                if queue:
                    preview = '\n'.join(f"  {index}. {job['company']} — {job['role']} ({job['tier']}, {job['triagePercent']}% priority)"
                                        for index, job in enumerate(queue, 1))
                    self.append(task_id, f'\nQueue refreshed. {len(queue)} top discovered roles are ready for review:\n{preview}\n')
                else:
                    self.append(task_id, '\nQueue refreshed. No discovered roles are waiting for review.\n')
            if kind in {'autopilot', 'evaluate'}:
                if job:
                    targets = [native.QueuedJob(job['url'], job['company'], job['role'], job['location'])]
                else:
                    targets = [native.QueuedJob(j['url'], j['company'], j['role'], j['location'])
                               for j in self.projection()['jobs'] if j['stage'] == 'Discovered'][:8]
                if targets:
                    self.agent(task_id, native.build_autopilot_prompt(targets, max_evaluations=1 if job else 3))
                else: self.append(task_id, 'No unevaluated opportunities remain.\n')
            elif kind == 'strategy':
                prompt = native.build_mode_prompt('contacto', json.dumps({'company': job['company'], 'role': job['role'], 'url': job['url']}))
                self.agent(task_id, prompt + '\nSave a draft-only employer strategy under documents/employer-strategies. ' + native.EMPLOYER_STRATEGY_INSTRUCTIONS)
            elif kind in {'sources', 'followups', 'upskill'}:
                command = {'sources': ['node', '../scripts/verify-source-health.mjs'], 'followups': ['node', 'followup-cadence.mjs', '--summary'], 'upskill': ['node', 'upskill.mjs']}[kind]
                self.command(task_id, command)
            elif kind in {'pdf', 'email', 'interview_plan', 'scholarship_find'}:
                context = json.dumps(job)[:2000] if job else ''
                prepared = native.prepare_workflow(kind, context)
                if prepared.action != 'agent': raise ValueError('Workflow requires the native application')
                self.agent(task_id, str(prepared.payload))
        except Exception as error:
            status = 'failed'
            self.append(task_id, '\n' + str(error) + '\n')
        finally:
            with self.store.connect() as db:
                db.execute('UPDATE tasks SET status=?,finished=? WHERE id=?', (status, now(), task_id))
            self._invalidate('tasks')
            self.lock.release()
