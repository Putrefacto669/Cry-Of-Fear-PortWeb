"""Explicitly authorized 2026-11-07: verify release then copy to the Windows dist directory."""
import gzip,hashlib,json,re,shutil
from pathlib import Path
repo=Path(__file__).resolve().parents[3]
candidate=Path('/root/cof-audits/visual-clothes-20261107/candidate-release')
manifest=json.loads(re.search(r'=\s*(\{[\s\S]*\});',(candidate/'sw-manifest.js').read_text())[1])
assert manifest['version']=='a9ef5b6f7e9c'
for name,revision in manifest['files'].items():
 data=(candidate/name).read_bytes();assert hashlib.sha256(data).hexdigest()[:12]==revision,name
 if name in manifest['gz']:assert gzip.decompress((candidate/(name+'.gz')).read_bytes())==data,name
assert manifest['version'].encode() in (candidate/'sw.js').read_bytes()
assert not any(p.stat().st_size>=100*1024**2 for p in candidate.rglob('*') if p.is_file())
target=repo/'dist';assert target.is_dir() and target.resolve().parent==repo.resolve()
for p in candidate.rglob('*'):
 if p.is_file():
  dest=target/p.relative_to(candidate);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dest)
for p in candidate.rglob('*'):
 if p.is_file():assert hashlib.sha256(p.read_bytes()).digest()==hashlib.sha256((target/p.relative_to(candidate)).read_bytes()).digest()
proof={'manifest':manifest['version'],'verifiedResources':len(manifest['files']),'verifiedGzip':len(manifest['gz']),'destination':str(target),'allCopiedBytesMatch':True}
(Path(__file__).parent/'dist-publication.json').write_text(json.dumps(proof,indent=2));print(json.dumps(proof))
