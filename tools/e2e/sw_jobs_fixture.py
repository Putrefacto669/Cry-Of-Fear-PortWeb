"""Serve exact historical trees under /game/ and a genuinely minimal same-origin client.

No publication files are changed. Unlike navigation through the historical worker,
the observer lives outside its scope and cannot overwrite its index cache entry.
"""
import hashlib
import json
import mimetypes
from pathlib import Path
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
import sys
import threading
import time
from urllib.parse import unquote, urlsplit

root, log = Path(sys.argv[1]).resolve(), Path(sys.argv[2])
state = {"version": "old"}
lock = threading.Lock()

def record(**row):
    with lock:
        with log.open('a') as f:
            f.write(json.dumps({'time': time.time(), **row})+'\n')

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def do_POST(self):
        if self.path != '/__control':
            self.send_error(404)
            return
        data=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        assert data['version'] in ('old','new')
        state.update(data)
        record(control=data)
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'ok')

    def do_GET(self):
        url=urlsplit(self.path)
        path=unquote(url.path)
        version=state['version']
        record(event='request',url=self.path,version=version)
        if path=='/observer.html':
            body=b'<!doctype html><meta charset="utf-8"><title>SW observer</title><p>Minimal client; no game.</p><script>window.swObserver=true;</script>'
            content_type='text/html'
        elif path.startswith('/game/'):
            name=path[len('/game/'):] or 'index.html'
            file=(root/version/name).resolve()
            if not file.is_relative_to(root/version) or not file.is_file():
                self.send_error(404)
                return
            body=file.read_bytes()
            content_type=mimetypes.guess_type(name)[0] or 'application/octet-stream'
        else:
            self.send_error(404)
            return
        self.send_response(200)
        self.send_header('Content-Type',content_type)
        self.send_header('Content-Length',str(len(body)))
        self.send_header('Cache-Control','no-store')
        self.end_headers()
        try:
            self.wfile.write(body)
            record(event='response',url=self.path,version=version,bytes=len(body),sha256=hashlib.sha256(body).hexdigest())
        except (BrokenPipeError,ConnectionResetError):
            record(event='cancelled',url=self.path,version=version)

ThreadingHTTPServer(('127.0.0.1',int(sys.argv[3])),Handler).serve_forever()
