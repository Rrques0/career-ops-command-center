"""Transactional local state. Events are append-only through SQLite triggers."""
import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

STAGES = ['Discovered', 'Evaluated', 'Applied', 'Screen/Interview', 'Offer', 'Archived']

def now():
    return datetime.now(timezone.utc).isoformat()

class Store:
    def __init__(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        self.path = path
        with self.connect() as db:
            db.executescript('''
            CREATE TABLE IF NOT EXISTS states (id TEXT PRIMARY KEY, stage TEXT, updated TEXT);
            CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY, job_id TEXT, kind TEXT, payload TEXT, timestamp TEXT);
            CREATE TRIGGER IF NOT EXISTS no_event_update BEFORE UPDATE ON events BEGIN SELECT RAISE(ABORT, 'Append-only audit'); END;
            CREATE TRIGGER IF NOT EXISTS no_event_delete BEFORE DELETE ON events BEGIN SELECT RAISE(ABORT, 'Append-only audit'); END;
            CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, kind TEXT, status TEXT, started TEXT, finished TEXT, log TEXT);
            CREATE TABLE IF NOT EXISTS projections (id TEXT PRIMARY KEY, tracker TEXT, stage TEXT, status TEXT, error TEXT);
            CREATE TABLE IF NOT EXISTS sources (company TEXT PRIMARY KEY, status TEXT, detail TEXT, timestamp TEXT, latency REAL);
            ''')
    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=15)
        db.row_factory = sqlite3.Row
        try:
            with db:
                yield db
        finally:
            db.close()
    def states(self):
        with self.connect() as db:
            return {r['id']: dict(r) for r in db.execute('SELECT * FROM states')}
    def transition(self, job_id, stage, previous, tracker=''):
        if stage not in STAGES:
            raise ValueError('Invalid application stage')
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            row = db.execute('SELECT stage FROM states WHERE id=?', (job_id,)).fetchone()
            previous = row['stage'] if row and not tracker else previous
            if previous == stage:
                return
            stamp = now()
            db.execute('INSERT OR REPLACE INTO states VALUES(?,?,?)', (job_id, stage, stamp))
            db.execute('INSERT INTO events(job_id,kind,payload,timestamp) VALUES(?,?,?,?)',
                       (job_id, 'stage', json.dumps({'from': previous, 'to': stage}), stamp))
            if tracker:
                db.execute('INSERT OR REPLACE INTO projections VALUES(?,?,?,?,?)', (job_id, tracker, stage, 'pending', ''))
    def projections(self):
        with self.connect() as db:
            return {r['id']: dict(r) for r in db.execute('SELECT * FROM projections')}
    def source(self, result):
        with self.connect() as db:
            db.execute('INSERT OR REPLACE INTO sources VALUES(?,?,?,?,?)',
                       (result['name'], result['status'], result.get('detail', ''), result['timestamp'], result['latencyMs']))
    def sources(self):
        with self.connect() as db:
            return [dict(r) for r in db.execute('SELECT * FROM sources')]
    def contact(self, job_id, name, note, evidence):
        if not name.strip() or not note.strip():
            raise ValueError('A contact name and note are required')
        with self.connect() as db:
            db.execute('INSERT INTO events(job_id,kind,payload,timestamp) VALUES(?,?,?,?)',
                       (job_id, 'contact', json.dumps({'name': name, 'note': note, 'evidence': evidence,
                         'verification': 'User-recorded evidence; not independently verified'}), now()))
    def events(self, job_id):
        with self.connect() as db:
            return [dict(r) | {'payload': json.loads(r['payload'])} for r in db.execute(
                'SELECT * FROM events WHERE job_id=? ORDER BY id DESC', (job_id,))]
