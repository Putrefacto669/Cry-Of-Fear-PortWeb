"""Compare actual Pages transport bytes with the exact promoted distribution."""
from pathlib import Path
import gzip
import hashlib
import json
import re
import urllib.request
import sys

out = Path(__file__).resolve().parent
dist = out.parents[2]/'dist'
base = 'https://putrefacto669.github.io/Cry-Of-Fear-PortWeb/'
label = sys.argv[1] if len(sys.argv)>1 else 'public-assets'
assert not (out/(label+'.json')).exists()
rows = []
for name in ('loader.js', 'sw.js', 'sw-manifest.js', 'sw-manifest.js?release=d071fd1b614e', 'packs/engine.js', 'packs/engine.data.gz', 'xash3d.wasm.gz'):
    request = urllib.request.Request(base+name, headers={'Cache-Control': 'no-cache', 'Accept-Encoding': 'identity'})
    with urllib.request.urlopen(request, timeout=30) as response:
        body = response.read()
        assert response.status == 200
    digest = hashlib.sha256(body).hexdigest()
    assert digest == hashlib.sha256((dist/name.split('?')[0]).read_bytes()).hexdigest(), name
    if name.endswith('.gz'):
        assert gzip.decompress(body) == (dist/name[:-3]).read_bytes(), name
    rows.append({'file': name, 'bytes': len(body), 'sha256': digest, 'status': 200})
    print('PASS public byte identity:', name, flush=True)
m = json.loads(re.search(r'=\s*(\{.*\});', (dist/'sw-manifest.js').read_text(), re.S)[1])
assert m['version'] == 'd071fd1b614e'
(out/(label+'.json')).write_text(json.dumps({'manifest': m['version'], 'responses': rows}, indent=2))
