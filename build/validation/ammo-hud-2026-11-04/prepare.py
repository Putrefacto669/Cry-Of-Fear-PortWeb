"""Isolated client/UI build; retain the published server and all original resources."""
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

repo=Path(__file__).resolve().parents[3]
private=Path('/root/cof-audits/ammo-hud-20261104')
candidate=private/'candidate'
assert not candidate.exists()
shutil.copytree('/root/cof-audits/hud-publication-20261104/candidate',candidate,copy_function=os.link)
def replace(name,body):
    p=candidate/name
    temporary=p.with_name(p.name+'.temporary')
    temporary.write_bytes(body)
    temporary.replace(p)
for name in ['hud.js','loader.js','launcher.js','sw.js']:
    replace(name,(repo/'platform/web'/name).read_bytes())
replace('index.html',(repo/'platform/web/index.html').read_bytes().replace(b'__SOURCE_URL__',b'https://github.com/Putrefacto669/Cry-Of-Fear-PortWeb'))
metadata=json.loads(re.search(rb'loadPackage\((\{"files":.*?\})\);',(candidate/'packs/engine.js').read_bytes(),re.S)[1])
data=(candidate/'packs/engine.data').read_bytes()
lib=private/'lib';lib.mkdir()
originalModules={}
for row in metadata['files']:
    name=Path(row['filename']).name;body=data[row['start']:row['end']]
    (lib/name).write_bytes(body);originalModules[name]=hashlib.sha256(body).hexdigest()
client=(private/'build/game/cl_dll/client_emscripten_wasm32.wasm').read_bytes()
assert b'COF/AMMOCLIENT' in client
(lib/'client.wasm').write_bytes(client)
# Detach package output links before file_packager writes them.
for name in ['engine.data','engine.js']:(candidate/'packs'/name).unlink()
subprocess.run(['/root/emsdk/upstream/emscripten/tools/file_packager',str(candidate/'packs/engine.data'),
                '--preload',str(lib)+'@/lib','--js-output='+str(candidate/'packs/engine.js'),'--no-node'],check=True)
shell=(repo/'tools/wsl/package.sh').read_text()
code=re.search(r'python3 - "\$DIST" "\$\{COF_SW_COI:-0\}" "\$\{COF_SW_GZ:-1\}" <<\x27EOF\x27\n(.*?)\nEOF',shell,re.S)[1]
(candidate/'sw-manifest.js').unlink()
sys.argv=['package manifest hook',str(candidate),'0','1']
exec(compile(code,'actual package.sh manifest hook','exec'))
new={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in lib.iterdir()}
assert all(new[n]==sha for n,sha in originalModules.items() if n!='client.wasm')
assert new['client.wasm']!=originalModules['client.wasm']
manifest=json.loads(re.search(r'=\s*(\{.*\});',(candidate/'sw-manifest.js').read_text(),re.S)[1])
for name,sha in manifest['files'].items():assert hashlib.sha256((candidate/name).read_bytes()).hexdigest().startswith(sha),name
out=Path(__file__).parent/'candidate.json';assert not out.exists()
out.write_text(json.dumps({'manifest':manifest['version'],'modulesBefore':originalModules,'modulesAfter':new,
                          'serverAndRendererUnchanged':True,'distUntouched':True,'files':len(manifest['files'])},indent=2))
print('PASS isolated client build, original server/renderer/filesystem/menu retained',manifest['version'])
