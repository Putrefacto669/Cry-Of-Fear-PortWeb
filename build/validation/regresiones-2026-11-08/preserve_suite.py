"""Import a completed concurrent suite, preserving its original provenance and contracts."""
import hashlib,json,shutil
from pathlib import Path
repo=Path(__file__).resolve().parents[3];out=Path(__file__).parent
source=Path('/root/cof-audits/claude-launcher/regressions-153416');target=out/'suite-18'
rows=json.loads((source/'summary.json').read_text());assert len(rows)==18 and all(r['exitCode']==0 for r in rows)
scripts=Path('/root/cof-audits/browser-1.64.1/e2e/claude');proof={}
for row in rows:
 name=row['suite'];script=(scripts/(name+'-regression.mjs')).read_text();body=script.split('\n',1)[1]
 expected=(repo/'tools/e2e'/(name+'.mjs')).read_text();assert body==expected,name
 proof[name]={'exitCode':0,'originalContractSHA256':hashlib.sha256(expected.encode()).hexdigest(),'originalLogSHA256':hashlib.sha256((source/(name+'.log')).read_bytes()).hexdigest()}
assert not target.exists();shutil.copytree(source,target)
(out/'suite-provenance.json').write_text(json.dumps({'originalRun':str(source),'originalBase':'http://127.0.0.1:8091/','expectedManifest':'61bebcaccb10','runner':'regressions_claude.py','launchShim':'fixed Chromium 156 and mute-audio only','all18ContractsUnchanged':True,'suites':proof},indent=2))
print('PASS 18/18 original contracts, source equality and preserved logs')
