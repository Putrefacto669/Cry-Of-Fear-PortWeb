"""Isolated, switchable HTTP fixture. Never serves or modifies the published dist.

python sw_fixture.py /private/fixture/root /private/requests.jsonl [port]
Root contains old/, new/, and optionally fixed/ exact distribution trees.
POST /__control with {version, fault:{path,mode}} switches responses.
"""
import hashlib
import json
import mimetypes
from pathlib import Path
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
import sys
import threading
import time
from urllib.parse import urlsplit, unquote

root, log = Path(sys.argv[1]).resolve(), Path(sys.argv[2])
state = {"version": "old", "fault": {}}
lock = threading.Lock()

def record(**row):
    with lock:
        with log.open("a") as f:
            f.write(json.dumps({"time": time.time(), **row}) + "\n")

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def do_POST(self):
        if self.path != "/__control":
            self.send_error(404)
            return
        data = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        assert data.get("version", state["version"]) in ("old", "new", "fixed", "next")
        state.update(data)
        record(control=data)
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"ok")

    def do_GET(self):
        name = unquote(urlsplit(self.path).path).lstrip("/") or "index.html"
        version = state["version"]
        record(event="request", path=name, version=version)
        if name == "probe.html":
            body = b'<!doctype html><button id="update" hidden>Update</button><script>window.ready=true</script>'
        else:
            path = (root / version / name).resolve()
            if not path.is_relative_to(root / version) or not path.is_file():
                self.send_error(404)
                record(event="response", path=name, status=404, version=version)
                return
            body = path.read_bytes()
        fault = state.get("fault", {})
        if fault.get("path") == name:
            if fault.get("mode") == "fail":
                self.send_error(503)
                record(event="response", path=name, status=503, version=version)
                return
            if fault.get("mode") == "truncate":
                self.send_response(200)
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body[:max(1, len(body)//3)])
                self.close_connection = True
                record(event="truncated", path=name, version=version)
                return
            if fault.get("mode") == "hold":
                while state.get("fault", {}).get("mode") == "hold":
                    time.sleep(.05)
        self.send_response(200)
        self.send_header("Content-Type", mimetypes.guess_type(name)[0] or "application/octet-stream")
        self.send_header("Cache-Control", state.get("cache", "no-store"))
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        try:
            self.wfile.write(body)
            record(event="response", path=name, status=200, version=version, bytes=len(body), sha256=hashlib.sha256(body).hexdigest())
        except (BrokenPipeError, ConnectionResetError):
            record(event="cancelled", path=name, version=version)

ThreadingHTTPServer(("127.0.0.1", int(sys.argv[3]) if len(sys.argv)>3 else 8127), Handler).serve_forever()
