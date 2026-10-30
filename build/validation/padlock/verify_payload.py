from pathlib import Path
import json,re,hashlib
w=Path('/root/cof-audits/audit-D3Kl5uly')
m=json.loads(re.search(r'loadPackage\((\{"files".*?\})\);',(w/'dist/packs/engine.js').read_text(),re.S).group(1))
p=(w/'dist/packs/engine.data').read_bytes()
for f in m['files']:
 raw=p[f['start']:f['end']];local=w/f['filename'].lstrip('/')
 assert raw==local.read_bytes(),f['filename']
 if f['filename'].endswith('server.wasm'):assert raw==(w/'build/game/dlls/hl_emscripten_wasm32.wasm').read_bytes()
 if f['filename'].endswith('client.wasm'):assert raw==(w/'build/game/cl_dll/client_emscripten_wasm32.wasm').read_bytes()
 print(f['filename'],len(raw),hashlib.sha256(raw).hexdigest(),'payload=library=build' if 'server.wasm' in f['filename'] or 'client.wasm' in f['filename'] else 'payload=library')
assert b'COF/PADLOCK' in (w/'lib/server.wasm').read_bytes()
print('Server contains padlock diagnostics; native browser entity tests execute this payload.')