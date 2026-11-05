"""Refresh only the HUD using the real package manifest hook, in a new private tree."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import sys

repo = Path(__file__).resolve().parents[3]
out = Path(__file__).resolve().parent
private = Path('/root/cof-audits/hud-publication-20261104')
private.mkdir(exist_ok=False)
source = Path('/root/cof-audits/sw-pin-20261103/fixed')
candidate = private/'candidate'
shutil.copytree(source, candidate, copy_function=os.link)
def replace(name, data):
    temporary = candidate/(name+'.temporary')
    temporary.write_bytes(data)
    temporary.replace(candidate/name)
replace('hud.js', (repo/'platform/web/hud.js').read_bytes())
replace('sw.js', (repo/'platform/web/sw.js').read_bytes())
(private/'baseline-hud.js').write_bytes((repo/'dist/hud.js').read_bytes())
shell = (repo/'tools/wsl/package.sh').read_text()
code = re.search(r'python3 - "\$DIST" "\$\{COF_SW_COI:-0\}" "\$\{COF_SW_GZ:-1\}" <<\x27EOF\x27\n(.*?)\nEOF', shell, re.S)[1]
# Detach manifest before the package hook writes it; other old gzip links are unlinked by the hook.
(candidate/'sw-manifest.js').unlink()
sys.argv = ['package manifest hook', str(candidate), '0', '1']
exec(compile(code, 'actual package.sh manifest hook', 'exec'))
digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
changed = []
for p in sorted(candidate.rglob('*')):
    if p.is_file():
        name = p.relative_to(candidate).as_posix()
        if digest(p) != digest(repo/'dist'/name):
            changed.append(name)
assert changed == ['hud.js', 'sw-manifest.js', 'sw.js'], changed
manifest = json.loads(re.search(r'=\s*(\{.*\});', (candidate/'sw-manifest.js').read_text(), re.S)[1])
assert manifest['version'] != 'd071fd1b614e'
for name, revision in manifest['files'].items():
    assert digest(candidate/name).startswith(revision), name
for name in manifest['gz']:
    assert gzip.decompress((candidate/(name+'.gz')).read_bytes()) == (candidate/name).read_bytes(), name
assert ('sw-manifest.js?release='+manifest['version']).encode() in (candidate/'sw.js').read_bytes()
proof = {'version':manifest['version'], 'changedDistributionFiles':changed,
         'filesVerified':len(manifest['files']), 'gzipVerified':len(manifest['gz']),
         'actualPackageHook':True, 'cppRecompiled':False,
         'hashes':{name:digest(candidate/name) for name in changed}}
(out/'candidate.json').write_text(json.dumps(proof, indent=2))
print(json.dumps(proof, indent=2))
