from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parent;repo=root.parents[2];idx={}
for line in (root/'staged-dist.txt').read_text(encoding='utf-8-sig').splitlines():
 meta,name=line.split('\t',1);mode,oid,stage=meta.split();assert stage=='0';idx[name]=oid
plan=json.loads((root/'plan.json').read_text());rows=[]
for row in plan['changes']:
 name='dist/'+row['file'];p=repo/name;h=hashlib.sha1(('blob '+str(p.stat().st_size)+'\0').encode())
 with p.open('rb') as f:
  while b:=f.read(1024*1024):h.update(b)
 assert h.hexdigest()==idx[name],name
 rows.append({'file':name,'gitBlob':idx[name]})
out=root/'git-bytes-verified.json';assert not out.exists();out.write_text(json.dumps({'files':rows,'exactBytes':True},indent=2));print('PASS staged Git blobs preserve exact build bytes',len(rows))