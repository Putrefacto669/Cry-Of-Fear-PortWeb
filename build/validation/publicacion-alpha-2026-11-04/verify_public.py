import hashlib,json,urllib.request
from pathlib import Path
repo=Path(__file__).resolve().parents[3]
evidence=repo/'build/validation/publicacion-alpha-2026-11-04'
proof=json.loads((evidence/'dist-proof.json').read_text())
names=sorted(set(proof['changed'])|{'hud.js','xash3d.js','xash3d.wasm','packs/maps.json'})
result={'expectedManifest':proof['manifest'],'files':[]}
for name in names:
    expected=(repo/'dist'/name).read_bytes()
    request=urllib.request.Request('https://putrefacto669.github.io/Cry-Of-Fear-PortWeb/'+name+'?verify='+proof['manifest'],headers={'Cache-Control':'no-cache'})
    with urllib.request.urlopen(request,timeout=30) as response:
        actual=response.read();result['files'].append({'file':name,'status':response.status,'size':len(actual),'sha256':hashlib.sha256(actual).hexdigest(),'matches':actual==expected})
result['passed']=all(row['matches'] for row in result['files'])
output=evidence/'public-assets.json';assert not output.exists();output.write_text(json.dumps(result,indent=2))
assert result['passed'],result
print('PASS public bytes:',len(names),'files, including engine pair, gzip and main WASM')
