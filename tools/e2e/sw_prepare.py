"""Prepare a private candidate from exact Git-extracted releases; no dist writes."""
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import sys

root, repo, evidence = map(Path, sys.argv[1:])
summary = {}
for name, expected in (("old", "2f88e7b98c18"), ("new", "03fd8c160749")):
    tree = root/name
    m = json.loads(re.search(r'=\s*(\{.*\});', (tree/'sw-manifest.js').read_text(), re.S)[1])
    assert m['version'] == expected
    for path, revision in m['files'].items():
        assert hashlib.sha256((tree/path).read_bytes()).hexdigest().startswith(revision), path
    summary[name] = {'version': expected, 'verifiedFiles': len(m['files']), 'engine': hashlib.sha256((tree/'packs/engine.data').read_bytes()).hexdigest()}
fixed = root/'fixed'
if not fixed.exists():
    shutil.copytree(root/'new', fixed, copy_function=os.link)
# Replace files atomically: the untouched historical trees share read-only hardlinks.
for path in ('loader.js', 'sw.js'):
    tmp = fixed/(path+'.candidate')
    tmp.write_bytes((repo/'platform/web'/path).read_bytes())
    tmp.replace(fixed/path)
m = json.loads(re.search(r'=\s*(\{.*\});', (fixed/'sw-manifest.js').read_text(), re.S)[1])
m['files']['loader.js'] = hashlib.sha256((fixed/'loader.js').read_bytes()).hexdigest()[:12]
m['version'] = hashlib.sha256(json.dumps(m['files'], sort_keys=True).encode()).hexdigest()[:12]
tmp = fixed/'manifest.candidate'
tmp.write_text('self.COF_MANIFEST = '+json.dumps(m, indent=1)+';\n')
tmp.replace(fixed/'sw-manifest.js')
summary['fixed'] = {'version': m['version'], 'base': '03fd8c160749', 'changed': ['loader.js', 'sw.js']}
# Synthetic next release only for lifecycle tests: identical game bytes, one debug
# script comment. Historical old/new above remain exact and independently verified.
next_tree = root/'next'
if not next_tree.exists():
    shutil.copytree(fixed, next_tree, copy_function=os.link)
for path in ('loader.js', 'sw.js'):
    tmp = next_tree/(path+'.candidate')
    tmp.write_bytes((fixed/path).read_bytes())
    tmp.replace(next_tree/path)
tmp = next_tree/'debug.candidate'
tmp.write_bytes((fixed/'debug.js').read_bytes()+b'\n// Isolated next-release lifecycle fixture.\n')
tmp.replace(next_tree/'debug.js')
m['files']['debug.js'] = hashlib.sha256((next_tree/'debug.js').read_bytes()).hexdigest()[:12]
m['version'] = hashlib.sha256(json.dumps(m['files'], sort_keys=True).encode()).hexdigest()[:12]
tmp = next_tree/'manifest.candidate'
tmp.write_text('self.COF_MANIFEST = '+json.dumps(m, indent=1)+';\n')
tmp.replace(next_tree/'sw-manifest.js')
summary['next'] = {'version': m['version'], 'synthetic': True, 'changed': ['debug.js comment only']}
for tree in (fixed, next_tree):
    manifest = json.loads(re.search(r'=\s*(\{.*\});', (tree/'sw-manifest.js').read_text(), re.S)[1])
    for path, revision in manifest['files'].items():
        assert hashlib.sha256((tree/path).read_bytes()).hexdigest().startswith(revision), (tree, path)
(evidence/'fixture.json').write_text(json.dumps(summary, indent=2))
print(json.dumps(summary, indent=2))
