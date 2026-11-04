"""Promote the exact isolated SW candidate after explicit publication authorization."""
from pathlib import Path
import gzip
import hashlib
import json
import re
import shutil

out = Path(__file__).resolve().parent
repo = out.parents[2]
source = Path('/root/cof-audits/sw-20261103/fixed')
dest = repo/'dist'
assert not (out/'promotion.json').exists()
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
m = json.loads(re.search(r'=\s*(\{.*\});', (source/'sw-manifest.js').read_text(), re.S)[1])
assert m['version'] == 'd071fd1b614e'
for name, revision in m['files'].items():
    assert sha(source/name).startswith(revision), name
for name in ('sw.js', 'loader.js'):
    assert (source/name).read_bytes() == (repo/'platform/web'/name).read_bytes()
changes = []
for p in source.rglob('*'):
    if not p.is_file():
        continue
    name = p.relative_to(source).as_posix()
    assert (dest/name).is_file(), name
    if sha(p) != sha(dest/name):
        changes.append({'file': name, 'before': sha(dest/name), 'after': sha(p), 'bytes': p.stat().st_size})
assert {c['file'] for c in changes} == {'sw.js', 'loader.js', 'sw-manifest.js'}
for row in changes:
    shutil.copy2(source/row['file'], dest/row['file'])
for p in source.rglob('*'):
    if p.is_file():
        assert sha(p) == sha(dest/p.relative_to(source)), p
for name, revision in m['files'].items():
    assert sha(dest/name).startswith(revision), name
for p in dest.rglob('*.gz'):
    assert gzip.decompress(p.read_bytes()) == p.with_suffix('').read_bytes(), p
assert sha(dest/'packs/engine.data') == 'f6017f6e937f9f6b14f3ca6f8dee1eb523ba3be002977bc0fc242d6a30c7bf84'
(out/'promotion.json').write_text(json.dumps({'manifest': m['version'], 'changes': changes, 'manifestFilesVerified': len(m['files']), 'gzipVerified': True, 'gameBytesUnchanged': True}, indent=2))
print('PASS: exact candidate promoted; only three web distribution files changed')
