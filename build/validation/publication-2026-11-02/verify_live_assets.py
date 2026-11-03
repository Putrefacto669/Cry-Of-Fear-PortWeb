"""Verify deployed changed transports and exact decompressed payloads against promoted dist."""
from pathlib import Path
import hashlib,json,re,gzip,urllib.request
root=Path(__file__).resolve().parent;repo=root.parents[2];dist=repo/'dist';base='https://putrefacto669.github.io/Cry-Of-Fear-PortWeb/';out=root/'live-assets.json';assert not out.exists()
promotion=json.loads((root/'promotion.json').read_text());m=json.loads(re.search(r'=\s*(\{.*\});',(dist/'sw-manifest.js').read_text(),re.S)[1]);assert m['version']=='03fd8c160749'
names={'sw.js','sw-manifest.js','packs/engine.data'}
for row in promotion['changes']:
 name=row['file'];names.add(name+'.gz' if name in m.get('gz',{}) else name)
rows=[]
for name in sorted(names):
 req=urllib.request.Request(base+name,headers={'Cache-Control':'no-cache','Accept-Encoding':'identity'})
 with urllib.request.urlopen(req,timeout=60) as response:
  body=response.read();row={'file':name,'status':response.status,'bytes':len(body),'sha256':hashlib.sha256(body).hexdigest(),'url':response.url}
 assert row['sha256']==hashlib.sha256((dist/name).read_bytes()).hexdigest(),name
 if name.endswith('.data.gz'):
  raw=name[:-3];decoded=gzip.decompress(body);assert hashlib.sha256(decoded).hexdigest()==hashlib.sha256((dist/raw).read_bytes()).hexdigest();row['decodedVerified']=True
 if name=='sw-manifest.js':assert json.loads(re.search(r'=\s*(\{.*\});',body.decode(),re.S)[1])['version']==m['version']
 rows.append(row);print('PASS',name,len(body),flush=True)
out.write_text(json.dumps({'manifest':m['version'],'responses':rows},indent=2));print('PASS actual Pages responses and decompressed changed packs')