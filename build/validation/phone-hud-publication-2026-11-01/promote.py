"""Promote the authorized, already validated build without deleting existing files."""
from pathlib import Path
import gzip
import hashlib
import json
import re
import shutil

repo = Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web')
source = Path('/root/cof-audits/phone-hud-20261101/dist-controls').resolve()
destination = (repo / 'dist').resolve()
out = Path(__file__).resolve().parent / 'promotion.json'
assert not out.exists()
assert destination.parent == repo.resolve() and destination.name == 'dist'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
manifest = json.loads(re.search(r'=\s*(\{.*\});', (source / 'sw-manifest.js').read_text(), re.S)[1])
assert manifest['version'] == '2f88e7b98c18'
metadata = json.loads(re.search(r'loadPackage\((\{"files":.*?\})\);', (source / 'packs/engine.js').read_text())[1])
data = (source / 'packs/engine.data').read_bytes()
modules = {e['filename']: hashlib.sha256(data[e['start']:e['end']]).hexdigest() for e in metadata['files']}
assert modules['/lib/server.wasm'] == '07e7ef5cb6df07708b5c3c15abb7fd18e6a3bcb17d60efb5ad0e6605c2d37ee1'
changes, files = [], []
for path in sorted(source.rglob('*')):
    if not path.is_file():
        continue
    relative = path.relative_to(source)
    target = (destination / relative).resolve()
    assert target.is_relative_to(destination)
    before = sha(target) if target.exists() else None
    after = sha(path)
    row = {'file': relative.as_posix(), 'before': before, 'after': after, 'bytes': path.stat().st_size}
    files.append(row)
    if before != after:
        # Original map/boot resources must remain byte-identical to the existing distribution.
        assert not (relative.name.endswith(('.data', '.data.gz')) and relative.name != 'engine.data' and relative.name != 'engine.data.gz'), relative
        changes.append(row)
for row in changes:
    relative = Path(row['file'])
    target = destination / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source / relative, target)
for row in files:
    assert sha(destination / row['file']) == row['after'], row['file']
for path in destination.rglob('*.gz'):
    raw = path.with_suffix('')
    assert raw.is_file() and gzip.decompress(path.read_bytes()) == raw.read_bytes(), path
out.write_text(json.dumps({'manifest': manifest['version'], 'modules': modules, 'changes': changes,
                           'filesVerified': len(files), 'source': str(source), 'destination': str(destination)}, indent=2) + '\n')
print(f'PASS promoted {len(changes)} changed files, verified {len(files)} files and all gzip pairs')
