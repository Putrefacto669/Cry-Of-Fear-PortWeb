from pathlib import Path
import hashlib,json,gzip
repo=Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web')
d=repo/'dist';text=(d/'sw-manifest.js').read_text();m=json.loads(text.removeprefix('self.COF_MANIFEST = ').strip().removesuffix(';'))
for name,digest in m['files'].items():
 p=d/name
 assert p.is_file(),name
 assert hashlib.sha256(p.read_bytes()).hexdigest().startswith(digest),name
for name in m['gz']:
 assert gzip.decompress((d/(name+'.gz')).read_bytes())==(d/name).read_bytes(),name
files=[p for p in d.rglob('*') if p.is_file()]
assert all(p.stat().st_size<100*1024*1024 for p in files)
assert sum(p.stat().st_size for p in files)<1024*1024*1024
result={'manifest':m['version'],'checked_files':len(m['files']),'checked_gzip':len(m['gz']),'dist_bytes':sum(p.stat().st_size for p in files),'max_file_bytes':max(p.stat().st_size for p in files),'result':'PASS'}
(repo/'build/validation/flashlight-2026-10-31/publication/dist-check.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result,indent=2))
