import re,json,hashlib
from pathlib import Path
root=Path('/root/cof-audits')
result={}
for label,dist in [('claude',root/'claude-launcher/dist'),('fixed',root/'flashlight-20261031/dist'),('main',Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web/dist'))]:
 js=(dist/'packs/engine.js').read_text();meta=json.loads(re.search(r'loadPackage\((\{"files":.*?\})\);',js).group(1));data=(dist/'packs/engine.data').read_bytes()
 result[label]={f['filename']:hashlib.sha256(data[f['start']:f['end']]).hexdigest() for f in meta['files']}
build=root/'audit-D3Kl5uly/build'
result['build']={str(p.relative_to(build)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [build/'engine/ref/gl/libref_gles3compat.wasm',build/'game/cl_dll/client_emscripten_wasm32.wasm',build/'game/dlls/hl_emscripten_wasm32.wasm']}
print(json.dumps(result,indent=2))
