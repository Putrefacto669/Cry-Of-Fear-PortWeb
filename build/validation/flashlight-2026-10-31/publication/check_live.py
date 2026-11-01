from pathlib import Path
import hashlib,json,urllib.request,datetime
repo=Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web')
base='https://putrefacto669.github.io/Cry-Of-Fear-PortWeb/'
revision='1c7411168ae7f09e4ce8b2404f9eba160cd619d7'
checks=[]
for name in ['index.html','sw.js','sw-manifest.js','packs/engine.js','packs/engine.data','packs/engine.data.gz']:
 req=urllib.request.Request(base+name+'?verify='+revision,headers={'Cache-Control':'no-cache','Accept-Encoding':'identity'})
 with urllib.request.urlopen(req,timeout=30) as response:
  data=response.read();status=response.status;mime=response.headers.get('Content-Type')
 expected=(repo/'dist'/name).read_bytes()
 assert data==expected,f'Published bytes differ: {name}'
 checks.append({'file':name,'status':status,'mime':mime,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
result={'url':base,'deployed_commit':revision,'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'checks':checks,'result':'PASS'}
(repo/'build/validation/flashlight-2026-10-31/publication/live-assets.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result,indent=2))
