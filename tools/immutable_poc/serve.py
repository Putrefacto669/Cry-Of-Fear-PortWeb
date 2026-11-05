"""Loopback-only immutable fixture, with reversible faults; never use in production."""
import argparse
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
import json
import mimetypes
from pathlib import Path
import socket
import threading
import time
from urllib.parse import unquote, urlsplit

parser = argparse.ArgumentParser()
parser.add_argument('root', type=Path)
parser.add_argument('log', type=Path)
parser.add_argument('--port', type=int, default=8134)
args = parser.parse_args()
root = args.root.resolve()
assert root.is_dir() and not args.log.exists(), 'Use a new log and a prepared private tree'
args.log.parent.mkdir(parents=True, exist_ok=True)
faults, lock = {}, threading.Lock()


def record(row):
    with lock:
        with args.log.open('a') as f:
            f.write(json.dumps({'time': time.time(), **row}) + '\n')


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def do_POST(self):
        if self.path != '/__fault':
            self.send_error(404)
            return
        config = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        if config.get('mode') not in ('missing', 'corrupt', 'interrupt', 'clear') or not config.get('path', '').startswith('/objects/sha256/'):
            self.send_error(400)
            return
        with lock:
            faults[config['path']] = config['mode']
        record({'fault': config})
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'ok')

    def do_GET(self):
        start = time.monotonic()
        path = unquote(urlsplit(self.path).path)
        file = (root / path.lstrip('/')).resolve()
        if file.is_dir():
            file = file / 'index.html'
        if not file.is_relative_to(root) or not file.is_file():
            self.send_error(404)
            record({'path': path, 'status': 404, 'bytes': 0})
            return
        mode = faults.get(path)
        if mode == 'missing':
            self.send_error(404)
            record({'path': path, 'status': 404, 'bytes': 0, 'fault': mode})
            return
        data = file.read_bytes()
        if mode == 'corrupt':
            data = bytes([data[0] ^ 1]) + data[1:]
        self.send_response(200)
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Content-Type', mimetypes.guess_type(file.name)[0] or 'application/octet-stream')
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        written = 0
        try:
            payload = data[:max(1, len(data)//2)] if mode == 'interrupt' else data
            self.wfile.write(payload)
            self.wfile.flush()
            written = len(payload)
            if mode == 'interrupt':
                self.close_connection = True
                self.connection.shutdown(socket.SHUT_RDWR)
        except (BrokenPipeError, ConnectionResetError):
            pass
        record({'path': path, 'status': 200, 'bytes': written,
                'expectedBytes': len(data), 'fault': mode, 'ms': (time.monotonic()-start)*1000})


ThreadingHTTPServer(('127.0.0.1', args.port), Handler).serve_forever()
