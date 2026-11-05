"""Verify exact public transport bytes after the authorized Pages deployment."""
import gzip
import hashlib
import json
from pathlib import Path
import urllib.request

out = Path(__file__).resolve().parent
repo = out.parents[2]
base = 'https://putrefacto669.github.io/Cry-Of-Fear-PortWeb/'
version = json.loads((out/'candidate.json').read_text())['version']
destination = out/'public-assets.json'
assert not destination.exists()
rows = []
for name in ['hud.js', 'sw.js', 'sw-manifest.js', 'sw-manifest.js?release='+version,
             'loader.js', 'index.html', 'packs/engine.js', 'packs/engine.data.gz', 'xash3d.wasm.gz']:
    request = urllib.request.Request(base+name, headers={'Cache-Control':'no-cache', 'Accept-Encoding':'identity'})
    with urllib.request.urlopen(request, timeout=30) as response:
        data = response.read()
        assert response.status == 200
    file = name.split('?')[0]
    assert data == (repo/'dist'/file).read_bytes(), name
    if file.endswith('.gz'):
        assert gzip.decompress(data) == (repo/'dist'/file[:-3]).read_bytes()
    rows.append({'file':name, 'bytes':len(data), 'sha256':hashlib.sha256(data).hexdigest(), 'status':200})
destination.write_text(json.dumps({'version':version, 'responses':rows, 'passed':True}, indent=2))
print('PASS nine public responses, exact bytes and gzip contents:',version)
