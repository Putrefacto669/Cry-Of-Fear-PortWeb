"""Verify the actual Pages responses against the authorized local distribution."""
from pathlib import Path
import hashlib
import json
import re
import urllib.request

root = Path(__file__).resolve().parent
repo = root.parents[2]
base = 'https://putrefacto669.github.io/Cry-Of-Fear-PortWeb/'
out = root / 'live-assets.json'
assert not out.exists()
rows = []
for name in ('sw-manifest.js', 'postfx.js', 'loader.js', 'index.html', 'sw.js',
             'packs/engine.js', 'packs/engine.data', 'packs/engine.data.gz'):
    request = urllib.request.Request(base + name, headers={'Cache-Control': 'no-cache', 'Accept-Encoding': 'identity'})
    with urllib.request.urlopen(request, timeout=30) as response:
        body = response.read()
        row = {'file': name, 'status': response.status, 'bytes': len(body),
               'sha256': hashlib.sha256(body).hexdigest(), 'url': response.url}
    assert row['sha256'] == hashlib.sha256((repo / 'dist' / name).read_bytes()).hexdigest(), name
    if name == 'sw-manifest.js':
        manifest = json.loads(re.search(r'=\s*(\{.*\});', body.decode(), re.S)[1])
        assert manifest['version'] == '2f88e7b98c18'
    rows.append(row)
out.write_text(json.dumps({'manifest': manifest['version'], 'responses': rows}, indent=2) + '\n')
print('PASS eight Pages resources match dist/ byte for byte')
