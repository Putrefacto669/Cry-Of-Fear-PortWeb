"""Verify public deployment evidence without hiding historical failures."""
from pathlib import Path
import hashlib
import json
import re

out=Path(__file__).resolve().parent
repo=out.parents[2]
read=lambda path:json.loads((out/path).read_text(encoding='utf-8-sig'))
job=read('pages-pinned-deployment.json')
assert job['conclusion']=='success' and job['headSha']=='bd883c172b386f2c92ff88224aa7f17a12e5f171'
assets=read('public-pinned-assets.json')
assert assets['manifest']=='d071fd1b614e' and len(assets['responses'])==7
for row in assets['responses']:
    assert row['sha256']==hashlib.sha256((repo/'dist'/row['file'].split('?')[0]).read_bytes()).hexdigest()
worker=(repo/'dist/sw.js').read_bytes()
assert hashlib.sha256(worker).hexdigest()=='9712ce939c7b33c6087454ff345eeadb1f1490101ac25598fc022eec575e6e47'
assert (repo/'platform/web/sw.js').read_bytes().replace(b'__COF_SW_VERSION__',b'd071fd1b614e')==worker
summary={'deployment':job['url'],'buildCommit':job['headSha'],'manifest':'d071fd1b614e','workerSHA256':hashlib.sha256(worker).hexdigest(),'publicSuites':{}}
for name in ('phone_singleplayer_punch','dual_hands','extras_persistence'):
    result=read('pinned-live-regressions/'+name+'/result.json')
    assert result['passed'] and not result['errors']
    assert result['deployment']['manifest']=='d071fd1b614e'
    assert result['deployment']['controller']=='https://putrefacto669.github.io/Cry-Of-Fear-PortWeb/sw.js'
    summary['publicSuites'][name]={'passed':True,'errors':[]}
for path in ('upgrade-pinned-live/result.json','pin-validation/legacy-game-retry/result.json'):
    result=read(path)
    assert result['passed'] and not result['errors'] and result['version']=='d071fd1b614e'
    assert result['before']==result['waiting']==result['after']
    summary[path]={'passed':True,'modules':result['after']}
for path in ('upgrade-live/result.json','pin-validation/legacy-game/result.json'):
    assert read(path)['passed'] is False
summary['failedAttemptsRetained']=['upgrade-live','pin-validation/legacy-game']
for path in ('pin-validation/http-cache/result.json','pin-validation/http-cache-03/result.json'):
    result=read(path)
    assert result['passed'] and all(c['waitingManifest']=='d071fd1b614e' for c in result['cases'])
summary['legacyCacheManifestFixed']=True
summary['originalIntermittentUpdatePromiseResolved']=False
(out/'final-summary.json').write_text(json.dumps(summary,indent=2))
print('PASS final public suites, deployment, byte identity, real updates; unresolved original timeout retained')
