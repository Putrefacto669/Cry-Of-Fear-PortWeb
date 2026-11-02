from pathlib import Path
import hashlib
import json
import re

root = Path(__file__).resolve().parent
repo = root.parents[2]
promotion = json.loads((root / 'promotion.json').read_text())
dist = repo / 'dist'
manifest = json.loads(re.search(r'=\s*(\{.*\});', (dist / 'sw-manifest.js').read_text(), re.S)[1])
assert manifest['version'] == promotion['manifest'] == '2f88e7b98c18'
for name, expected in manifest['files'].items():
    assert hashlib.sha256((dist / name).read_bytes()).hexdigest().startswith(expected), name
assert (repo / 'platform/web/postfx.js').read_bytes() == (dist / 'postfx.js').read_bytes()
assert (repo / 'platform/web/loader.js').read_bytes() == (dist / 'loader.js').read_bytes()
assert (repo / 'platform/web/hud.js').read_bytes() == (dist / 'hud.js').read_bytes()
out = root / 'dist-verified.json'
assert not out.exists()
out.write_text(json.dumps({'manifest': manifest['version'], 'files': len(manifest['files']),
                           'modules': promotion['modules'], 'sourceFrontendMatches': True}, indent=2) + '\n')
print(f'PASS {len(manifest["files"])} manifest hashes and frontend source equality')
