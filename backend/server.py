"""Loopback-only command center. Same-origin writes; no arbitrary files or commands."""
import argparse
import gzip
import json
import mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse
from .bridge import Bridge, ROOT, safe_url
from .snapshot_model import SnapshotReadModel
from .store import Store
from .tasks import Tasks

class Handler(BaseHTTPRequestHandler):
    def reply(self, data, status=200, headers=None):
        raw = json.dumps(data, ensure_ascii=False).encode()
        return self.reply_bytes(raw, gzip.compress(raw, compresslevel=6), status, headers)
    def reply_bytes(self, raw, gzip_raw, status=200, headers=None):
        compressed = 'gzip' in self.headers.get('Accept-Encoding', '').lower()
        payload = gzip_raw if compressed else raw
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Vary', 'Accept-Encoding')
        self.send_header('Content-Length', str(len(payload)))
        if compressed: self.send_header('Content-Encoding', 'gzip')
        for key, value in (headers or {}).items(): self.send_header(key, value)
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(payload)
    def not_modified(self, etag):
        self.send_response(304)
        self.send_header('ETag', etag)
        self.send_header('Cache-Control', 'no-cache')
        self.end_headers()
    def trusted(self):
        if self.headers.get('Host') not in self.server.allowed_hosts: return False
        origin = self.headers.get('Origin')
        return not origin or origin in self.server.allowed_origins
    def do_GET(self):
        if not self.trusted(): return self.reply({'error': 'Untrusted origin'}, 403)
        request_url = urlparse(self.path)
        path = request_url.path
        try:
            if path == '/api/health': return self.reply(self.server.snapshot_model.health())
            if path == '/api/snapshot':
                require_fresh = parse_qs(request_url.query).get('fresh', [''])[0] == '1'
                result = self.server.snapshot_model.read(self.headers.get('If-None-Match', ''), require_fresh=require_fresh)
                if result.status == 304: return self.not_modified(result.etag)
                if result.status != 200:
                    return self.reply({'error': 'Local data is temporarily unavailable; retry after the source update completes.'}, 503)
                return self.reply_bytes(result.raw, result.gzip_raw, headers={
                    'ETag': result.etag,
                    'X-Career-Ops-Snapshot-State': result.state,
                })
            if path.startswith('/api/'): return self.reply({'error': 'Unknown endpoint'}, 404)
            root = (ROOT / 'dist').resolve()
            file = (root / path.lstrip('/')).resolve() if path != '/' else root / 'index.html'
            if not file.is_relative_to(root) or not file.is_file():
                return self.reply({'error': 'Build the web app with npm run build first'}, 404)
            content = file.read_bytes()
            self.send_response(200)
            self.send_header('Content-Type', mimetypes.guess_type(file.name)[0] or 'application/octet-stream')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'")
            self.end_headers()
            self.wfile.write(content)
        except (BrokenPipeError, ConnectionAbortedError, ConnectionResetError):
            return
        except Exception:
            self.reply({'error': 'Local data could not be read; inspect source files and retry.'}, 500)
    def do_POST(self):
        if not self.trusted() or self.headers.get('X-Career-Ops') != 'local' or self.headers.get('Content-Type') != 'application/json':
            return self.reply({'error': 'Same-origin JSON requests only'}, 403)
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= 16000: raise ValueError('Invalid request size')
            body = json.loads(self.rfile.read(size))
            if not isinstance(body, dict): raise ValueError('Invalid request')
            path = urlparse(self.path).path
            if path == '/api/tasks':
                return self.reply({'id': self.server.tasks.launch(str(body.get('kind', '')), str(body.get('jobId', '')))}, 202)
            if path == '/api/sync':
                self.server.bridge.sync()
                self.server.snapshot_model.invalidate('career')
                return self.reply({'ok': True})
            job = self.server.snapshot_model.find(str(body.get('jobId', '')), require_fresh=True)
            if not job: raise ValueError('Opportunity no longer exists; refresh the page')
            if path == '/api/stage':
                self.server.bridge.transition(job, str(body.get('stage', '')))
                self.server.snapshot_model.invalidate('career')
            elif path == '/api/contact':
                evidence = str(body.get('evidence', ''))
                if evidence and not safe_url(evidence): raise ValueError('Evidence must be an HTTP or HTTPS URL')
                self.server.bridge.store.contact(job['id'], str(body.get('name', ''))[:200], str(body.get('note', ''))[:4000], evidence[:2000])
                self.server.snapshot_model.invalidate('career')
            else: return self.reply({'error': 'Unknown endpoint'}, 404)
            self.reply({'ok': True})
        except (ValueError, TypeError) as error:
            self.reply({'error': str(error)}, 400)
        except RuntimeError:
            self.reply({'error': 'A current local snapshot is unavailable; retry after the source update completes.'}, 503)
        except Exception:
            self.reply({'error': 'Unable to save; no success was recorded. Retry or inspect local storage.'}, 500)

def create_server(port=4317, db=None):
    server = ThreadingHTTPServer(('127.0.0.1', port), Handler)
    actual = server.server_port
    server.allowed_hosts = {f'127.0.0.1:{actual}', f'localhost:{actual}', '127.0.0.1:4173', 'localhost:4173'}
    server.allowed_origins = {'http://' + host for host in server.allowed_hosts}
    server.store = Store(db or ROOT / 'data/command-center.sqlite3')
    server.bridge = Bridge(server.store)
    server.tasks = Tasks(server.bridge)
    server.snapshot_model = SnapshotReadModel(server.bridge, server.tasks)
    server.read_model = server.snapshot_model
    server.tasks.set_read_model(server.snapshot_model)
    return server

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=4317)
    parser.add_argument('--db', type=str)
    args = parser.parse_args()
    from pathlib import Path
    create_server(args.port, Path(args.db) if args.db else None).serve_forever()
