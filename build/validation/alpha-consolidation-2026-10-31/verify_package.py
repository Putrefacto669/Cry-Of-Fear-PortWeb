from pathlib import Path
import re,json,hashlib
root=Path('/root/cof-audits/alpha-20261031/dist-glock');s=(root/'packs/engine.js').read_text();m=re.search(r'loadPackage\((\{"files":.*?\})\);',s);assert m
meta=json.loads(m[1]);b=(root/'packs/engine.data').read_bytes();out={}
for e in meta['files']:
 name=e['filename'];chunk=b[e['start']:e['end']];out[name]={'bytes':len(chunk),'sha256':hashlib.sha256(chunk).hexdigest()}
p=Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web/build/validation/alpha-consolidation-2026-10-31/packaged-module-hashes.json');p.write_text(json.dumps(out,indent=2))
assert out['/lib/server.wasm']['sha256']=='6d7d62e59aed0311d14028ed110b0dc3b38e4fab188638017271fc6c60d94432'
print(json.dumps(out,indent=2))
